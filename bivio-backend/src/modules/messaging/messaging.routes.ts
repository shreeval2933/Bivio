import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { messagingController } from './messaging.controller';
import { sendMessageSchema, messageHistoryQuerySchema, bulkDeleteNotificationsSchema } from './messaging.schema';

const router = Router();
router.use(['/notifications', '/chat'], authenticate);

// ── Notifications ─────────────────────────────────────────────────────────
router.get('/notifications', messagingController.listNotifications);
router.patch('/notifications/:id/read', messagingController.markRead);
router.patch('/notifications/read-all', messagingController.markAllRead);
router.post('/notifications/delete', validate(bulkDeleteNotificationsSchema), messagingController.deleteNotifications);

// ── Chat — rooms are contract/interview scoped, never open-ended DMs ─────
router.get('/chat/rooms', messagingController.listRooms);
router.get('/chat/rooms/:id/messages', validate(messageHistoryQuerySchema, 'query'), messagingController.getMessages);
router.post('/chat/rooms/:id/messages', validate(sendMessageSchema), messagingController.sendMessage);
router.patch('/chat/rooms/:id/read', messagingController.markRoomRead);

export const messagingRoutes = router;
