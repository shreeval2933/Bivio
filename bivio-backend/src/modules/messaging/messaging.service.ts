import { prisma } from '../../shared/prisma';
import { messagingRepository } from './messaging.repository';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { events } from '../../shared/events';
import type { SendMessageInput, MessageHistoryQuery } from './messaging.schema';

export const messagingService = {
  // ── Notifications ─────────────────────────────────────────────────────
  listNotifications(userId: string) {
    return messagingRepository.findNotifications(userId);
  },

  markRead(id: string) {
    return messagingRepository.markNotificationRead(id);
  },

  markAllRead(userId: string) {
    return messagingRepository.markAllNotificationsRead(userId);
  },

  deleteNotifications(userId: string, ids: string[]) {
    return messagingRepository.deleteNotifications(userId, ids);
  },

  // ── Chat rooms ────────────────────────────────────────────────────────
  async listRooms(userId: string) {
    const rooms = await messagingRepository.findRoomsForUser(userId);
    return Promise.all(
      rooms.map(async (room) => {
        const me = room.participants.find((p) => p.userId === userId);
        const unreadCount = await messagingRepository.getUnreadCount(room.id, userId, me?.lastReadAt ?? null);
        return {
          ...room,
          contextLabel: room.contextLabel ?? room.contract?.job?.title ?? room.application?.job?.title ?? null,
          lastMessage: room.messages[0] ?? null,
          unreadCount,
          messages: undefined,
        };
      }),
    );
  },

  /** Party membership is the whole access model here — no separate role
   * check needed, since a chat room's participant list already encodes
   * exactly who's allowed in. 404 for non-members, not 403, so a stray room
   * id never confirms a room's existence to someone who isn't in it. */
  async assertMember(roomId: string, userId: string) {
    const isMember = await messagingRepository.isParticipant(roomId, userId);
    if (!isMember) throw new NotFoundError('Chat room');
  },

  async getMessages(userId: string, roomId: string, query: MessageHistoryQuery) {
    await this.assertMember(roomId, userId);
    return messagingRepository.findMessages(roomId, query.cursor, query.limit);
  },

  /**
   * The single source of truth for sending a message — called both from the
   * REST fallback endpoint and from the Socket.IO handler in server.ts, so
   * membership/lock checks and persistence never diverge between the two
   * paths. Emits MessageSent so server.ts can broadcast over the socket
   * without this module needing to know Socket.IO exists.
   */
  async sendMessage(userId: string, roomId: string, input: SendMessageInput) {
    const chatSetting = await prisma.platformSetting.findUnique({ where: { key: 'FEATURE_CHAT' } });
    if (chatSetting && chatSetting.value === 'false') {
      throw new ForbiddenError('Direct messaging is temporarily disabled by platform administration');
    }

    const room = await messagingRepository.findRoomById(roomId);
    if (!room) throw new NotFoundError('Chat room');

    const isMember = room.participants.some((p) => p.userId === userId);
    if (!isMember) throw new ForbiddenError();
    if (room.isLocked) throw new ConflictError('This conversation is locked and cannot receive new messages');

    const message = await messagingRepository.createMessage(roomId, userId, input.body, input.attachmentUrls);
    events.emit('MessageSent', { roomId, message });
    return message;
  },

  async markRoomRead(userId: string, roomId: string) {
    await this.assertMember(roomId, userId);
    return messagingRepository.markRoomRead(roomId, userId);
  },
};
