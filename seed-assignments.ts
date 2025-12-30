import { prisma } from './src/lib/prisma';

async function main() {
  const cohortId = '2e079bd2-9c7f-4b9d-bab8-2a337e582e5d'; // The user's cohort

  console.log('Seeding assignments for cohort:', cohortId);

  const assignments = [
    {
      title: 'Sales Fundamentals',
      description: 'Read Chapter 1 and complete the quiz.',
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxScore: 100,
      cohortId,
    },
    {
      title: 'Cold Calling Practice',
      description: 'Record a 5-minute cold call simulation.',
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      maxScore: 50,
      cohortId,
    },
    {
      title: 'Final Project Proposal',
      description: 'Submit your proposal for the final sales pitch.',
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      maxScore: 20,
      cohortId,
    }
  ];

  for (const assignment of assignments) {
    await prisma.assignment.create({
      data: assignment
    });
    console.log(`Created assignment: ${assignment.title}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
