'use server';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

interface InvitePayload {
  email?: string;
  password?: string;
  clientId?: string;
  clientName?: string;
  gameId?: string;
  gameName?: string;
  sendEmail?: boolean;
  skipUserUpdate?: boolean;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://spinpal.app';

export async function POST(request: Request) {
  try {
    const payload: InvitePayload = await request.json();
    const {
      email,
      password,
      clientId,
      clientName,
      gameId,
      gameName,
      sendEmail = true,
      skipUserUpdate = false,
    } = payload;

    if (!email || !gameId) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (email o gameId).' },
        { status: 400 },
      );
    }

    if ((!skipUserUpdate || sendEmail) && (!password || password.length < 8)) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 422 },
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
      decoded?.email === 'grupomanso@gmail.com' ||
      decoded?.admin === true ||
      decoded?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Permisos insuficientes.' }, { status: 403 });
    }

    const adminDb = await getAdminDb();

    let resolvedClientId = clientId || null;
    if (!resolvedClientId) {
      try {
        const gameSnap = await adminDb.collection('games').doc(gameId).get();
        if (gameSnap.exists) {
          resolvedClientId = (gameSnap.data() as any)?.clientId || null;
        }
      } catch (gameError) {
        console.warn('No se pudo leer el juego para obtener clientId:', gameError);
      }
    }

    let updatedUser = false;
    if (!skipUserUpdate) {
      let userRecord = await adminAuth
        .getUserByEmail(email)
        .catch(async (err: any) => {
          if (err.code === 'auth/user-not-found') {
            return adminAuth.createUser({
              email,
              password: password!,
              displayName: clientName || gameName || undefined,
            });
          }
          throw err;
        });

      await adminAuth.updateUser(userRecord.uid, {
        password: password!,
        displayName: clientName || gameName || undefined,
      });
      userRecord = await adminAuth.getUser(userRecord.uid);

      const previousClaims = (userRecord.customClaims || {}) as Record<string, any>;
      const allowedGameIds = new Set<string>(
        Array.isArray(previousClaims.allowedGameIds)
          ? (previousClaims.allowedGameIds as string[])
          : [],
      );
      allowedGameIds.add(gameId);

      const claimsToAssign = {
        ...previousClaims,
        role: previousClaims.role || 'client',
        allowedGameIds: Array.from(allowedGameIds),
        ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
      };

      await adminAuth.setCustomUserClaims(userRecord.uid, claimsToAssign);
      updatedUser = true;
    }

    const loginUrl = `${SITE_URL}/client/login`;
    const subject = `Acceso a Spinpal ${gameName ? `- ${gameName}` : ''}`.trim();
    const emailHtml = `
      <p>Hola ${clientName || ''}!</p>
      <p>Ya tienes acceso al panel de clientes de Spinpal.</p>
      <p><strong>Usuario:</strong> ${email}<br/>
      <strong>Contraseña:</strong> ${password}</p>
      <p>Puedes iniciar sesión desde <a href="${loginUrl}" target="_blank">${loginUrl}</a>.</p>
      <p>Te recomendamos cambiar la contraseña desde el panel o utilizar el enlace "¿Olvidaste tu contraseña?" si deseas actualizarla.</p>
      <p>— Equipo Spinpal</p>
    `;

    let emailStatus: 'sent' | 'skipped' | 'error' = 'skipped';
    let emailError: string | undefined;

    if (sendEmail) {
      if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject,
            html: emailHtml,
          });

          if (result.error) {
            emailStatus = 'error';
            emailError = result.error.message;
          } else {
            emailStatus = 'sent';
          }
        } catch (emailSendError: any) {
          emailStatus = 'error';
          emailError =
            emailSendError?.message ||
            'No se pudo enviar el correo automáticamente.';
          console.error('No se pudo enviar el correo con Resend:', emailSendError);
        }
      } else {
        emailError = 'La integración con Resend no está configurada.';
      }
    }

    if (sendEmail) {
      try {
        await adminDb.collection('outbound_emails').add({
          to: email,
          gameId,
          ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
          type: 'Client Invite',
          status: emailStatus,
          error: emailError || null,
          message: {
            subject,
            html: emailHtml,
          },
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (logError) {
        console.warn('No se pudo registrar el log de email:', logError);
      }
    }

    return NextResponse.json({
      ok: true,
      emailStatus,
      emailError,
      updatedUser,
    });
  } catch (error: any) {
    console.error('Error invitando cliente:', error);
    return NextResponse.json(
      { error: error?.message || 'Error desconocido.' },
      { status: 500 },
    );
  }
}
