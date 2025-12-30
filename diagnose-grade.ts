import { prisma } from './src/lib/prisma';

async function main() {
  // IDs from your request and previous context
  const idFromUrl = '8eb2f6b4-757a-4191-ab9b-66d989f2c389'; // This is actually the Submission ID
  const correctAssignmentId = 'b2dd29f7-a298-43ff-96f9-429aac8c32a7';
  const correctStudentId = 'b48db9d3-b971-4c8a-8daa-b3a42bbf6c5c';

  console.log('--- Diagnosis ---');
  
  // 1. Check if the ID in URL exists as an Assignment
  const asAssignment = await prisma.assignment.findUnique({ where: { id: idFromUrl } });
  console.log(`Is '${idFromUrl}' an Assignment? ${asAssignment ? 'YES' : 'NO'}`);
  
  // 2. Check if it exists as a Submission
  const asSubmission = await prisma.submission.findUnique({ where: { id: idFromUrl } });
  console.log(`Is '${idFromUrl}' a Submission? ${asSubmission ? 'YES' : 'NO'}`);

  console.log('\n--- Correct Data ---');
  
  // 3. Verify the correct Assignment ID
  const realAssignment = await prisma.assignment.findUnique({ where: { id: correctAssignmentId } });
  console.log(`Correct Assignment ID '${correctAssignmentId}' exists? ${realAssignment ? 'YES' : 'NO'}`);

  // 4. Verify the Student ID
  const student = await prisma.studentProfile.findUnique({ where: { id: correctStudentId } });
  console.log(`Student ID '${correctStudentId}' exists? ${student ? 'YES' : 'NO'}`);

  if (realAssignment && student) {
    console.log('\nSUCCESS: You have all the data needed to make the request correctly.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
