import { prisma } from './src/lib/prisma';

async function main() {
  const count = await prisma.attendanceSession.count();
  console.log(`Total Attendance Sessions: ${count}`);

  const sessions = await prisma.attendanceSession.findMany();
  console.log('Sessions:', sessions);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
