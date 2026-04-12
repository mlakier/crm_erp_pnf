const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10)

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin',
      password: passwordHash,
      role: 'admin',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: passwordHash,
      role: 'admin',
    },
  })

  const departmentSeeds = [
    { code: 'FIN', name: 'Finance', description: 'Accounting, AP, AR, and treasury operations.' },
    { code: 'HR', name: 'Human Resources', description: 'Talent acquisition, payroll, and employee operations.' },
    { code: 'OPS', name: 'Operations', description: 'Core operations, fulfillment, and process execution.' },
    { code: 'SALES', name: 'Sales', description: 'Pipeline management and revenue generation.' },
  ]

  for (const department of departmentSeeds) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: {
        name: department.name,
        description: department.description,
        active: true,
      },
      create: {
        code: department.code,
        name: department.name,
        description: department.description,
        active: true,
      },
    })
  }

  console.log('Seed completed: admin@example.com / Admin123! and default departments')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })