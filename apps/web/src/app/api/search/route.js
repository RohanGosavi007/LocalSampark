import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, shops: [], products: [] });
    }

    // Search shops by name or category
    const shops = await prisma.shop.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } }
        ],
        status: 'ACTIVE'
      },
      take: 5
    });

    // Search products by name
    const products = await prisma.product.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true
      },
      include: {
        shop: true
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      results: {
        shops,
        products
      }
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}
