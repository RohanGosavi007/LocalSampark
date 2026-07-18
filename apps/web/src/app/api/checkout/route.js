import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error during checkout proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Checkout failed: ' + error.message },
      { status: 500 }
    );
  }
}
