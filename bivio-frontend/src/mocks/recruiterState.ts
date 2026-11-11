'use client';

import * as F from './fixtures';
import type { Job, Application, Interview, Offer, Invitation, CandidateProfile, HiringStage, Skill, Contract } from '@/types';

const JOBS_KEY = 'bivio_recruiter_jobs';
const APPLICATIONS_KEY = 'bivio_recruiter_applications';
const INTERVIEWS_KEY = 'bivio_recruiter_interviews';
const OFFERS_KEY = 'bivio_recruiter_offers';
const INVITATIONS_KEY = 'bivio_recruiter_invitations';
const CONTRACTS_KEY = 'bivio_recruiter_contracts';

// Helper to check window
const isClient = typeof window !== 'undefined';

export function initializeState() {
  if (!isClient) return;

  // 1. Initialize Jobs
  if (!localStorage.getItem(JOBS_KEY)) {
    // Generate default hiring stages for pre-existing jobs
    const jobsWithStages = F.JOBS.map(job => ({
      ...job,
      hiringStages: job.hiringStages || [
        { id: `${job.id}-st-1`, jobId: job.id, name: 'Screening', sequence: 1, isTerminal: false },
        { id: `${job.id}-st-2`, jobId: job.id, name: 'Technical Round', sequence: 2, isTerminal: false },
        { id: `${job.id}-st-3`, jobId: job.id, name: 'Manager Round', sequence: 3, isTerminal: false },
        { id: `${job.id}-st-4`, jobId: job.id, name: 'Offer', sequence: 4, isTerminal: true },
      ],
      weightage: job.weightage || {
        id: `wt-${job.id}`,
        skillWeight: 40,
        experienceWeight: 30,
        educationWeight: 15,
        projectWeight: 15
      }
    }));
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobsWithStages));
  }

  // 2. Initialize Applications
  if (!localStorage.getItem(APPLICATIONS_KEY)) {
    const apps = F.APPLICATIONS.map(app => {
      // Ensure currentStageId is set matching the job's stages
      const jobId = app.jobId;
      const currentStageId = app.currentStageId || `${jobId}-st-1`;
      return {
        ...app,
        currentStageId,
        candidate: app.candidate || F.CANDIDATE_PROFILE,
        movements: app.movements || [
          {
            id: `mov-${app.id}-1`,
            applicationId: app.id,
            toStage: { id: `${jobId}-st-1`, name: 'Screening' },
            movedBy: { id: 'usr-rec-1', fullName: 'Priya Menon' },
            movedAt: app.appliedAt,
            note: 'Applied directly'
          }
        ]
      };
    });
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));
  }

  // 3. Initialize Interviews
  if (!localStorage.getItem(INTERVIEWS_KEY)) {
    const defaultInterviews: Interview[] = [
      {
        id: 'int-1',
        applicationId: 'app-1',
        hiringStageId: 'job-1-st-2',
        roundNo: 1,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        durationMinutes: 45,
        mode: 'ONLINE',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        status: 'SCHEDULED',
        interviewer: { id: 'usr-rec-1', fullName: 'Priya Menon' }
      },
      {
        id: 'int-2',
        applicationId: 'app-2',
        hiringStageId: 'job-1-st-3',
        roundNo: 2,
        scheduledAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        durationMinutes: 60,
        mode: 'ONLINE',
        meetingLink: 'https://meet.google.com/xyz-qprs-tuv',
        status: 'COMPLETED',
        feedback: 'Great system architecture understanding, communication is clear.',
        rating: 4,
        recommendation: 'PROCEED',
        interviewer: { id: 'usr-rec-1', fullName: 'Priya Menon' }
      }
    ];
    localStorage.setItem(INTERVIEWS_KEY, JSON.stringify(defaultInterviews));
  }

  // 4. Initialize Offers
  if (!localStorage.getItem(OFFERS_KEY)) {
    localStorage.setItem(OFFERS_KEY, JSON.stringify(F.OFFERS));
  }

  const storedInvitations = localStorage.getItem(INVITATIONS_KEY);
  if (!storedInvitations || JSON.parse(storedInvitations).length < 2) {
    localStorage.setItem(INVITATIONS_KEY, JSON.stringify(F.INVITATIONS));
  }

  // 6. Initialize Contracts
  const storedContracts = localStorage.getItem(CONTRACTS_KEY);
  if (!storedContracts || JSON.parse(storedContracts).length < 4) {
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(F.CONTRACTS));
  }
}

// Global dispatch event helper to sync tabs/components
const notifyStorageChange = () => {
  if (isClient) {
    window.dispatchEvent(new Event('storage'));
  }
};

// --- Jobs state getters/setters ---
export function getJobs(): Job[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(JOBS_KEY) || '[]');
}

export function getJob(id: string): Job | undefined {
  return getJobs().find(j => j.id === id);
}

export function saveJob(job: Job) {
  const jobs = getJobs();
  const index = jobs.findIndex(j => j.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  notifyStorageChange();
}

// --- Applications state getters/setters ---
export function getApplications(): Application[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
}

export function getApplication(id: string): Application | undefined {
  return getApplications().find(a => a.id === id);
}

export function saveApplication(app: Application) {
  const apps = getApplications();
  const index = apps.findIndex(a => a.id === app.id);
  if (index >= 0) {
    apps[index] = app;
  } else {
    apps.push(app);
  }
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));
  notifyStorageChange();
}

// --- Interviews state getters/setters ---
export function getInterviews(): Interview[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(INTERVIEWS_KEY) || '[]');
}

export function saveInterview(interview: Interview) {
  const interviews = getInterviews();
  const index = interviews.findIndex(i => i.id === interview.id);
  if (index >= 0) {
    interviews[index] = interview;
  } else {
    interviews.push(interview);
  }
  localStorage.setItem(INTERVIEWS_KEY, JSON.stringify(interviews));
  notifyStorageChange();
}

// --- Offers state getters/setters ---
export function getOffers(): Offer[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(OFFERS_KEY) || '[]');
}

export function saveOffer(offer: Offer) {
  const offers = getOffers();
  const index = offers.findIndex(o => o.id === offer.id);
  if (index >= 0) {
    offers[index] = offer;
  } else {
    offers.push(offer);
  }
  localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
  notifyStorageChange();
}

// --- Invitations state getters/setters ---
export function getInvitations(): Invitation[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(INVITATIONS_KEY) || '[]');
}

export function saveInvitation(invitation: Invitation) {
  const invitations = getInvitations();
  const index = invitations.findIndex(i => i.id === invitation.id);
  if (index >= 0) {
    invitations[index] = invitation;
  } else {
    invitations.push(invitation);
  }
  localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invitations));
  notifyStorageChange();
}

// --- Extra helper candidate pool ---
export function getCandidatesPool(): CandidateProfile[] {
  return [
    F.CANDIDATE_PROFILE,
    {
      id: 'cand-2',
      userId: 'usr-cand-2',
      headline: 'Senior Backend Engineer · Node.js & Go',
      summary: 'Specialist in high-throughput distributed systems and transactional reliability.',
      location: 'Bengaluru, India',
      experienceYears: '8.0',
      highestEducation: 'M.Tech Computer Science',
      openToFullTime: true,
      openToFreelance: false,
      fullTimeFeePaid: true,
      user: { id: 'usr-cand-2', fullName: 'Rhea Kapoor', email: 'rhea@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'ACTIVE' },
      skills: [
        { id: 'cs-5', skillId: 'sk-3', proficiency: 5, yearsOfExperience: '7.0', skill: F.SKILLS[2] },
        { id: 'cs-6', skillId: 'sk-4', proficiency: 5, yearsOfExperience: '6.0', skill: F.SKILLS[3] },
      ]
    },
    {
      id: 'cand-3',
      userId: 'usr-cand-3',
      headline: 'Frontend Engineer · Design Systems specialist',
      summary: 'Passionate about custom animations, accessibility, and lightweight build sizes.',
      location: 'Remote',
      experienceYears: '4.0',
      highestEducation: 'B.E. Information Technology',
      openToFullTime: true,
      openToFreelance: true,
      fullTimeFeePaid: true,
      user: { id: 'usr-cand-3', fullName: 'Dev Patel', email: 'dev@example.com', role: 'CANDIDATE', isVerified: true, accountStatus: 'ACTIVE' },
      skills: [
        { id: 'cs-7', skillId: 'sk-1', proficiency: 4, yearsOfExperience: '4.0', skill: F.SKILLS[0] },
        { id: 'cs-8', skillId: 'sk-6', proficiency: 4, yearsOfExperience: '3.0', skill: F.SKILLS[5] },
      ]
    },
    {
      id: 'cand-4',
      userId: 'usr-cand-4',
      headline: 'DevOps & Cloud Architect',
      summary: 'Focus on Kubernetes, Docker, automation pipelines, and infrastructure as code.',
      location: 'Pune, India',
      experienceYears: '7.0',
      highestEducation: 'B.Tech IT',
      openToFullTime: true,
      openToFreelance: true,
      fullTimeFeePaid: true,
      user: { id: 'usr-cand-4', fullName: 'Ishaan Rao', email: 'ishaan@example.com', role: 'CANDIDATE', isVerified: false, accountStatus: 'ACTIVE' },
      skills: [
        { id: 'cs-9', skillId: 'sk-8', proficiency: 5, yearsOfExperience: '5.0', skill: F.SKILLS[7] },
      ]
    }
  ];
}

// --- Contracts state getters/setters ---
export function getContracts(): Contract[] {
  initializeState();
  if (!isClient) return [];
  return JSON.parse(localStorage.getItem(CONTRACTS_KEY) || '[]');
}

export function getContract(id: string): Contract | undefined {
  return getContracts().find(c => c.id === id);
}

export function saveContract(contract: Contract) {
  const contracts = getContracts();
  const index = contracts.findIndex(c => c.id === contract.id);
  if (index >= 0) {
    contracts[index] = contract;
  } else {
    contracts.push(contract);
  }
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
  notifyStorageChange();
}
