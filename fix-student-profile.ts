import { prisma } from './src/lib/prisma';
import crypto from 'crypto';

async function main() {
  const email = 'student@example.com';
  const cohortId = '2e079bd2-9c7f-4b9d-bab8-2a337e582e5d';

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found!');
    return;
  }

  const profile = await prisma.studentProfile.create({
    data: {
      userId: user.id,
      cohortId: cohortId,
      studentIdCode: 'ST-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
  });

  console.log('Created student profile:', profile);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
