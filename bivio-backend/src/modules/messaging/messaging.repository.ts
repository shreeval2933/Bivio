import { prisma } from '../../shared/prisma';

export const messagingRepository = {
  // ── Notifications ─────────────────────────────────────────────────────
  findNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 100,
    });
  },

  markNotificationRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  },

  markAllNotificationsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },

  deleteNotifications(userId: string, ids: string[]) {
    // Scoped to userId so a user can never delete someone else's notification
    // by guessing an id — ownership is enforced in the query itself, not
    // just checked beforehand.
    return prisma.notification.deleteMany({ where: { id: { in: ids }, userId } });
  },

  // ── Chat rooms ────────────────────────────────────────────────────────
  findRoomsForUser(userId: string) {
    return prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: true } },
        contract: { include: { job: true } },
        application: { include: { job: true } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findRoomById(id: string) {
    return prisma.chatRoom.findUnique({
      where: { id },
      include: { participants: { include: { user: true } } },
    });
  },

  isParticipant(roomId: string, userId: string) {
    return prisma.chatParticipant
      .findUnique({ where: { roomId_userId: { roomId, userId } } })
      .then((p) => !!p);
  },

  getParticipant(roomId: string, userId: string) {
    return prisma.chatParticipant.findUnique({ where: { roomId_userId: { roomId, userId } } });
  },

  /** Unread count = messages sent after this user's lastReadAt, excluding
   * their own messages and system messages don't count against anyone. */
  async getUnreadCount(roomId: string, userId: string, lastReadAt: Date | null) {
    return prisma.message.count({
      where: {
        roomId,
        senderId: { not: userId },
        sentAt: lastReadAt ? { gt: lastReadAt } : undefined,
      },
    });
  },

  // ── Messages ──────────────────────────────────────────────────────────
  async findMessages(roomId: string, cursor?: string, limit = 50) {
    return prisma.message.findMany({
      where: { roomId, deletedAt: null },
      include: { sender: true },
      orderBy: { sentAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },

  async createMessage(roomId: string, senderId: string, body: string, attachmentUrls: string[]) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: { roomId, senderId, body, isSystem: false },
        include: { sender: true },
      });
      for (const url of attachmentUrls) {
        await tx.attachment.create({
          data: {
            ownerType: 'MESSAGE', ownerId: message.id, uploadedById: senderId,
            fileUrl: url, fileName: url.split('/').pop() ?? 'attachment',
            mimeType: 'application/octet-stream', sizeBytes: 0,
          },
        });
      }
      return message;
    });
  },

  /** System messages have no sender (per the CHECK constraint on messages) —
   * used for contract lifecycle events like "Escrow funded: ₹1,50,000 held". */
  createSystemMessage(roomId: string, body: string) {
    return prisma.message.create({ data: { roomId, senderId: null, body, isSystem: true } });
  },

  markRoomRead(roomId: string, userId: string) {
    return prisma.chatParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });
  },
};
