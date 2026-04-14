const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  const e = await prisma.entity.findFirst({ orderBy: { code: 'asc' } })
  if (!e) {
    console.log('NO_ENTITY')
    await prisma.$disconnect()
    return
  }

  const res = await fetch(`http://localhost:3003/api/entities?id=${encodeURIComponent(e.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: e.code, name: e.name }),
  })

  console.log('STATUS', res.status)
  console.log(await res.text())
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
