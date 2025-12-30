import { prisma } from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { profile: true },
  });

  console.log('--- Students ---');
  for (const user of users) {
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Student Profile: ${user.profile ? 'EXISTS' : 'MISSING'}`);
    if (user.profile) {
      console.log(`Student Profile ID: ${user.profile.id}`);
      console.log(`Cohort ID: ${user.profile.cohortId}`);
    }
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
