import {
  PrismaClient,
  Role,
  CohortStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  SubmissionStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // 1. Create Admin User
  const adminEmail = 'admin@uriacademy.com';
  const adminPassword = await bcrypt.hash('admin1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPassword,
      role: Role.ADMIN,
      name: 'Admin User',
    },
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      role: Role.ADMIN,
      name: 'Admin User',
    },
  });
  console.log(`Created/Updated Admin: ${admin.email}`);

  // 2. Create Cohort
  const cohortName = 'Sales Cohort 1';
  const cohort = await prisma.cohort.upsert({
    where: { name: cohortName },
    update: {},
    create: {
      name: cohortName,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      status: CohortStatus.ACTIVE,
    },
  });
  console.log(`Created/Updated Cohort: ${cohort.name}`);

  // 3. Create Student User
  const studentEmail = 'shorekoya@gmail.com';
  const studentPassword = await bcrypt.hash('test1234', 10);

  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      passwordHash: studentPassword,
      role: Role.STUDENT,
      name: 'Shore Koya',
    },
    create: {
      email: studentEmail,
      passwordHash: studentPassword,
      role: Role.STUDENT,
      name: 'Shore Koya',
    },
  });
  console.log(`Created/Updated Student: ${student.email}`);

  // Create NotificationPrefs for users
  await prisma.notificationPref.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  await prisma.notificationPref.upsert({
    where: { userId: student.id },
    update: {},
    create: { userId: student.id },
  });
  console.log('Created Notification Preferences');

  // 4. Create Student Profile (enroll in cohort)
  // Check if profile exists
  const existingProfile = await prisma.studentProfile.findUnique({
    where: { userId: student.id },
  });

  let studentProfile;
  if (!existingProfile) {
    studentProfile = await prisma.studentProfile.create({
      data: {
        userId: student.id,
        cohortId: cohort.id,
        studentIdCode: 'ST-001',
        progress: 0,
      },
    });
    console.log(`Created Student Profile for: ${student.email}`);
  } else {
    studentProfile = await prisma.studentProfile.update({
      where: { userId: student.id },
      data: {
        cohortId: cohort.id,
      },
    });
    console.log(`Updated Student Profile for: ${student.email}`);
  }

  // 5. Create Assignments
  const assignment1 =
    (await prisma.assignment.findFirst({
      where: { title: 'Sales Strategy 101', cohortId: cohort.id },
    })) ||
    (await prisma.assignment.create({
      data: {
        title: 'Sales Strategy 101',
        description: 'Define your sales strategy for a hypothetical product.',
        dueAt: new Date(new Date().setDate(new Date().getDate() + 7)), // Due in 7 days
        maxScore: 100,
        cohortId: cohort.id,
      },
    }));
  console.log(`Ensured Assignment: ${assignment1.title}`);

  const assignment2 =
    (await prisma.assignment.findFirst({
      where: { title: 'Cold Calling Script', cohortId: cohort.id },
    })) ||
    (await prisma.assignment.create({
      data: {
        title: 'Cold Calling Script',
        description: 'Write a cold calling script for B2B sales.',
        dueAt: new Date(new Date().setDate(new Date().getDate() + 14)), // Due in 14 days
        maxScore: 100,
        cohortId: cohort.id,
      },
    }));
  console.log(`Ensured Assignment: ${assignment2.title}`);

  // 6. Create Submission (for assignment 1)
  const existingSubmission = await prisma.submission.findFirst({
    where: { assignmentId: assignment1.id, studentId: studentProfile.id },
  });

  if (!existingSubmission) {
    await prisma.submission.create({
      data: {
        assignmentId: assignment1.id,
        studentId: studentProfile.id,
        contentURL: 'https://docs.google.com/document/d/dummy-link',
        status: SubmissionStatus.PENDING,
        submittedAt: new Date(),
      },
    });
    console.log(`Created Submission for Assignment: ${assignment1.title}`);
  }

  // 7. Create Payment
  const existingPayment = await prisma.payment.findFirst({
    where: { studentId: studentProfile.id, amount: 35000, status: PaymentStatus.PAID },
  });

  if (!existingPayment) {
    await prisma.payment.create({
      data: {
        studentId: studentProfile.id,
        amount: 35000,
        currency: 'NGN',
        status: PaymentStatus.PAID,
        method: PaymentMethod.CARD,
        provider: PaymentProvider.PAYSTACK, // or SQUAD
        reference: `REF-${Date.now()}`,
        receiptURL: 'https://paystack.com/receipt/dummy',
      },
    });
    console.log(`Created Payment for Student: ${student.email}`);
  }

  // 8. Create Curriculum Items
  // First, clean up existing curriculum items to ensure we have the latest structure
  await prisma.curriculumItem.deleteMany({});
  console.log('Cleared existing curriculum items');

  const curriculumData = [
    {
      week: 1,
      title: 'Phase 1: The Blueprint',
      description:
        'Theme: Sales, People & Money. Focus: Shifting from a graduate mindset to a "Revenue Engineer."',
      durationMinutes: 600, // estimated
      orderIndex: 1,
      topics: [
        'Sales Psychology Fundamentals',
        'ICP & Persona Mapping',
        'Lead Sourcing & Data Hygiene',
        'Cold Email Copywriting',
      ],
    },
    {
      week: 2,
      title: 'Phase 2: The Build',
      description:
        'Theme: Conversations, Systems & Tools. Focus: Transitioning from theory to active hunting.',
      durationMinutes: 600,
      orderIndex: 2,
      topics: [
        'CRM Management & Sequencing',
        'The Discovery Framework',
        'Inbound vs. Outbound',
        'The Quota Challenge',
      ],
    },
    {
      week: 3,
      title: 'Phase 3: Placement',
      description:
        'Theme: Closing, Capstone & Career Readiness. Focus: Finalizing skills and securing the role.',
      durationMinutes: 600,
      orderIndex: 3,
      topics: [
        'The Capstone Campaign',
        'Portfolio Review & Polish',
        'Interview Preparation',
        'Hiring Partner Intro',
      ],
    },
  ];

  for (const item of curriculumData) {
    await prisma.curriculumItem.create({
      data: {
        week: item.week,
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes,
        orderIndex: item.orderIndex,
        topics: item.topics,
      },
    });
    console.log(`Created Curriculum Item: ${item.title}`);
  }

  // 9. Create Grade
  await prisma.grade.upsert({
    where: {
      studentId_assignmentId: {
        studentId: studentProfile.id,
        assignmentId: assignment1.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      assignmentId: assignment1.id,
      score: 85,
      gradedAt: new Date(),
    },
  });
  console.log('Ensured Grade for assignment 1');

  // 10. Create Discount Codes
  const discountCodes = [
    { code: 'TECHPULSE26', discountPercentage: 20 },
    { code: 'LASUTECH', discountPercentage: 20 },
  ];

  for (const dc of discountCodes) {
    await prisma.discountCode.upsert({
      where: { code: dc.code },
      update: { discountPercentage: dc.discountPercentage, isActive: true },
      create: {
        code: dc.code,
        discountPercentage: dc.discountPercentage,
        isActive: true,
      },
    });
    console.log(`Ensured Discount Code: ${dc.code}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
