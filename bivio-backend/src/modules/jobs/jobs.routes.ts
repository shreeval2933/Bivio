import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { jobsController } from './jobs.controller';
import {
  createJobSchema, setHiringStagesSchema, setWeightageSchema,
  updateJobBasicsSchema, updateJobRequirementsSchema, updateJobCompensationSchema,
  updateJobBenefitsSchema, extendDeadlineSchema, jobListQuerySchema,
} from './jobs.schema';

const router = Router();

// ── Public / candidate-facing discovery ──────────────────────────────────
router.get('/jobs', optionalAuthenticate, validate(jobListQuerySchema, 'query'), jobsController.listPublic);
router.get('/jobs/:id', optionalAuthenticate, jobsController.getById);

// ── Recruiter-side management ────────────────────────────────────────────
const recruiterAuth = [authenticate, authorize('RECRUITER')];

router.get('/recruiter/jobs', recruiterAuth, jobsController.listForRecruiter);

router.post('/jobs/upload-file', recruiterAuth, (req: any, res: any, next: any) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!fileName || !base64Data) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'fileName and base64Data are required' });
    }
    const fs = require('node:fs');
    const path = require('node:path');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `http://localhost:4000/uploads/${safeFileName}`;
    res.json({ fileUrl });
  } catch (err) {
    next(err);
  }
});

// Step 1 — create in DRAFT. OQ-1: no payment step here; publish() checks the
// one-time postingFeePaid flag instead of gating job creation itself.
router.post('/jobs', recruiterAuth, validate(createJobSchema), jobsController.create);

// Section-level edits (job detail page pattern — each section saves independently)
router.patch('/jobs/:id/basics', recruiterAuth, validate(updateJobBasicsSchema), jobsController.updateSection);
router.patch('/jobs/:id/requirements', recruiterAuth, validate(updateJobRequirementsSchema), jobsController.updateSection);
router.patch('/jobs/:id/compensation', recruiterAuth, validate(updateJobCompensationSchema), jobsController.updateSection);
router.patch('/jobs/:id/benefits', recruiterAuth, validate(updateJobBenefitsSchema), jobsController.updateSection);
router.patch('/jobs/:id/deadline', recruiterAuth, validate(extendDeadlineSchema), jobsController.extendDeadline);

// Step 3 — hiring stages (full-time only, locked once any application exists)
router.post('/jobs/:id/stages', recruiterAuth, validate(setHiringStagesSchema), jobsController.setStages);

// Step 4 — AI weightage (both job types, one schema)
router.put('/jobs/:id/weightage', recruiterAuth, validate(setWeightageSchema), jobsController.setWeightage);

// Step 5 — publish (validates stages/weightage complete, checks one-time fee)
router.post('/jobs/:id/publish', recruiterAuth, jobsController.publish);

router.post('/jobs/:id/close', recruiterAuth, jobsController.close);
router.post('/jobs/:id/reopen', recruiterAuth, jobsController.reopen);
router.post('/jobs/:id/cancel', recruiterAuth, jobsController.cancel);
router.post('/jobs/:id/duplicate', recruiterAuth, jobsController.duplicate);

export const jobsRoutes = router;
