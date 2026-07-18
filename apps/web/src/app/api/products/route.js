import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const category = searchParams.get('category');
    
    let whereClause = {
      isActive: true
    };

    if (shopId) whereClause.shopId = shopId;
    if (category) whereClause.category = category;

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newProduct = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        stock: parseInt(body.stock),
        unit: body.unit,
        category: body.category,
        images: body.images || [],
        shopId: body.shopId
      }
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
