'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')) || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toLowerCase().trim();
    const gameId = (body?.gameId || '').trim();

    if (!email || !gameId) {
      return NextResponse.json({ error: 'Email y gameId son obligatorios.' }, { status: 400 });
    }

    if (!SITE_URL) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SITE_URL no está configurado.' },
        { status: 500 },
      );
    }

    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const adminAuth = await getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(sessionCookie, true);

    const isAdmin =
      decoded.email === 'grupomanso@gmail.com' ||
      decoded.admin === true ||
      decoded.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Permisos insuficientes.' }, { status: 403 });
    }

    let uid: string | null = null;
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        const newUser = await adminAuth.createUser({ email });
        uid = newUser.uid;
      } else {
        throw error;
      }
    }

    if (!uid) {
      throw new Error('No se pudo obtener el UID del usuario.');
    }

    const adminDb = await getAdminDb();

    let clientId: string | null = null;
    try {
      const gameSnap = await adminDb.collection('games').doc(gameId).get();
      if (gameSnap.exists) {
        const data = gameSnap.data();
        clientId = (data as any)?.clientId || null;
      }
    } catch (gameError) {
      console.warn('No se pudo leer el juego para obtener clientId:', gameError);
    }

    const currentClaims = (await adminAuth.getUser(uid)).customClaims || {};
    const allowedGameIds = Array.isArray(currentClaims.allowedGameIds)
      ? Array.from(new Set([...currentClaims.allowedGameIds, gameId]))
      : [gameId];

    await adminAuth.setCustomUserClaims(uid, {
      ...currentClaims,
      clientId: clientId || currentClaims.clientId || `game:${gameId}`,
      allowedGameIds,
    });

    const actionCodeSettings = {
      url: `${SITE_URL}/client/complete?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    };
    const magicLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@playapp.mansoestudiocreativo.com',
          to: email,
          subject: 'Tu acceso al Panel de Playapp',
          html: `
            <h2>¡Hola!</h2>
            <p>Has sido invitado a gestionar tus campañas en Playapp. Haz clic en el siguiente enlace para acceder:</p>
            <p><a href="${magicLink}" style="font-weight:bold;">Acceder a Playapp</a></p>
            <p>Este enlace es válido por 60 minutos y puede utilizarse una sola vez. Si no solicitaste este acceso, ignora este correo.</p>
          `,
        });
      } catch (emailError) {
        console.error('No se pudo enviar el correo con Resend:', emailError);
      }
    }

    try {
      await adminDb.collection('outbound_emails').add({
        to: email,
        gameId,
        clientId: clientId || undefined,
        type: 'Magic Link Access',
        status: resendApiKey ? 'sent' : 'generated',
        message: {
          subject: 'Acceso a Playapp',
          html: '<p>Se generó un enlace mágico de acceso para este cliente.</p>',
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.warn('No se pudo registrar el log de email:', logError);
    }

    return NextResponse.json({ success: true, magicLink });
  } catch (error: any) {
    console.error('Error en invite-client:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al invitar al cliente.' },
      { status: 500 },
    );
  }
}
