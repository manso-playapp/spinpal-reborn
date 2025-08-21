import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/ai/flows/send-test-email-flow';

export async function POST(req: NextRequest) {
  try {
    const { email, clientId } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, message: 'Falta el email.' }, { status: 400 });
    }
    const result = await sendTestEmail({ email, clientId });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error inesperado.' }, { status: 500 });
  }
}
