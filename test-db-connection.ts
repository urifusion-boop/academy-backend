import { prisma } from './src/lib/prisma';

async function main() {
  console.log('Attempting to connect to the database...');
  try {
    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`Connection successful! User count: ${userCount}`);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
