import { prisma } from './src/lib/prisma';

async function main() {
  const cohortId = '2e079bd2-9c7f-4b9d-bab8-2a337e582e5d';

  console.log(`Seeding attendance sessions for Cohort ID: ${cohortId}`);

  const sessions = [
    {
      cohortId,
      date: new Date('2025-01-10T09:00:00Z'),
      topic: 'Introduction to Sales',
      startTime: new Date('2025-01-10T09:00:00Z'),
      endTime: new Date('2025-01-10T11:00:00Z'),
    },
    {
      cohortId,
      date: new Date('2025-01-12T14:00:00Z'),
      topic: 'CRM Fundamentals',
      startTime: new Date('2025-01-12T14:00:00Z'),
      endTime: new Date('2025-01-12T16:00:00Z'),
    },
    {
      cohortId,
      date: new Date('2025-01-15T10:00:00Z'),
      topic: 'Closing Techniques',
      startTime: new Date('2025-01-15T10:00:00Z'),
      endTime: new Date('2025-01-15T12:00:00Z'),
    },
  ];

  for (const session of sessions) {
    const created = await prisma.attendanceSession.create({
      data: session,
    });
    console.log(`Created session: ${created.topic} (ID: ${created.id})`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
