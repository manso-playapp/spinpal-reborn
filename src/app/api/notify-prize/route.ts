import { NextRequest, NextResponse } from 'next/server';
import { sendPrizeNotification } from '@/ai/flows/prize-notification-flow';

export async function POST(req: NextRequest) {
  try {
    const { gameId, customerId, prizeName } = await req.json();
    if (!gameId || !customerId || !prizeName) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros.' }, { status: 400 });
    }
    const result = await sendPrizeNotification({ gameId, customerId, prizeName });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error inesperado.' }, { status: 500 });
  }
}

