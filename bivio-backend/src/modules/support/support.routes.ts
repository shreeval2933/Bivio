import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { supportService } from './support.service';

export const supportRoutes = Router();
export const adminSupportRoutes = Router();

// ── User Endpoints (Candidates & Recruiters) ───────────────────────────────
supportRoutes.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const { issueType, description, subject } = req.body;
    const ticket = await supportService.submitTicket(userId, { issueType, description, subject });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

supportRoutes.get('/tickets/my', authenticate, async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const tickets = await supportService.getMyTickets(userId);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// ── Admin Endpoints ────────────────────────────────────────────────────────
adminSupportRoutes.use(authenticate, authorize('ADMIN'));

adminSupportRoutes.get('/tickets', async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const tickets = await supportService.listAdminTickets(status);
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

adminSupportRoutes.get('/tickets/:id', async (req, res, next) => {
  try {
    const ticket = await supportService.getTicketById(req.params.id);
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

adminSupportRoutes.post('/tickets/:id/reply', async (req, res, next) => {
  try {
    const adminUserId = (req as any).user.id;
    const { reply, status } = req.body;
    const ticket = await supportService.replyTicket(adminUserId, req.params.id, { reply, status });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});
