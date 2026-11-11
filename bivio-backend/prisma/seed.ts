/**
 * Seeds the minimum data needed for the app to not be empty on first run:
 * platform settings (so /admin/settings has something to show and every
 * fee-check in the service layer has a real value to read), a starter skill
 * list, and one demo account per role so local dev doesn't require manually
 * registering three times.
 *
 * Run with: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SETTINGS: Array<{
  key: string; label: string; value: string; description: string;
  type: 'DECIMAL' | 'PERCENTAGE' | 'INTEGER' | 'BOOLEAN';
  section: 'FEES' | 'THRESHOLDS' | 'FLAGS' | 'POLICY';
}> = [
  // Fees
  { key: 'RECRUITER_POSTING_FEE', label: 'Recruiter one-time posting fee', value: '2500',
    description: 'One-time fee charged once per recruiter account before their first job can be published (OQ-1).',
    type: 'DECIMAL', section: 'FEES' },
  { key: 'CANDIDATE_PROFILE_FEE', label: 'Candidate full-time profile fee', value: '499',
    description: 'One-time fee unlocking unlimited full-time applications for a candidate.',
    type: 'DECIMAL', section: 'FEES' },
  { key: 'PLATFORM_FEE_PERCENT', label: 'Freelance platform commission', value: '10',
    description: 'Percentage taken on each freelance milestone release. Frozen per-contract at signing — changing this only affects new contracts.',
    type: 'PERCENTAGE', section: 'FEES' },

  // Thresholds
  { key: 'KYC_THRESHOLD', label: 'KYC required above contract value', value: '500000',
    description: 'Contracts above this value require identity-verified recruiters, not just payment-verified.',
    type: 'DECIMAL', section: 'THRESHOLDS' },
  { key: 'PAYOUT_MINIMUM', label: 'Payout minimum', value: '500',
    description: 'Minimum wallet balance a freelancer can request as a payout.',
    type: 'DECIMAL', section: 'THRESHOLDS' },
  { key: 'OFFER_EXPIRY_DAYS', label: 'Offer expiry (days)', value: '7',
    description: 'Default number of days before an unanswered offer expires.',
    type: 'INTEGER', section: 'THRESHOLDS' },
  { key: 'INVITATION_EXPIRY_DAYS', label: 'Invitation expiry (days)', value: '7',
    description: 'Default number of days before an unanswered invitation expires.',
    type: 'INTEGER', section: 'THRESHOLDS' },
  { key: 'REVIEW_PUBLISH_DAYS', label: 'Review double-blind window (days)', value: '14',
    description: 'Reviews publish once both parties submit, or after this many days, whichever comes first.',
    type: 'INTEGER', section: 'THRESHOLDS' },
  { key: 'DISPUTE_SLA_HOURS', label: 'Dispute resolution SLA (hours)', value: '48',
    description: 'Target turnaround time for admin dispute resolution.',
    type: 'INTEGER', section: 'THRESHOLDS' },

  // Feature flags
  { key: 'FEATURE_FREELANCER_SEARCH', label: 'Freelancer discovery page enabled', value: 'true',
    description: 'Toggles /recruiter/freelancers.', type: 'BOOLEAN', section: 'FLAGS' },
  { key: 'FEATURE_CHAT', label: 'Chat enabled', value: 'true',
    description: 'Kill switch if Socket.IO infrastructure has issues.', type: 'BOOLEAN', section: 'FLAGS' },
  { key: 'FEATURE_REGISTRATIONS_OPEN', label: 'New registrations enabled', value: 'true',
    description: 'Emergency stop if abuse is detected.', type: 'BOOLEAN', section: 'FLAGS' },

  // Review policy
  { key: 'REVIEW_EDIT_ALLOWED', label: 'Allow review edits before publish', value: 'true',
    description: 'Whether a reviewer can revise wording during the blind window.', type: 'BOOLEAN', section: 'POLICY' },
];

const SKILLS = [
  ['React', 'Frontend'], ['TypeScript', 'Language'], ['Node.js', 'Backend'],
  ['PostgreSQL', 'Database'], ['Prisma', 'Backend'], ['Next.js', 'Frontend'],
  ['Redis', 'Database'], ['Docker', 'DevOps'], ['Python', 'Language'],
  ['Figma', 'Design'], ['GraphQL', 'Backend'], ['AWS', 'DevOps'],
  ['Kubernetes', 'DevOps'], ['MongoDB', 'Database'], ['Vue.js', 'Frontend'],
] as const;

async function main() {
  console.log('Seeding platform settings...');
  for (const s of SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      create: { ...s, updatedAt: new Date() },
      update: {},
    });
  }

  console.log('Seeding skills...');
  for (const [name, category] of SKILLS) {
    await prisma.skill.upsert({ where: { name }, create: { name, category }, update: {} });
  }

  console.log('Seeding demo accounts...');
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@bivio.example' },
    create: {
      fullName: 'Ops Admin', email: 'admin@bivio.example', passwordHash,
      role: 'ADMIN', isVerified: true, accountStatus: 'ACTIVE',
    },
    update: {},
  });
  await prisma.adminProfile.upsert({ where: { userId: adminUser.id }, create: { userId: adminUser.id }, update: {} });

  console.log('Done. Demo admin email: admin@bivio.example, password: Password123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
