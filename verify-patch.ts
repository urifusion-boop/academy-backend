import { prisma } from './src/lib/prisma';

async function main() {
  const submissionId = '8eb2f6b4-757a-4191-ab9b-66d989f2c389';
  const newData = {
    contentURL: 'https://docs.google.com/updated',
    notes: 'My updated notes'
  };

  console.log(`Updating Submission ID: ${submissionId}`);

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: newData
  });

  console.log('Updated successfully:', updated);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
