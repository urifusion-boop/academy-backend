import { prisma } from './src/lib/prisma';

async function main() {
  const cohortId = '2e079bd2-9c7f-4b9d-bab8-2a337e582e5d';

  console.log('Checking cohort...');
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: { _count: { select: { assignments: true } } },
  });
  console.log('Cohort:', cohort);

  console.log('Checking all assignments...');
  const allAssignments = await prisma.assignment.findMany();
  console.log('Total assignments:', allAssignments.length);
  console.log('Assignments:', allAssignments);

  console.log('Checking assignments for cohort...');
  const assignments = await prisma.assignment.findMany({
    where: { cohortId },
  });
  console.log('Assignments for cohort:', assignments);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
