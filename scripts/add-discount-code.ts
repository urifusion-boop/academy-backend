import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const dc = await prisma.discountCode.upsert({
    where: { code: 'SALESACADEMY100' },
    update: { discountPercentage: 100, isActive: true },
    create: { code: 'SALESACADEMY100', discountPercentage: 100, isActive: true },
  });
  console.log('Done:', dc);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
