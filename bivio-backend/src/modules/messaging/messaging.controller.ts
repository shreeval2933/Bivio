import { Response, NextFunction } from 'express';
import { messagingService } from './messaging.service';
import { AuthenticatedRequest } from '../../middleware/authenticate';

export const messagingController = {
  async listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await messagingService.listNotifications(req.user!.id));
    } catch (err) { next(err); }
  },

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const n = await messagingService.markRead(req.params.id);
      res.json({ ok: true, id: n.id });
    } catch (err) { next(err); }
  },

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await messagingService.markAllRead(req.user!.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },

  async deleteNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await messagingService.deleteNotifications(req.user!.id, req.body.ids);
      res.json({ ok: true, count: result.count });
    } catch (err) { next(err); }
  },

  async listRooms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.json(await messagingService.listRooms(req.user!.id));
    } catch (err) { next(err); }
  },

  async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = await messagingService.getMessages(req.user!.id, req.params.id, req.query as never);
      res.json(messages);
    } catch (err) { next(err); }
  },

  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await messagingService.sendMessage(req.user!.id, req.params.id, req.body));
    } catch (err) { next(err); }
  },

  async markRoomRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await messagingService.markRoomRead(req.user!.id, req.params.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  },
};
