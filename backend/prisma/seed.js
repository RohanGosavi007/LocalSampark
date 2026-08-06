// ═══════════════════════════════════════════════════════════════════════
// Master Seed Orchestrator — Category-Native Seeding Engine
// ═══════════════════════════════════════════════════════════════════════
// Seeds 66 Categories, 66 Shops (1 per category), 10 Products per PRODUCT/HYBRID shop,
// 7-day rolling appointment slots per APPOINTMENT/HYBRID shop, Pune region, and test users.
// ═══════════════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { getAllCategories } = require('./seeders/category-type-map');
const { generateShopAddress, generateDeliveryAddress } = require('./seeders/address-generator');
const { generateProductsForCategory } = require('./seeders/product-generator');
const { generateSlotsForCategory } = require('./seeders/slot-generator');
const { generatePersonName, generatePunePhone, getRandomLocality, pickRandom } = require('./seeders/pune-data');

async function main() {
  console.log('🌱 Starting Super-App Master Seeding Engine...');

  // 1. Clear existing database records
  console.log('🗑️ Clearing existing database records...');
  await prisma.auditLog.deleteMany({});
  await prisma.deliveryRoute.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.serviceSlot.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.shop.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.region.deleteMany({});
  console.log('✅ Cleared previous records.');

  // 2. Seed Pune Region (Pilot)
  console.log('📍 Seeding Pune Region...');
  const region = await prisma.region.create({
    data: {
      name: 'Dhanori-Kothrud Pilot',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      latitude: 18.5913,
      longitude: 73.8987,
      radiusKm: 15.0,
      isActive: true,
    },
  });
  console.log(`✅ Region created: ${region.name} (${region.id})`);

  // 3. Seed Core Users (Customer, Merchant, Runner, Admin)
  console.log('👥 Seeding System Users...');
  const adminUser = await prisma.user.create({
    data: {
      phone: '+919999900000',
      name: 'System Admin',
      email: 'admin@localsampark.in',
      role: 'ADMIN',
      regionId: region.id,
      isVerified: true,
      isActive: true,
    },
  });

  const merchantUser = await prisma.user.create({
    data: {
      phone: '+919876543210',
      name: 'Rajesh Patil (Shop Owner)',
      email: 'merchant@localsampark.in',
      role: 'MERCHANT',
      regionId: region.id,
      isVerified: true,
      isActive: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      phone: '+919123456789',
      name: 'Priya Kulkarni (Investor Demo User)',
      email: 'customer@localsampark.in',
      role: 'CUSTOMER',
      regionId: region.id,
      isVerified: true,
      isActive: true,
    },
  });

  const runnerUser = await prisma.user.create({
    data: {
      phone: '+919555544444',
      name: 'Vikram Shinde (Delivery Fleet)',
      email: 'runner@localsampark.in',
      role: 'RUNNER',
      regionId: region.id,
      isVerified: true,
      isActive: true,
    },
  });

  // Seed Customer Address
  const customerAddr = generateDeliveryAddress();
  await prisma.address.create({
    data: {
      userId: customerUser.id,
      tag: 'Home',
      line1: customerAddr.line1,
      line2: customerAddr.line2,
      landmark: customerAddr.landmark,
      locality: customerAddr.locality,
      city: customerAddr.city,
      state: customerAddr.state,
      pincode: customerAddr.pincode,
      latitude: customerAddr.latitude,
      longitude: customerAddr.longitude,
      isDefault: true,
    },
  });
  console.log('✅ Users & Addresses seeded.');

  // 4. Seed All 66 Categories
  console.log('📁 Seeding 66 Shop Categories...');
  const categoriesList = getAllCategories();
  const createdCategories = {};

  for (const catData of categoriesList) {
    const cat = await prisma.category.create({
      data: {
        name: catData.name,
        slug: catData.slug,
        categoryType: catData.categoryType,
        iconUrl: catData.iconUrl,
        displayOrder: catData.displayOrder,
        description: `Hyperlocal super-app category for ${catData.name}`,
        isActive: true,
      },
    });
    createdCategories[catData.slug] = cat;
  }
  console.log(`✅ ${Object.keys(createdCategories).length} Categories created.`);

  // 5. Seed 66 Shops (1 per category) with Products & Service Slots
  console.log('🏪 Seeding 66 Category-Native Shops, Products & Appointment Slots...');
  let totalProducts = 0;
  let totalSlots = 0;

  for (const catData of categoriesList) {
    const category = createdCategories[catData.slug];
    const locality = getRandomLocality();
    const address = generateShopAddress(locality);
    const ownerName = generatePersonName();

    const shopName = `${ownerName.split(' ')[1]} ${catData.name.split(' ')[0]} Store`;
    const shopSlug = `${shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${locality.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        slug: shopSlug,
        description: `Best ${catData.name} service in ${locality.name}, Pune. Fast delivery & verified service.`,
        categoryId: category.id,
        categoryType: catData.categoryType,
        ownerId: merchantUser.id,
        regionId: region.id,
        status: 'ACTIVE',
        phoneNumber: generatePunePhone(),
        whatsappNumber: generatePunePhone(),
        email: `contact.${shopSlug}@localsampark.in`,
        addressLine1: address.line1,
        addressLine2: address.line2,
        landmark: address.landmark,
        locality: address.locality,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        latitude: address.latitude,
        longitude: address.longitude,
        coverageRadiusKm: 5.0,
        logoUrl: `https://cdn.localsampark.in/shops/${catData.slug.toLowerCase()}_logo.webp`,
        bannerUrl: `https://cdn.localsampark.in/shops/${catData.slug.toLowerCase()}_banner.webp`,
        rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)),
        totalRatings: 15 + Math.floor(Math.random() * 185),
        isVerified: true,
        isFeatured: Math.random() > 0.7,
        isPremium: Math.random() > 0.8,
        deliveryAvailable: true,
        pickupAvailable: true,
        estimatedDeliveryTime: '30-45 mins',
        operatingHours: JSON.stringify({
          MONDAY: { isOpen: true, open: '09:00', close: '21:00' },
          TUESDAY: { isOpen: true, open: '09:00', close: '21:00' },
          WEDNESDAY: { isOpen: true, open: '09:00', close: '21:00' },
          THURSDAY: { isOpen: true, open: '09:00', close: '21:00' },
          FRIDAY: { isOpen: true, open: '09:00', close: '21:00' },
          SATURDAY: { isOpen: true, open: '09:00', close: '21:00' },
          SUNDAY: { isOpen: true, open: '10:00', close: '18:00' },
        }),
      },
    });

    // 5a. Seed Products for PRODUCT & HYBRID shops
    if (['PRODUCT', 'HYBRID'].includes(catData.categoryType)) {
      const productsData = generateProductsForCategory(catData.slug, shop.id);
      await prisma.product.createMany({
        data: productsData,
      });
      totalProducts += productsData.length;
    }

    // 5b. Seed Service Slots for APPOINTMENT & HYBRID shops
    if (['APPOINTMENT', 'HYBRID'].includes(catData.categoryType)) {
      const slotsData = generateSlotsForCategory(catData.slug, shop.id);
      if (slotsData.length > 0) {
        await prisma.serviceSlot.createMany({
          data: slotsData,
        });
        totalSlots += slotsData.length;
      }
    }
  }

  console.log(`✅ Created 66 Shops.`);
  console.log(`✅ Created ${totalProducts} realistic category-native Products.`);
  console.log(`✅ Created ${totalSlots} 7-day rolling Appointment Slots.`);

  // 6. Seed Initial Demo Order and Audit Trail for Investor Demo
  console.log('📦 Seeding Demo Order & Audit Logs...');
  const firstProductShop = await prisma.shop.findFirst({
    where: { categoryType: 'PRODUCT' },
    include: { products: true },
  });

  if (firstProductShop && firstProductShop.products.length > 0) {
    const prod = firstProductShop.products[0];
    const demoOrder = await prisma.order.create({
      data: {
        orderNumber: 'LS-20260805-0001',
        userId: customerUser.id,
        shopId: firstProductShop.id,
        status: 'PENDING',
        subtotalPaise: prod.pricePaise * 2,
        deliveryFeePaise: 3000,
        platformFeePaise: 500,
        totalAmountPaise: prod.pricePaise * 2 + 3500,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
        fulfillmentMethod: 'DELIVERY',
        items: {
          create: [
            {
              productId: prod.id,
              productName: prod.name,
              quantity: 2,
              pricePaise: prod.pricePaise,
              totalPaise: prod.pricePaise * 2,
            },
          ],
        },
        deliveryRoute: {
          create: {
            runnerId: runnerUser.id,
            status: 'PENDING',
            pickupLatitude: firstProductShop.latitude,
            pickupLongitude: firstProductShop.longitude,
            dropLatitude: customerAddr.latitude,
            dropLongitude: customerAddr.longitude,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: demoOrder.id,
        action: 'CREATE',
        newValue: JSON.stringify({ status: 'PENDING', totalAmountPaise: demoOrder.totalAmountPaise }),
        performedBy: customerUser.id,
      },
    });
  }

  console.log('🎉 Super-App Seeding Engine completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
