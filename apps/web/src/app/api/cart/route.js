import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const sessionId = searchParams.get('sessionId') || '';

    if (!userId && !sessionId) {
      return NextResponse.json({ success: false, error: 'User ID or Session ID is required' }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/cart?userId=${userId}&sessionId=${sessionId}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching cart proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BACKEND_URL}/api/v1/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating cart proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}
