// One-time script: Seed OTC/P2P status lists into ListOption table
// Run with: npx ts-node scripts/seed-otc-p2p-statuses.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const OTC_STATUS = [
  'draft',
  'pending approval',
  'approved',
  'rejected',
  'fulfilled',
  'closed',
]

const P2P_STATUS = [
  'draft',
  'pending approval',
  'approved',
  'rejected',
  'billed',
  'paid',
  'closed',
]

function formatListId(code: string, sequence: number) {
  return `LIST-${code}-${String(sequence).padStart(4, '0')}`
}

async function seed() {
  // OTC
  await prisma.listOption.deleteMany({ where: { key: 'OTC-STATUS' } })
  await prisma.listOption.createMany({
    data: OTC_STATUS.map((value, idx) => ({
      key: 'OTC-STATUS',
      listId: formatListId('OTC-STATUS', idx + 1),
      value,
      label: value,
      sortOrder: idx,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  })
  // P2P
  await prisma.listOption.deleteMany({ where: { key: 'P2P-STATUS' } })
  await prisma.listOption.createMany({
    data: P2P_STATUS.map((value, idx) => ({
      key: 'P2P-STATUS',
      listId: formatListId('P2P-STATUS', idx + 1),
      value,
      label: value,
      sortOrder: idx,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  })
  console.log('Seeded OTC and P2P status lists.')
}

seed().then(() => prisma.$disconnect())
