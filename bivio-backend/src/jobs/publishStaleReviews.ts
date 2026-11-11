import { prisma } from '../shared/prisma';

/**
 * Reviews publish the instant both parties submit (handled synchronously in
 * freelance.service.ts's submitReview). This job covers the other case: only
 * one party ever reviews, so their review needs to publish anyway once
 * REVIEW_PUBLISH_DAYS has passed — otherwise a reviewer who never gets a
 * reciprocal review would stay hidden forever.
 *
 * Run this on a real schedule in production (cron, a managed scheduler, or a
 * recurring queue job) — server.ts wires it to a plain setInterval for local
 * dev/demo purposes only, which is NOT a substitute for a real scheduler in
 * production (it stops the moment the process restarts and drifts under
 * load); swap that wiring for a proper scheduled task without changing this
 * function at all.
 */
export async function publishStaleReviews(): Promise<{ contractsChecked: number; reviewsPublished: number }> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: 'REVIEW_PUBLISH_DAYS' } });
  const days = Number(setting?.value ?? '14');
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const staleUnpublished = await prisma.review.findMany({
    where: { isPublished: false, createdAt: { lt: cutoff } },
    select: { contractId: true },
    distinct: ['contractId'],
  });

  let reviewsPublished = 0;
  for (const { contractId } of staleUnpublished) {
    const result = await prisma.review.updateMany({
      where: { contractId, isPublished: false },
      data: { isPublished: true },
    });
    reviewsPublished += result.count;
  }

  return { contractsChecked: staleUnpublished.length, reviewsPublished };
}
