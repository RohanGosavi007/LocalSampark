import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, lat, lng } = body;

    if (!orderId || !lat || !lng) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Send Realtime Broadcast
    const channel = supabase.channel('delivery_tracking');
    
    await channel.send({
      type: 'broadcast',
      event: 'location_update',
      payload: { orderId, lat, lng, timestamp: new Date().toISOString() },
    });

    return NextResponse.json({ success: true, message: 'Location broadcasted' });
  } catch (error) {
    console.error('Broadcast Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to broadcast location' },
      { status: 500 }
    );
  }
}
