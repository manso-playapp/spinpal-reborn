
'use server';
/**
 * @fileOverview A flow for sending a test email via Resend.
 *
 * - sendTestEmail - A function that handles sending a single test email.
 * - TestEmailInput - The input type for the sendTestEmail function.
 * - TestEmailOutput - The return type for the sendTestEmail function.
 */

// import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const TestEmailInputSchema = z.object({
  email: z.string().email().describe('The email address to send the test to.'),
});
export type TestEmailInput = z.infer<typeof TestEmailInputSchema>;


const TestEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type TestEmailOutput = z.infer<typeof TestEmailOutputSchema>;


export async function sendTestEmail(
  input: TestEmailInput
): Promise<TestEmailOutput> {
  return sendTestEmailFlow(input);
}



export async function sendTestEmail(input: TestEmailInput): Promise<TestEmailOutput> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    const message = 'Resend API key is not configured in .env file.';
    console.error(message);
    return { success: false, message };
  }

  if (!db) {
    const message = 'Firestore (db) is not initialized. Check Firebase configuration in .env.';
    console.error(message);
    return {
      success: false,
      message: message,
    };
  }

  const resend = new Resend(resendApiKey);
  const fromAddress = 'noreply@playapp.mansoestudiocreativo.com'; 
  const subject = "Correo de Prueba desde SpinPal Reborn";
  const body = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h1 style="color: #333;">¡Conexión Exitosa!</h1>
      <p>Este es un correo de prueba generado desde la página de Conexiones de tu aplicación SpinPal.</p>
      <p>Si has recibido este mensaje, significa que:</p>
      <ul>
        <li>Tu API Key de Resend es <strong>correcta</strong>.</li>
        <li>La conexión con los servidores de Resend funciona.</li>
        <li>El envío desde <strong>${fromAddress}</strong> está operativo.</li>
      </ul>
      <p>¡Todo listo para enviar los correos de premios!</p>
      <hr>
      <p style="font-size: 0.8em; color: #777;">Este es un mensaje automático. Por favor, no respondas a este correo.</p>
    </div>
  `;

  const emailLogRef = collection(db, 'outbound_emails');
  let logData: any = {
    to: input.email,
    type: 'Test Email',
    message: { subject, html: body },
    createdAt: serverTimestamp(),
  };
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: input.email,
      subject: subject,
      html: body,
    });

    if (error) {
      throw new Error(error.message);
    }

    logData.status = 'sent';
    logData.resendId = data?.id;
    await addDoc(emailLogRef, logData);

    return {
      success: true,
      message: `Correo de prueba enviado exitosamente a ${input.email}.`,
    };

  } catch (e: any) {
    logData.status = 'failed';
    logData.error = e.message;
    await addDoc(emailLogRef, logData);
    console.error(`Failed to send test email to ${input.email}:`, e);
    return {
      success: false,
      message: `Error al enviar el correo: ${e.message}`,
    };
  }
}
