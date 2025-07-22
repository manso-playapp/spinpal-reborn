
'use server';
/**
 * @fileOverview A flow for handling prize notifications via Resend.
 *
 * - sendPrizeNotification - A function that handles the prize notification process.
 * - PrizeNotificationInput - The input type for the sendPrizeNotification function.
 * - PrizeNotificationOutput - The return type for the sendPrizeNotification function.
 */

import { ai } from '@/ai/genkit';
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


const emailPrompt = ai.definePrompt({
    name: 'prizeNotificationEmailPrompt',
    input: {
        schema: z.object({
            gameName: z.string(),
            prizeName: z.string(),
            validationCode: z.string(),
            customerName: z.string(),
            emailType: z.enum(['customer', 'client']),
        })
    },
    output: {
        schema: z.object({
            subject: z.string().describe("The subject line of the email."),
            body: z.string().describe("The full HTML body of the email. It should be friendly, well-formatted, and visually appealing. Use simple HTML tags like <p>, <strong>, <em>, and <br>."),
        })
    },
    prompt: `
        You are an expert in writing clear, friendly, and professional emails. 
        Your task is to generate the subject and HTML body for a prize notification email.
        You must strictly return a JSON object with a "subject" and a "body" property.

        **Game Name:** {{{gameName}}}
        **Prize Won:** {{{prizeName}}}
        **Winner's Name:** {{{customerName}}}
        **Validation Code:** {{{validationCode}}}

        {{#if (eq emailType "customer")}}
        **Email Type:** Customer Congratulatory Email
        **Instructions:**
        - Write a congratulatory email to the customer.
        - The tone should be enthusiastic and celebratory.
        - Clearly state the prize they have won.
        - Prominently display the validation code and explain that they need to show it to redeem their prize.
        - Thank them for participating in the "{{gameName}}" game.
        {{else}}
        **Email Type:** Client Notification Email
        **Instructions:**
        - Write a notification email to the business owner (client).
        - The tone should be informative and professional.
        - Clearly state that a customer named "{{customerName}}" has won the prize "{{prizeName}}".
        - Provide the validation code so the client can verify the prize when the customer comes to claim it.
        - Mention the game was "{{gameName}}".
        {{/if}}

        Generate only the JSON object with the subject and body.
    `,
});


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
    const resend = new Resend(resendApiKey);
    const fromAddress = 'noreply@mansoestudiocreativo.com'; 

    try {
        // 1. Fetch Game and Customer data from Firestore
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
        
        const clientEmail = gameData.clientEmail;
        const customerEmail = customerData.email;

        // 2. Generate email content using Genkit AI, with robust error handling
        let customerEmailContent, clientEmailContent;

        try {
            const customerEmailResult = await emailPrompt({
                gameName: gameData.name,
                prizeName: input.prizeName,
                validationCode,
                customerName: customerData.name,
                emailType: 'customer',
            });
            customerEmailContent = customerEmailResult.output;
            if (!customerEmailContent) {
                 throw new Error('AI prompt for customer email returned empty output.');
            }
        } catch (error) {
            console.error('CRITICAL: Failed to generate customer email content.', error);
            // We cannot proceed without the customer email.
            throw new Error('Failed to generate required customer email.');
        }

        if (clientEmail) {
            try {
                 const clientEmailResult = await emailPrompt({
                    gameName: gameData.name,
                    prizeName: input.prizeName,
                    validationCode,
                    customerName: customerData.name,
                    emailType: 'client',
                });
                clientEmailContent = clientEmailResult.output;
                if (!clientEmailContent) {
                    console.warn('AI prompt for client email returned empty output. Proceeding without client email.');
                }
            } catch(error) {
                console.error('WARNING: Failed to generate client email content. The customer will still be notified.', error);
                // Continue execution, the client email is not critical.
                clientEmailContent = null; 
            }
        }


        // 3. Send emails via Resend and log the results to Firestore
        const emailLogRef = collection(db, 'outbound_emails');
        const sendPromises = [];

        // Send and log customer email
        sendPromises.push((async () => {
            let logData: any = {
                to: customerEmail,
                gameId: input.gameId,
                customerId: input.customerId,
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

        // Send and log client email if applicable and successfully generated
        if (clientEmail && clientEmailContent) {
            sendPromises.push((async () => {
                let logData: any = {
                    to: clientEmail,
                    gameId: input.gameId,
                    customerId: input.customerId,
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
