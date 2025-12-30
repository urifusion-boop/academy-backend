import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcrypt'

async function main() {
  const adminEmail = 'admin@uri.academy'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hash = await bcrypt.hash('AdminPass123!', 12)
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        role: 'ADMIN',
        name: 'Admin'
      }
    })
  }
}

main().finally(async () => {
  await prisma.$disconnect()
})
