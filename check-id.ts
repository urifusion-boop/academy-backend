import { prisma } from './src/lib/prisma';

async function main() {
  const id = 'b2dd29f7-a298-43ff-96f9-429aac8c32a7';

  console.log(`Checking ID: ${id}`);

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (assignment) {
    console.log('Found ASSIGNMENT with this ID:', assignment);
  } else {
    console.log('Not an Assignment ID.');
  }

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (submission) {
    console.log('Found SUBMISSION with this ID:', submission);
  } else {
    console.log('Not a Submission ID.');
  }

  // Also check if there are any submissions for this assignment if it is an assignment ID
  if (assignment) {
    const submissions = await prisma.submission.findMany({ where: { assignmentId: id } });
    console.log('Submissions for this assignment:', submissions);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
