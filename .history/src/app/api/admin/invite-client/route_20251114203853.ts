import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';

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

    const auth = getAdminAuth();
    const db = getAdminDb();

    let updatedUser = false;
    if (!skipUserUpdate) {
      let userRecord = await auth
        .getUserByEmail(email)
        .catch(async (err: any) => {
          if (err.code === 'auth/user-not-found') {
            return auth.createUser({
              email,
              password: password!,
              displayName: clientName || gameName || undefined,
            });
          }
          throw err;
        });

      await auth.updateUser(userRecord.uid, {
        password: password!,
        displayName: clientName || gameName || undefined,
      });
      userRecord = await auth.getUser(userRecord.uid);

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
        ...(clientId ? { clientId } : {}),
      };

      await auth.setCustomUserClaims(userRecord.uid, claimsToAssign);
      updatedUser = true;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://spinpal.app';
    const loginUrl = `${siteUrl}/client/login`;
    const subject = `Acceso a Spinpal ${
      gameName ? `- ${gameName}` : ''
    }`.trim();

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

    if (sendEmail && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
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
    } else if (sendEmail) {
      emailError = 'La integración con Resend no está configurada.';
    }

    if (sendEmail) {
      await db.collection('outbound_emails').add({
        to: email,
        gameId,
        ...(clientId ? { clientId } : {}),
        type: 'Client Invite',
        status: emailStatus,
        error: emailError || null,
        message: {
          subject,
          html: emailHtml,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
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
      { error: error.message || 'Error desconocido.' },
      { status: 500 },
    );
  }
}
