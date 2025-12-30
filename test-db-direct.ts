import { PrismaClient } from '@prisma/client';

async function main() {
  // Constructing the direct connection string based on Project ID
  // Project ID: ajpsbldwhmqltvuconwk
  // Password: uriacademy2316
  const directUrl = 'postgresql://postgres.ajpsbldwhmqltvuconwk:uriacademy2316@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'; 
  // Wait, I should try the standard db.project.supabase.co first
  const standardDirectUrl = 'postgresql://postgres.ajpsbldwhmqltvuconwk:uriacademy2316@db.ajpsbldwhmqltvuconwk.supabase.co:5432/postgres';

  console.log('Testing Standard Direct URL:', standardDirectUrl);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: standardDirectUrl,
      },
    },
  });

  try {
    const userCount = await prisma.user.count();
    console.log(`Connection successful via Direct URL! User count: ${userCount}`);
  } catch (error) {
    console.error('Connection failed via Direct URL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
