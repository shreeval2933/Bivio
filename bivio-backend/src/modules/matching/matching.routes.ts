import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { notImplemented } from '../../shared/notImplemented';
import { prisma } from '../../shared/prisma';

const router = Router();

/**
 * Reads precomputed match_scores — this endpoint never computes a score at
 * request time (see BIVIO_DEV_SPEC.md's matching-module design). The AI
 * scoring itself (the worker that WRITES match_scores) is being built
 * separately per your instruction — this route only needs to exist and read
 * whatever the worker has already produced.
 */
router.get('/jobs/:id/candidates', authenticate, authorize('RECRUITER'), async (req, res, next) => {
  try {
    const scores = await prisma.matchScore.findMany({
      where: { jobId: req.params.id, isCurrent: true },
      include: {
        candidate: {
          include: { user: true, skills: { include: { skill: true } }, portfolio: true },
        },
      },
      orderBy: { score: 'desc' },
    });
    res.json(scores);
  } catch (err) { next(err); }
});

// On-demand fallback / recompute trigger — actual scoring logic lives in the
// separate AI service; this just enqueues the job.
router.post(
  '/match-scores/compute',
  authenticate,
  notImplemented('Enqueue on-demand match score computation'),
);

export const matchingRoutes = router;
