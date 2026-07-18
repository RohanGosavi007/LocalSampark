import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        products: true
      }
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    // Mocking the structure expected by the frontend for compatibility
    return NextResponse.json({
      ...shop,
      category_details: {
        business_model: 'product'
      }
    });
  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shop' },
      { status: 500 }
    );
  }
}
