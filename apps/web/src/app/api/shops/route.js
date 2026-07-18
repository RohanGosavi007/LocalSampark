import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    let whereClause = {
      status: 'ACTIVE'
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // In a real production app with PostGIS, you'd use a raw query for distance.
    // For now, we'll fetch shops and we could calculate distance manually if needed.
    const shops = await prisma.shop.findMany({
      where: whereClause,
      include: {
        products: {
          take: 3 // Include up to 3 preview products
        }
      },
      orderBy: {
        rating: 'desc'
      },
      take: 20
    });

    return NextResponse.json({
      success: true,
      shops,
      count: shops.length
    });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newShop = await prisma.shop.create({
      data: {
        name: body.name,
        category: body.category,
        description: body.description,
        address: body.address,
        lat: body.lat,
        lng: body.lng,
        bannerImage: body.bannerImage,
        logoImage: body.logoImage
      }
    });

    return NextResponse.json({ success: true, shop: newShop });
  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create shop' },
      { status: 500 }
    );
  }
}
