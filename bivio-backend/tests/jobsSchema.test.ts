import { describe, it, expect } from 'vitest';
import { createJobSchema, setWeightageSchema } from '../src/modules/jobs/jobs.schema';

const validSkillId = '11111111-1111-4111-8111-111111111111';

const baseFullTime = {
  jobType: 'FULL_TIME' as const,
  title: 'Senior Backend Engineer',
  description: 'Own the core API and database layer for a growing platform.',
  skillIds: [validSkillId],
  employmentType: 'FULL_TIME' as const,
  experienceLevel: 'SENIOR' as const,
  minExperienceYears: 4,
  minEducationLevel: 'BACHELORS' as const,
};

describe('createJobSchema — discriminated union with a cross-field refine', () => {
  it('accepts a valid full-time job where salaryMin <= salaryMax', () => {
    const result = createJobSchema.safeParse({ ...baseFullTime, salaryMin: 1000000, salaryMax: 2000000 });
    expect(result.success).toBe(true);
  });

  it('rejects a full-time job where salaryMin > salaryMax', () => {
    const result = createJobSchema.safeParse({ ...baseFullTime, salaryMin: 3000000, salaryMax: 2000000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('salaryMax');
    }
  });

  it('still correctly discriminates and validates the FREELANCE branch (the refine only applies to FULL_TIME)', () => {
    const result = createJobSchema.safeParse({
      jobType: 'FREELANCE',
      title: 'Landing Page Redesign',
      description: 'Redesign our marketing site landing page for conversion.',
      skillIds: [validSkillId],
      deliverables: ['Figma mockups', 'Responsive HTML/CSS'],
      budgetType: 'FIXED',
      budget: 50000,
      freelanceExperienceLevel: 'INTERMEDIATE',
      projectLengthEstimate: 'W1_4',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown jobType (proves the discriminated union is actually wired up)', () => {
    const result = createJobSchema.safeParse({ ...baseFullTime, jobType: 'INTERNSHIP', salaryMin: 1, salaryMax: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a job with no skills at all', () => {
    const result = createJobSchema.safeParse({ ...baseFullTime, skillIds: [], salaryMin: 1, salaryMax: 2 });
    expect(result.success).toBe(false);
  });
});

describe('setWeightageSchema — one shape for both job types, must sum to 100', () => {
  it('accepts full-time weights that sum to 100', () => {
    const result = setWeightageSchema.safeParse({
      skillWeight: 40, experienceWeight: 30, educationWeight: 15, domainWeight: 10, practicalFitWeight: 5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts freelance weights that sum to 100', () => {
    const result = setWeightageSchema.safeParse({
      skillWeight: 35, portfolioWeight: 30, rateFitWeight: 15, trackRecordWeight: 15, availabilityWeight: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects weights that sum to less than 100', () => {
    const result = setWeightageSchema.safeParse({ skillWeight: 40, experienceWeight: 30 });
    expect(result.success).toBe(false);
  });

  it('rejects weights that sum to more than 100', () => {
    const result = setWeightageSchema.safeParse({
      skillWeight: 40, experienceWeight: 30, educationWeight: 15, domainWeight: 10, practicalFitWeight: 10,
    });
    expect(result.success).toBe(false);
  });
});
