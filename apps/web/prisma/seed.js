const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase Database...');

  // Create mock user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: 'Abhi',
      email: 'test@example.com',
      phone: '9876543210',
      role: 'CUSTOMER',
    },
  });

  console.log('Created User:', user.name);

  // Create a Grocery Shop
  const groceryShop = await prisma.shop.create({
    data: {
      name: 'Sharma Grocery & Dairy',
      category: 'grocery',
      description: 'Fresh vegetables, dairy products, and daily essentials.',
      rating: 4.8,
      lat: 18.5204,
      lng: 73.8567,
      address: 'Kalyani Nagar, Pune',
      bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
      products: {
        create: [
          {
            name: 'Fresh Milk (Amul Taaza)',
            description: '1 Liter packet',
            price: 54,
            stock: 100,
            unit: 'L',
            category: 'dairy',
            images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=500']
          },
          {
            name: 'Farm Fresh Tomatoes',
            description: 'Organic local tomatoes',
            price: 45,
            stock: 50,
            unit: 'kg',
            category: 'vegetables',
            images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=500']
          }
        ]
      }
    }
  });

  console.log('Created Shop:', groceryShop.name);

  // Create a Pharmacy
  const pharmacyShop = await prisma.shop.create({
    data: {
      name: 'Apollo Pharmacy Plus',
      category: 'pharmacy',
      description: '24/7 medicines and healthcare products',
      rating: 4.5,
      lat: 18.5214,
      lng: 73.8557,
      address: 'Viman Nagar, Pune',
      bannerImage: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=1000',
      products: {
        create: [
          {
            name: 'Dolo 650',
            description: 'Strip of 15 tablets',
            price: 30,
            stock: 200,
            unit: 'strip',
            category: 'medicines',
            images: ['https://images.unsplash.com/photo-1584308666744-24d5e45a2717?auto=format&fit=crop&q=80&w=500']
          }
        ]
      }
    }
  });
  
  console.log('Created Shop:', pharmacyShop.name);
  console.log('Database Seeding Completed Successfully! 🚀');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
