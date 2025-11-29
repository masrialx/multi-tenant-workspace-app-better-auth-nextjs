const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function seed() {
  console.log("Starting seed...")

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10)

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: hashedPassword,
      emailVerified: true,
    },
  })

  console.log("Created user:", user.email)

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Demo Organization",
      slug: "demo-org",
      ownerId: user.id,
      members: {
        create: [
          {
            userId: user.id,
            role: "owner",
          },
        ],
      },
    },
  })

  console.log("Created organization:", org.name)

  // Create sample outlines
  const outlines = await Promise.all([
    prisma.outline.create({
      data: {
        organizationId: org.id,
        header: "Project Overview",
        sectionType: "Table of Contents",
        status: "Completed",
        target: 100,
        limit: 100,
        reviewer: "Assim",
      },
    }),
    prisma.outline.create({
      data: {
        organizationId: org.id,
        header: "Technical Architecture",
        sectionType: "Technical Approach",
        status: "In-Progress",
        target: 80,
        limit: 100,
        reviewer: "Bini",
      },
    }),
    prisma.outline.create({
      data: {
        organizationId: org.id,
        header: "Design System",
        sectionType: "Design",
        status: "Pending",
        target: 0,
        limit: 50,
        reviewer: "Mami",
      },
    }),
  ])

  console.log("Created sample outlines:", outlines.length)
  console.log("\nSeed completed successfully!")
  console.log("\nLogin credentials:")
  console.log("Email: admin@example.com")
  console.log("Password: admin123")
}

seed()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
