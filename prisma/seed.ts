import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed credit packages
  const creditPackages = [
    {
      name: 'Starter Pack',
      credits: 50,
      priceCents: 499, // $4.99
      description: 'Perfect for trying out Paperbacks.AI',
      popular: false,
    },
    {
      name: 'Creator Pack',
      credits: 200,
      priceCents: 1499, // $14.99
      description: 'Best value for regular users',
      popular: true,
    },
    {
      name: 'Pro Pack',
      credits: 500,
      priceCents: 2999, // $29.99
      description: 'For professional cover designers',
      popular: false,
    },
    {
      name: 'Enterprise Pack',
      credits: 1000,
      priceCents: 4999, // $49.99
      description: 'Bulk credits for high-volume users',
      popular: false,
    },
  ];

  // First, check if packages already exist
  const existingPackages = await prisma.creditPackage.findMany();
  
  if (existingPackages.length === 0) {
    // Create all packages in one go
    await prisma.creditPackage.createMany({
      data: creditPackages,
    });
  } else {
    // Update existing packages or create new ones
    for (const pkg of creditPackages) {
      const existing = await prisma.creditPackage.findFirst({
        where: { name: pkg.name },
      });
      
      if (existing) {
        await prisma.creditPackage.update({
          where: { id: existing.id },
          data: pkg,
        });
      } else {
        await prisma.creditPackage.create({
          data: pkg,
        });
      }
    }
  }

  console.log('Credit packages seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });