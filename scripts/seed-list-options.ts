// One-time script: Seed ListOption table with default values
// Run with: npx ts-node scripts/seed-list-options.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULTS = [
  {
    key: 'CUST-IND',
    code: 'CUST-IND',
    values: ['Technology', 'Manufacturing', 'Healthcare', 'Financial Services', 'Retail'],
  },
  {
    key: 'ITEM-TYPE',
    code: 'ITEM-TYPE',
    values: ['service', 'product', 'expense'],
  },
  {
    key: 'LEAD-SRC',
    code: 'LEAD-SRC',
    values: ['Website', 'Referral', 'Trade Show', 'Inbound Demo', 'Webinar'],
  },
  {
    key: 'LEAD-RAT',
    code: 'LEAD-RAT',
    values: ['hot', 'warm', 'cold'],
  },
  {
    key: 'OPP-STAGE',
    code: 'OPP-STAGE',
    values: ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'],
  },
]

function formatListId(code: string, sequence: number) {
  return `LIST-${code}-${String(sequence).padStart(4, '0')}`
}

async function seed() {
  for (const def of DEFAULTS) {
    const data = def.values.map((value, idx) => ({
      key: def.key,
      listId: formatListId(def.code, idx + 1),
      value,
      label: value,
      sortOrder: idx,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    await prisma.listOption.createMany({ data })
    console.log(`Seeded ${def.values.length} rows for ${def.key}`)
  }
}

seed().then(() => prisma.$disconnect())
