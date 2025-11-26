
'use server';
/**
 * @fileOverview A flow for handling prize notifications via Resend.
 *
 * - sendPrizeNotification - A function that handles the prize notification process.
 * - PrizeNotificationInput - The input type for the sendPrizeNotification function.
 * - PrizeNotificationOutput - The return type for the sendPrizeNotification function.
 */

import { z } from 'zod';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Resend } from 'resend';

// Helper to generate a random validation code
const generateValidationCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
        if (i > 0 && i % 3 === 0) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};


const PrizeNotificationInputSchema = z.object({
  gameId: z.string().describe('The ID of the game.'),
  customerId: z.string().describe('The ID of the customer who won.'),
  prizeName: z.string().describe('The name of the prize that was won.'),
  language: z.enum(['es','en','pt']).optional().default('es'),
});
export type PrizeNotificationInput = z.infer<typeof PrizeNotificationInputSchema>;


const PrizeNotificationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  validationCode: z.string().optional(),
});
export type PrizeNotificationOutput = z.infer<typeof PrizeNotificationOutputSchema>;


export async function sendPrizeNotification(
  input: PrizeNotificationInput
): Promise<PrizeNotificationOutput> {
  return prizeNotificationFlow(input);
}


const getCopy = (lang: 'es' | 'en' | 'pt') => {
    const map = {
        es: {
            customerSubject: (name: string, game: string) => `¡Felicidades, ${name}! ¡Has ganado en ${game}!`,
            customerTitle: (name: string) => `¡Felicidades, ${name}!`,
            customerPhrase: (prize: string) => `Has ganado un ${prize}.`,
            redeemText: 'Para canjear tu premio, presenta el siguiente código en nuestro local:',
            thanks: (game: string) => `Gracias por participar en el juego ${game}.`,
            autoMsg: 'Este es un mensaje automático. Por favor, no respondas a este correo.',
            clientSubject: (name: string, game: string) => `Notificación de premio: ${name} ha ganado en ${game}`,
            clientIntro: (game: string) => `Un participante ha ganado un premio en tu juego ${game}.`,
            winnerData: 'Datos del ganador:',
            labels: {
                name: 'Nombre', email: 'Email', phone: 'Teléfono', birthdate: 'Fecha de nacimiento', prize: 'Premio',
                notProvided: 'No proporcionado',
            },
            showCode: 'Código de validación para entregar el premio:',
        },
        en: {
            customerSubject: (name: string, game: string) => `Congratulations, ${name}! You won in ${game}!`,
            customerTitle: (name: string) => `Congrats, ${name}!`,
            customerPhrase: (prize: string) => `You won a ${prize}.`,
            redeemText: 'To claim your prize, show this code at our location:',
            thanks: (game: string) => `Thanks for playing ${game}.`,
            autoMsg: 'This is an automated message. Please do not reply.',
            clientSubject: (name: string, game: string) => `Prize notification: ${name} won in ${game}`,
            clientIntro: (game: string) => `A participant has won a prize in your game ${game}.`,
            winnerData: 'Winner details:',
            labels: {
                name: 'Name', email: 'Email', phone: 'Phone', birthdate: 'Birthdate', prize: 'Prize',
                notProvided: 'Not provided',
            },
            showCode: 'Validation code to deliver the prize:',
        },
        pt: {
            customerSubject: (name: string, game: string) => `Parabéns, ${name}! Você ganhou em ${game}!`,
            customerTitle: (name: string) => `Parabéns, ${name}!`,
            customerPhrase: (prize: string) => `Você ganhou um ${prize}.`,
            redeemText: 'Para resgatar seu prêmio, apresente este código em nosso local:',
            thanks: (game: string) => `Obrigado por jogar ${game}.`,
            autoMsg: 'Esta é uma mensagem automática. Por favor, não responda.',
            clientSubject: (name: string, game: string) => `Notificação de prêmio: ${name} ganhou em ${game}`,
            clientIntro: (game: string) => `Um participante ganhou um prêmio no seu jogo ${game}.`,
            winnerData: 'Dados do vencedor:',
            labels: {
                name: 'Nome', email: 'Email', phone: 'Telefone', birthdate: 'Data de nascimento', prize: 'Prêmio',
                notProvided: 'Não informado',
            },
            showCode: 'Código de validação para entregar o prêmio:',
        },
    } as const;
    return map[lang] || map.es;
};

// Template function for the customer email
const createCustomerEmail = (customerName: string, prizeName: string, validationCode: string, gameName: string, lang: 'es' | 'en' | 'pt') => {
    const copy = getCopy(lang);
    const subject = copy.customerSubject(customerName, gameName);
    const body = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
            <h1 style="color: #333; text-align: center;">${copy.customerTitle(customerName)}</h1>
            <p style="text-align: center; font-size: 1.1em;">${copy.customerPhrase(prizeName)}</p>
            <div style="background-color: #fff; border: 2px dashed #ccc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 1.5em; font-weight: bold; color: #2c3e50; margin: 0;">${prizeName}</p>
            </div>
            <p>${copy.redeemText}</p>
            <div style="text-align: center; background-color: #e0e0e0; padding: 15px; border-radius: 8px; font-size: 1.8em; font-weight: bold; letter-spacing: 3px; color: #333; margin: 20px 0;">
                ${validationCode}
            </div>
            <p>${copy.thanks(gameName)}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin-top: 20px;">
            <p style="font-size: 0.8em; color: #777; text-align: center;">${copy.autoMsg}</p>
        </div>
    `;
    return { subject, body };
};

// Template function for the client (admin) notification email
const createClientEmail = (
    customerName: string,
    prizeName: string,
    validationCode: string,
    gameName: string,
    customerEmail: string,
    customerPhone: string,
    customerBirthdate: string | undefined,
    lang: 'es' | 'en' | 'pt'
) => {
    const copy = getCopy(lang);
    const subject = copy.clientSubject(customerName, gameName);
    const body = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: auto;">
            <h1 style="color: #333;">${copy.clientSubject(customerName, gameName)}</h1>
            <p>${copy.clientIntro(gameName)}</p>
            <div style="margin: 20px 0; padding: 20px; background-color: #f8f8f8; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">${copy.winnerData}</h2>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>${copy.labels.name}:</strong> ${customerName}</li>
                    <li style="margin: 10px 0;"><strong>${copy.labels.email}:</strong> ${customerEmail}</li>
                    <li style="margin: 10px 0;"><strong>${copy.labels.phone}:</strong> ${customerPhone || copy.labels.notProvided}</li>
                    <li style="margin: 10px 0;"><strong>${copy.labels.birthdate}:</strong> ${customerBirthdate || copy.labels.notProvided}</li>
                    <li style="margin: 10px 0;"><strong>${copy.labels.prize}:</strong> ${prizeName}</li>
                </ul>
            </div>
            <p>${copy.showCode}</p>
            <div style="text-align: center; background-color: #f0f0f0; padding: 15px; border-radius: 8px; font-size: 1.6em; font-weight: bold; color: #333; margin: 20px 0;">
                ${validationCode}
            </div>
        </div>
    `;
    return { subject, body };
};


const prizeNotificationFlow = ai.defineFlow(
  {
    name: 'prizeNotificationFlow',
    inputSchema: PrizeNotificationInputSchema,
    outputSchema: PrizeNotificationOutputSchema,
  },
  async (input) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
        const message = 'Resend API key is not configured in .env file.';
        console.error(message);
        return {
            success: false,
            message: message,
        };
    }
    const fromAddress = 'noreply@playapp.mansoestudiocreativo.com'; 

    if (!db) {
        const message = 'Firestore (db) is not initialized. Check Firebase configuration in .env.';
        console.error(message);
        return {
            success: false,
            message: message,
        };
    }
    const resend = new Resend(resendApiKey);

    try {
        const gameRef = doc(db, 'games', input.gameId);
        const customerRef = doc(db, 'games', input.gameId, 'customers', input.customerId);

        const [gameSnap, customerSnap] = await Promise.all([
            getDoc(gameRef),
            getDoc(customerRef),
        ]);

        if (!gameSnap.exists()) {
            throw new Error(`Game not found with ID: ${input.gameId}`);
        }
        if (!customerSnap.exists()) {
            throw new Error(`Customer not found with ID: ${input.customerId} in game ${input.gameId}`);
        }

        const gameData = gameSnap.data();
        const customerData = customerSnap.data();
        const validationCode = generateValidationCode();
        const lang = (input.language as 'es' | 'en' | 'pt') || (gameData.language as 'es' | 'en' | 'pt') || 'es';
        
        const clientEmail = gameData.clientEmail;
        const customerEmail = customerData.email;

        if (!customerEmail) {
             const message = `Customer ${input.customerId} does not have an email address.`;
             console.warn(message);
             return { success: true, message: message }; // Success, but no email sent.
        }

        // 2. Construct emails using the language-specific templates
        const customerEmailContent = createCustomerEmail(
            customerData.name,
            input.prizeName,
            validationCode,
            gameData.name,
            lang
        );

        const clientEmailContent = clientEmail ? createClientEmail(
            customerData.name,
            input.prizeName,
            validationCode,
            gameData.name,
            customerData.email,
            customerData.phone || '',
            customerData.birthdate,
            lang
        ) : null;


        // 4. Send emails via Resend and log the results to Firestore
        const emailLogRef = collection(db, 'outbound_emails');
        const sendPromises = [];

        // Send and log customer email
        sendPromises.push((async () => {
            let logData: any = {
                to: customerEmail,
                gameId: input.gameId,
                customerId: input.customerId,
                // Only include clientId if present (undefined is not allowed)
                ...(gameData.clientId ? { clientId: gameData.clientId } : {}),
                // Optionally include clientEmail to aid filtering
                ...(gameData.clientEmail ? { clientEmail: gameData.clientEmail } : {}),
                prize: input.prizeName,
                validationCode: validationCode,
                message: {
                    subject: customerEmailContent.subject,
                    html: customerEmailContent.body,
                },
                createdAt: serverTimestamp(),
            };
            try {
                const { data, error } = await resend.emails.send({
                    from: fromAddress,
                    to: customerEmail,
                    subject: customerEmailContent.subject,
                    html: customerEmailContent.body,
                });
                if (error) throw error;
                logData.status = 'sent';
                logData.resendId = data?.id;
            } catch (e: any) {
                logData.status = 'failed';
                logData.error = e.message;
                console.error(`Failed to send email to customer ${customerEmail}:`, e);
            }
            await addDoc(emailLogRef, logData);
        })());

        // Send and log client email if applicable
        if (clientEmail && clientEmailContent) {
            sendPromises.push((async () => {
                let logData: any = {
                    to: clientEmail,
                    gameId: input.gameId,
                    customerId: input.customerId,
                    ...(gameData.clientId ? { clientId: gameData.clientId } : {}),
                    ...(gameData.clientEmail ? { clientEmail: gameData.clientEmail } : {}),
                    prize: input.prizeName,
                    validationCode: validationCode,
                    message: {
                        subject: clientEmailContent.subject,
                        html: clientEmailContent.body,
                    },
                    createdAt: serverTimestamp(),
                };
                try {
                    const { data, error } = await resend.emails.send({
                        from: fromAddress,
                        to: clientEmail,
                        subject: clientEmailContent.subject,
                        html: clientEmailContent.body,
                    });
                    if (error) throw error;
                    logData.status = 'sent';
                    logData.resendId = data?.id;
                } catch (e: any) {
                    logData.status = 'failed';
                    logData.error = e.message;
                    console.error(`Failed to send email to client ${clientEmail}:`, e);
                }
                await addDoc(emailLogRef, logData);
            })());
        }
        
        await Promise.all(sendPromises);

        return {
            success: true,
            message: 'Notification emails have been processed.',
            validationCode: validationCode,
        };

    } catch (error: any) {
        console.error('Fatal error in prizeNotificationFlow:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred.',
        };
    }
  }
);
