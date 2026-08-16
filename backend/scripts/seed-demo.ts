import 'reflect-metadata';
import { Sequelize, Op } from '@sequelize/core';
import { PostgresDialect } from '@sequelize/postgres';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MODELS, User, Student, Employer, Internship, InternshipApplication, ApplicationNote, InternshipRequest } from '../src/database/models/index.js';

// Realistic, sizeable demo dataset — students, employers (across all
// verification states), internships (across all statuses/categories), and
// applications (across the full status pipeline), so a demo doesn't open on
// an empty platform. Idempotent: every seeded user's identifier lives under
// DEMO_DOMAIN, so re-running detects prior seed data and no-ops unless
// --reset is passed (which deletes only rows under that domain, in FK order,
// before reseeding) — never touches real accounts from OTP sign-ups or
// seed-admin.ts.
const DEMO_DOMAIN = 'demo.swayamplus.test';

// A tiny hand-built seeded PRNG (not Math.random()) so the same command
// produces the same dataset every time — useful for diffing/reviewing what
// a re-seed would produce before running --reset.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260816);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return out;
}
function intBetween(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(intBetween(8, 20), intBetween(0, 59), intBetween(0, 59), 0);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Anika', 'Ira', 'Riya', 'Navya',
  'Karthik', 'Pranav', 'Siddharth', 'Aryan', 'Devansh', 'Nikhil', 'Rahul', 'Varun', 'Yash', 'Aditi',
  'Priya', 'Sneha', 'Pooja', 'Meera', 'Neha', 'Kavya', 'Divya', 'Shreya', 'Tanvi', 'Nisha',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Gupta', 'Mehta', 'Kapoor', 'Menon',
  'Pillai', 'Chatterjee', 'Banerjee', 'Joshi', 'Desai', 'Patel', 'Kulkarni', 'Naidu', 'Suresh', 'Krishnan',
];
const COLLEGES = [
  'IIT Madras', 'IIT Bombay', 'NIT Trichy', 'BITS Pilani', 'Anna University',
  'VIT Vellore', 'SRM Institute of Science and Technology', 'Loyola College Chennai',
  'Christ University Bangalore', 'Delhi University', 'Manipal Institute of Technology',
  'PSG College of Technology', 'Amrita Vishwa Vidyapeetham', 'Symbiosis Institute of Technology',
  'Jadavpur University',
];
const COURSES = [
  'B.Tech Computer Science', 'B.Tech Electronics', 'B.Sc Statistics', 'BCA', 'MBA Marketing',
  'B.Com', 'BBA', 'M.Sc Data Science', 'B.Tech Mechanical', 'B.Des', 'B.A. Economics', 'MCA',
];
const CITIES = [
  'Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi', 'Kolkata', 'Coimbatore',
  'Kochi', 'Ahmedabad', 'Jaipur', 'Indore',
];
const SKILLS_POOL = [
  'React', 'Node.js', 'Python', 'SQL', 'Data Analysis', 'Figma', 'Content Writing', 'SEO',
  'Excel', 'Communication', 'Java', 'Machine Learning', 'AWS', 'Digital Marketing',
  'Video Editing', 'Copywriting', 'Tally', 'Sales', 'CRM', 'Photoshop', 'UI Design',
  'Project Management', 'Git', 'TypeScript', 'Power BI', 'Social Media Management',
];

interface EmployerSeed {
  orgName: string;
  industryTags: string[];
  hqCity: string;
  headcount: number;
  website: string;
  linkedin: string;
  contactName: string;
  contactPhone: string;
  reasonForEoi: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  moderationMode: 'auto_publish' | 'review';
}

const EMPLOYERS: EmployerSeed[] = [
  { orgName: 'Northwind Analytics', industryTags: ['IT', 'Analytics'], hqCity: 'Bengaluru', headcount: 220, website: 'https://northwindanalytics.example.com', linkedin: 'https://www.linkedin.com/company/northwind-analytics', contactName: 'Rakesh Sundaram', contactPhone: '9840012345', reasonForEoi: 'We want to build a pipeline of analytics talent from tier-1 and tier-2 colleges before campus placement season.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Bluepetal EdTech', industryTags: ['Education', 'SaaS'], hqCity: 'Chennai', headcount: 85, website: 'https://bluepetal.example.com', linkedin: 'https://www.linkedin.com/company/bluepetal-edtech', contactName: 'Ayesha Khan', contactPhone: '9884023456', reasonForEoi: 'Looking for content and growth interns to support our regional-language course expansion.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Fintara Payments', industryTags: ['FinTech'], hqCity: 'Mumbai', headcount: 340, website: 'https://fintara.example.com', linkedin: 'https://www.linkedin.com/company/fintara-payments', contactName: 'Vikram Oberoi', contactPhone: '9820034567', reasonForEoi: 'Hiring interns across engineering and risk-analytics teams ahead of our Series B scale-up.', verificationStatus: 'approved', moderationMode: 'review' },
  { orgName: 'Greenleaf Agritech', industryTags: ['AgriTech'], hqCity: 'Coimbatore', headcount: 60, website: 'https://greenleafagritech.example.com', linkedin: 'https://www.linkedin.com/company/greenleaf-agritech', contactName: 'Muthu Kumar', contactPhone: '9843045678', reasonForEoi: 'Rural-facing product team wants field-research and app-design interns for the upcoming season.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Cirrus Cloud Systems', industryTags: ['Cloud', 'IT'], hqCity: 'Hyderabad', headcount: 500, website: 'https://cirruscloud.example.com', linkedin: 'https://www.linkedin.com/company/cirrus-cloud-systems', contactName: 'Farhan Ali', contactPhone: '9848056789', reasonForEoi: 'Standing intern pipeline for our cloud infrastructure and DevOps teams.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Marigold Health', industryTags: ['Healthcare'], hqCity: 'Pune', headcount: 150, website: 'https://marigoldhealth.example.com', linkedin: 'https://www.linkedin.com/company/marigold-health', contactName: 'Dr. Snehal Kulkarni', contactPhone: '9822067890', reasonForEoi: 'Need operations and data interns to support our diagnostics-network rollout.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Lumen Retail Co.', industryTags: ['Retail', 'E-commerce'], hqCity: 'Delhi', headcount: 410, website: 'https://lumenretail.example.com', linkedin: 'https://www.linkedin.com/company/lumen-retail', contactName: 'Aditi Malhotra', contactPhone: '9871078901', reasonForEoi: 'Building out our merchandising-analytics and D2C marketing bench with interns.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Vantage Logistics', industryTags: ['Logistics'], hqCity: 'Ahmedabad', headcount: 275, website: 'https://vantagelogistics.example.com', linkedin: 'https://www.linkedin.com/company/vantage-logistics', contactName: 'Kiran Patel', contactPhone: '9909089012', reasonForEoi: 'Operations-research and route-optimization internships to support network expansion.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Solstice Design Studio', industryTags: ['Design', 'Creative'], hqCity: 'Kochi', headcount: 40, website: 'https://solsticedesign.example.com', linkedin: 'https://www.linkedin.com/company/solstice-design-studio', contactName: 'Meera Nambiar', contactPhone: '9895090123', reasonForEoi: 'Small studio looking for UI/UX and content interns to support client work.', verificationStatus: 'approved', moderationMode: 'auto_publish' },
  { orgName: 'Kestrel Robotics', industryTags: ['Robotics', 'Manufacturing'], hqCity: 'Pune', headcount: 95, website: 'https://kestrelrobotics.example.com', linkedin: 'https://www.linkedin.com/company/kestrel-robotics', contactName: 'Abhishek Deshmukh', contactPhone: '9860001234', reasonForEoi: 'New EOI awaiting verification — expanding our embedded-systems internship program.', verificationStatus: 'pending', moderationMode: 'auto_publish' },
  { orgName: 'Ferrous & Oak Consulting', industryTags: ['Consulting'], hqCity: 'Delhi', headcount: 30, website: 'https://ferrousoak.example.com', linkedin: 'https://www.linkedin.com/company/ferrous-oak-consulting', contactName: 'Ritu Chawla', contactPhone: '9911012345', reasonForEoi: 'First-time employer on the platform, submitting our EOI for a business-research internship cohort.', verificationStatus: 'pending', moderationMode: 'auto_publish' },
  { orgName: 'Tidewater Media Labs', industryTags: ['Media'], hqCity: 'Mumbai', headcount: 55, website: 'https://tidewatermedia.example.com', linkedin: 'https://www.linkedin.com/company/tidewater-media-labs', contactName: 'Naveen Shetty', contactPhone: '9930023456', reasonForEoi: 'Awaiting verification for a content and video-production internship batch.', verificationStatus: 'pending', moderationMode: 'auto_publish' },
  { orgName: 'Ashgrove Realty', industryTags: ['Real Estate'], hqCity: 'Bengaluru', headcount: 20, website: 'https://ashgroverealty.example.com', linkedin: 'https://www.linkedin.com/company/ashgrove-realty', contactName: 'Deepak Rao', contactPhone: '9945034567', reasonForEoi: 'Submitted CIN details did not match records on file.', verificationStatus: 'rejected', moderationMode: 'auto_publish' },
  { orgName: 'Sable & Finch', industryTags: ['Retail'], hqCity: 'Jaipur', headcount: 15, website: 'https://sablefinch.example.com', linkedin: 'https://www.linkedin.com/company/sable-finch', contactName: 'Ritika Singh', contactPhone: '9950045678', reasonForEoi: 'Incomplete Certificate of Incorporation upload after two follow-ups.', verificationStatus: 'rejected', moderationMode: 'auto_publish' },
];

const CATEGORY_TEMPLATES: Record<string, { titles: string[]; skills: string[]; responsibilities: string[]; eligibility: string[] }> = {
  'Data Analysis': {
    titles: ['Data Analysis Intern', 'Business Intelligence Intern'],
    skills: ['Excel', 'SQL', 'Data Analysis', 'Power BI'],
    responsibilities: ['Clean and structure raw datasets for reporting', 'Build weekly dashboards for stakeholder review', 'Assist in identifying trends across business metrics', 'Support ad-hoc data requests from other teams'],
    eligibility: ['Comfortable with spreadsheets', 'Basic SQL knowledge preferred'],
  },
  'Data Science': {
    titles: ['Data Science Intern', 'Machine Learning Intern'],
    skills: ['Python', 'Machine Learning', 'SQL', 'Data Analysis'],
    responsibilities: ['Prototype models against labeled datasets', 'Support feature-engineering experiments', 'Document model performance for the team', 'Collaborate with engineering on model handoff'],
    eligibility: ['Familiarity with Python data libraries', 'Coursework in statistics or ML preferred'],
  },
  'Software Development': {
    titles: ['Software Development Intern', 'Backend Engineering Intern'],
    skills: ['Java', 'Node.js', 'Git', 'SQL'],
    responsibilities: ['Ship small features under senior-engineer review', 'Write unit tests for new code paths', 'Participate in code review and daily standups', 'Fix bugs from the team backlog'],
    eligibility: ['Comfortable with at least one backend language', 'Basic Git workflow knowledge'],
  },
  'Web Development': {
    titles: ['Web Development Intern', 'Frontend Engineering Intern'],
    skills: ['React', 'TypeScript', 'Git', 'Node.js'],
    responsibilities: ['Build and style UI components from Figma designs', 'Fix cross-browser layout issues', 'Integrate with existing REST APIs', 'Write basic component tests'],
    eligibility: ['Familiarity with React or similar framework', 'Basic HTML/CSS/JS knowledge'],
  },
  'Digital Marketing': {
    titles: ['Digital Marketing Intern', 'Performance Marketing Intern'],
    skills: ['SEO', 'Digital Marketing', 'Social Media Management', 'Excel'],
    responsibilities: ['Plan and schedule social content calendars', 'Track campaign performance across channels', 'Support keyword research for SEO', 'Draft ad copy variations for A/B tests'],
    eligibility: ['Interest in marketing analytics', 'Comfortable writing short-form copy'],
  },
  'UI/UX Design': {
    titles: ['UI/UX Design Intern', 'Product Design Intern'],
    skills: ['Figma', 'UI Design', 'Communication'],
    responsibilities: ['Design wireframes and high-fidelity mockups', 'Run usability walkthroughs with the team', 'Maintain the shared component library', 'Support user research synthesis'],
    eligibility: ['Portfolio of design work preferred', 'Familiarity with Figma'],
  },
  HR: {
    titles: ['HR Intern', 'Talent Acquisition Intern'],
    skills: ['Communication', 'Excel', 'CRM'],
    responsibilities: ['Screen incoming applications against role criteria', 'Coordinate interview scheduling', 'Support onboarding documentation', 'Help maintain the applicant tracking sheet'],
    eligibility: ['Strong written and verbal communication', 'Comfortable with confidential information'],
  },
  'Content Writing': {
    titles: ['Content Writing Intern', 'Technical Writing Intern'],
    skills: ['Content Writing', 'Copywriting', 'SEO'],
    responsibilities: ['Draft blog posts and product copy', 'Edit drafts for tone and clarity', 'Research topics for upcoming content', 'Optimize published pieces for search'],
    eligibility: ['Strong English writing skills', 'A writing sample or portfolio helps'],
  },
  'Sales & Business Development': {
    titles: ['Business Development Intern', 'Sales Operations Intern'],
    skills: ['Sales', 'CRM', 'Communication', 'Excel'],
    responsibilities: ['Research and qualify inbound leads', 'Support pipeline tracking in the CRM', 'Assist with client outreach drafts', 'Compile weekly pipeline reports'],
    eligibility: ['Comfortable with cold outreach', 'Interest in B2B sales'],
  },
  'Finance & Accounting': {
    titles: ['Finance Intern', 'Accounting Intern'],
    skills: ['Tally', 'Excel', 'Data Analysis'],
    responsibilities: ['Support monthly reconciliation tasks', 'Maintain expense and invoice records', 'Assist with budget-variance reporting', 'Help prepare data for the audit cycle'],
    eligibility: ['Coursework in commerce/finance preferred', 'Comfortable with spreadsheets'],
  },
  Operations: {
    titles: ['Operations Intern', 'Supply Chain Intern'],
    skills: ['Excel', 'Project Management', 'Communication'],
    responsibilities: ['Track daily operational metrics', 'Coordinate with vendor/partner teams', 'Support process-documentation updates', 'Flag exceptions for supervisor review'],
    eligibility: ['Detail-oriented', 'Comfortable with fieldwork where applicable'],
  },
  Other: {
    titles: ['Research Intern', 'Program Intern'],
    skills: ['Communication', 'Excel', 'Project Management'],
    responsibilities: ['Support the team on assigned research tasks', 'Prepare summary notes for internal review', 'Coordinate logistics for team initiatives', 'Assist with documentation and reporting'],
    eligibility: ['Strong organizational skills', 'Open to a generalist role'],
  },
};

const PERKS_POOL = [
  'Certificate of completion', 'Letter of recommendation', 'Flexible working hours',
  'Mentorship from senior team', 'Pre-placement offer potential', 'Free snacks/lunch',
  '5-day work week', 'Networking events', 'Work-from-home setup allowance',
];

const MODES = ['remote', 'onsite', 'hybrid'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time'];
const SCHEDULE_TYPES = ['flexible', 'fixed'];
const EDUCATION_LEVELS = ['UG', 'PG', 'Any'] as const;
const STREAMS = ['Engineering', 'Management', 'Commerce', 'Science', 'Any'] as const;

const REQUEST_DOMAINS = [
  'Blockchain Development', 'Game Development', 'Robotics', 'Cybersecurity',
  'AR/VR Development', 'Product Management', 'Legal Tech', 'Animation',
];

const PLACEHOLDER_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<<>>>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF',
  'utf-8',
);

function ensurePlaceholderFile(uploadsRoot: string, folder: string, filename: string): string {
  const dir = path.join(uploadsRoot, folder);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, PLACEHOLDER_PDF);
  return `/uploads/${folder}/${filename}`;
}

async function main() {
  const reset = process.argv.includes('--reset');

  const sequelize = new Sequelize({
    dialect: PostgresDialect,
    database: process.env.DB_NAME || 'swayamplus_internship',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  });
  sequelize.addModels(MODELS as never);
  await sequelize.authenticate();
  await sequelize.sync();

  const existingDemoUsers = await User.findAll({ where: { identifier: { [Op.like]: `%@${DEMO_DOMAIN}` } } });

  if (existingDemoUsers.length > 0 && !reset) {
    console.log(
      `Found ${existingDemoUsers.length} existing demo accounts (@${DEMO_DOMAIN}). Skipping — pass --reset to wipe and reseed.`,
    );
    await sequelize.close();
    return;
  }

  if (existingDemoUsers.length > 0 && reset) {
    console.log(`--reset passed: removing ${existingDemoUsers.length} existing demo accounts and their data…`);
    const demoUserIds = existingDemoUsers.map((u) => u.id);
    const demoStudents = await Student.findAll({ where: { userId: demoUserIds } });
    const demoEmployers = await Employer.findAll({ where: { userId: demoUserIds } });
    const demoStudentIds = demoStudents.map((s) => s.id);
    const demoEmployerIds = demoEmployers.map((e) => e.id);
    const demoInternships = await Internship.findAll({ where: { employerId: demoEmployerIds } });
    const demoInternshipIds = demoInternships.map((i) => i.id);
    const demoApplications = await InternshipApplication.findAll({
      where: { [Op.or]: [{ studentId: demoStudentIds }, { internshipId: demoInternshipIds }] },
    });
    const demoApplicationIds = demoApplications.map((a) => a.id);

    await ApplicationNote.destroy({ where: { applicationId: demoApplicationIds } });
    await InternshipApplication.destroy({ where: { id: demoApplicationIds } });
    await InternshipRequest.destroy({ where: { studentId: demoStudentIds } });
    await Internship.destroy({ where: { id: demoInternshipIds } });
    await Employer.destroy({ where: { id: demoEmployerIds } });
    await Student.destroy({ where: { id: demoStudentIds } });
    await User.destroy({ where: { id: demoUserIds } });
  }

  const uploadsRoot = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
  const resumeUrl = ensurePlaceholderFile(uploadsRoot, 'resumes', 'seed-demo-resume.pdf');
  const coiUrl = ensurePlaceholderFile(uploadsRoot, 'verification-documents', 'seed-demo-coi.pdf');

  console.log('Seeding employers…');
  const employerRecords: { employer: InstanceType<typeof Employer>; seed: EmployerSeed }[] = [];
  for (let i = 0; i < EMPLOYERS.length; i++) {
    const seed = EMPLOYERS[i];
    const email = `employer.${i + 1}@${DEMO_DOMAIN}`;
    const createdAt = daysAgo(intBetween(5, 90));
    const user = await User.create({ identifier: email, role: 'employer', passwordHash: null, isActive: true, createdAt, updatedAt: createdAt });
    const employer = await Employer.create({
      userId: user.id,
      organizationName: seed.orgName,
      contactPersonName: seed.contactName,
      contactPersonPhone: seed.contactPhone,
      reasonForEoi: seed.reasonForEoi,
      cin: `U${intBetween(10000, 99999)}TN2024PTC${intBetween(100000, 999999)}`,
      certificateOfIncorporationUrl: coiUrl,
      headcount: seed.headcount,
      linkedinBusinessPage: seed.linkedin,
      internshipTypesExpected: pickN(['Full-time', 'Part-time', 'Remote', 'Hybrid'], 2),
      website: seed.website,
      hqCity: seed.hqCity,
      industryTags: seed.industryTags,
      verificationStatus: seed.verificationStatus,
      moderationMode: seed.moderationMode,
      acceptedTermsAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
    employerRecords.push({ employer, seed });
  }

  console.log('Seeding students…');
  const students: InstanceType<typeof Student>[] = [];
  const STUDENT_COUNT = 50;
  for (let i = 0; i < STUDENT_COUNT; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const email = `student.${i + 1}@${DEMO_DOMAIN}`;
    const createdAt = daysAgo(intBetween(1, 100));
    const user = await User.create({ identifier: email, role: 'student', passwordHash: null, isActive: true, createdAt, updatedAt: createdAt });
    // ~80% complete profiles, ~20% left partial (matches real-world signup drop-off, and
    // gives the admin/students page the same "profile incomplete" rows it has today).
    const complete = i % 5 !== 0;
    const student = await Student.create({
      userId: user.id,
      fullName: complete ? `${first} ${last}` : i % 10 === 0 ? null : `${first} ${last}`,
      phone: complete ? `9${intBetween(100000000, 999999999)}` : null,
      collegeName: complete ? pick(COLLEGES) : null,
      course: complete ? pick(COURSES) : null,
      graduationYear: complete ? intBetween(2025, 2028) : null,
      city: complete ? pick(CITIES) : null,
      skills: complete ? pickN(SKILLS_POOL, intBetween(2, 5)) : [],
      resumeUrl: complete ? resumeUrl : null,
      linkedinUrl: complete && rand() > 0.4 ? `https://www.linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}` : null,
      acceptedTermsAt: complete ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    });
    students.push(student);
  }

  console.log('Seeding internships…');
  const approvedEmployers = employerRecords.filter((e) => e.seed.verificationStatus === 'approved');
  const categories = Object.keys(CATEGORY_TEMPLATES);
  const internships: InstanceType<typeof Internship>[] = [];

  for (const { employer, seed } of approvedEmployers) {
    const postCount = intBetween(3, 5);
    for (let j = 0; j < postCount; j++) {
      const category = pick(categories);
      const tmpl = CATEGORY_TEMPLATES[category];
      const paid = rand() > 0.25;
      const createdAt = daysAgo(intBetween(2, 85));
      const isReviewGated = seed.moderationMode === 'review';

      // A handful of statuses per employer for variety: mostly published,
      // occasional draft/closed, and — only for the one review-mode
      // employer — a couple sitting in pending_review for the admin queue.
      let status: 'draft' | 'pending_review' | 'published' | 'closed' | 'archived' = 'published';
      const roll = rand();
      if (isReviewGated && j < 2) status = 'pending_review';
      else if (roll < 0.08) status = 'draft';
      else if (roll < 0.16) status = 'closed';

      const deadline = status === 'closed' ? daysAgo(intBetween(1, 20)) : daysFromNow(intBetween(7, 60));
      const withChecklist = internships.length % 6 === 0;

      const internship = await Internship.create({
        employerId: employer.id,
        title: tmpl.titles[j % tmpl.titles.length],
        description: `Join ${employer.organizationName} as a ${tmpl.titles[j % tmpl.titles.length]} and work directly with our ${category.toLowerCase()} team on real product initiatives. You'll get hands-on exposure, regular feedback, and the chance to ship work that actually ships.`,
        skillTags: pickN(tmpl.skills, Math.min(3, tmpl.skills.length)),
        category,
        mode: pick(MODES),
        employmentType: pick(EMPLOYMENT_TYPES),
        location: seed.hqCity,
        durationWeeks: pick([8, 12, 16, 24]),
        workingDays: pick([5, 6]),
        scheduleType: pick(SCHEDULE_TYPES),
        stipendMin: paid ? pick([5000, 8000, 10000, 15000]) : null,
        stipendMax: paid ? pick([15000, 20000, 25000, 30000]) : null,
        responsibilities: pickN(tmpl.responsibilities, 3),
        perks: pickN(PERKS_POOL, intBetween(2, 4)),
        eligibility: tmpl.eligibility,
        educationLevel: pick(EDUCATION_LEVELS),
        stream: pick(STREAMS),
        experienceRequired: rand() > 0.7,
        checklistItems: withChecklist
          ? [
              { item: `Comfortable working with ${tmpl.skills[0]}`, type: 'rating' as const },
              { item: `Experience with ${tmpl.skills[1] ?? tmpl.skills[0]}`, type: 'rating' as const },
              { item: 'Can commit to the full internship duration', type: 'yesno' as const },
            ]
          : [],
        openings: intBetween(1, 4),
        applicationDeadline: deadline,
        status,
        createdAt,
        updatedAt: createdAt,
      });
      internships.push(internship);
    }
  }

  console.log('Seeding applications…');
  const applicableInternships = internships.filter((i) => i.status === 'published' || i.status === 'closed');
  const APPLICATION_STATUSES: Array<'applied' | 'shortlisted' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn'> = [
    'applied', 'applied', 'applied', 'shortlisted', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn',
  ];
  const usedPairs = new Set<string>();
  const applications: InstanceType<typeof InternshipApplication>[] = [];
  const TARGET_APPLICATIONS = 130;
  let attempts = 0;

  while (applications.length < TARGET_APPLICATIONS && attempts < TARGET_APPLICATIONS * 6) {
    attempts++;
    const student = pick(students);
    const internship = pick(applicableInternships);
    const key = `${internship.id}:${student.id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    const status = pick(APPLICATION_STATUSES);
    const appliedAt = daysAgo(intBetween(1, 55));
    // Status changes land after the apply date, closer to "now" for the
    // active pipeline stages — this is what makes the dashboard's
    // "internships offered" series show up inside the default 30-day view.
    const decidedAt = status === 'applied' ? appliedAt : daysAgo(intBetween(0, 25));

    const withChecklistResponses = internship.checklistItems.length > 0;
    const application = await InternshipApplication.create({
      internshipId: internship.id,
      studentId: student.id,
      coverNote: rand() > 0.3 ? `I'm excited about this ${internship.title} opportunity and believe my background in ${(student.skills[0] ?? 'this field')} is a strong fit.` : null,
      checklistResponses: withChecklistResponses
        ? internship.checklistItems.map((c) => ({
            item: c.item,
            type: c.type,
            value: c.type === 'yesno' ? pick(['yes', 'no'] as const) : pick(['limited', 'moderate', 'expert'] as const),
          }))
        : [],
      status,
      createdAt: appliedAt,
      updatedAt: decidedAt < appliedAt ? appliedAt : decidedAt,
    });
    applications.push(application);
  }

  console.log('Seeding a few application notes…');
  const employerUserByEmployerId = new Map(employerRecords.map((e) => [e.employer.id, e.employer.userId]));
  const noteworthy = applications.filter((a) => a.status !== 'applied' && a.status !== 'withdrawn');
  for (const app of pickN(noteworthy, Math.min(20, noteworthy.length))) {
    const internship = internships.find((i) => i.id === app.internshipId);
    if (!internship) continue;
    const authorUserId = employerUserByEmployerId.get(internship.employerId);
    if (!authorUserId) continue;
    const noteText =
      app.status === 'offered' ? 'Strong interview — extending an offer.'
      : app.status === 'rejected' ? 'Good profile but not the right fit for this specific role right now.'
      : app.status === 'interviewing' ? 'Scheduled for a second-round interview next week.'
      : 'Shortlisted — moving to the interview stage.';
    await ApplicationNote.create({ applicationId: app.id, authorUserId, note: noteText, createdAt: app.updatedAt, updatedAt: app.updatedAt });
  }

  console.log('Seeding internship requests…');
  for (let i = 0; i < REQUEST_DOMAINS.length; i++) {
    const student = pick(students);
    await InternshipRequest.create({
      studentId: student.id,
      domain: REQUEST_DOMAINS[i],
      notes: rand() > 0.5 ? `Couldn't find anything in ${REQUEST_DOMAINS[i]} matching my skill set — would love to see more listings here.` : null,
      createdAt: daysAgo(intBetween(1, 45)),
      updatedAt: daysAgo(intBetween(1, 45)),
    });
  }

  console.log(
    `Done. Seeded ${employerRecords.length} employers, ${students.length} students, ${internships.length} internships, ${applications.length} applications, ${REQUEST_DOMAINS.length} internship requests.`,
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
