
'use server';
/**
 * @fileOverview A flow for handling prize notifications.
 *
 * - sendPrizeNotification - A function that handles the prize notification process.
 * - PrizeNotificationInput - The input type for the sendPrizeNotification function.
 * - PrizeNotificationOutput - The return type for the sendPrizeNotification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
    try {
        // 1. Fetch Game and Customer data from Firestore
        const gameRef = doc(db, 'games', input.gameId);
        const customerRef = doc(db, 'games', input.gameId, 'customers', input.customerId);

        const [gameSnap, customerSnap] = await Promise.all([
            getDoc(gameRef),
            getDoc(customerRef),
        ]);

        if (!gameSnap.exists()) {
            throw new Error('Game not found.');
        }
        if (!customerSnap.exists()) {
            throw new Error('Customer not found.');
        }

        const gameData = gameSnap.data();
        const customerData = customerSnap.data();
        const validationCode = generateValidationCode();
        
        const clientEmail = gameData.clientEmail;
        const customerEmail = customerData.email;

        // 2. Generate email content using Genkit AI
        const [customerEmailContent, clientEmailContent] = await Promise.all([
            // Customer email
            emailPrompt({
                gameName: gameData.name,
                prizeName: input.prizeName,
                validationCode,
                customerName: customerData.name,
                emailType: 'customer',
            }).then(result => result.output),
            // Client email (only if clientEmail is configured)
            clientEmail 
            ? emailPrompt({
                gameName: gameData.name,
                prizeName: input.prizeName,
                validationCode,
                customerName: customerData.name,
                emailType: 'client',
            }).then(result => result.output)
            : Promise.resolve(null),
        ]);

        if (!customerEmailContent) {
            throw new Error('Failed to generate customer email content.');
        }
        
        // 3. Queue emails by saving them to Firestore
        const emailQueueRef = collection(db, 'outbound_emails');
        const emailsToQueue = [];

        // Queue customer email
        emailsToQueue.push(addDoc(emailQueueRef, {
            to: customerEmail,
            gameId: input.gameId,
            customerId: input.customerId,
            prize: input.prizeName,
            validationCode: validationCode,
            message: {
                subject: customerEmailContent.subject,
                html: customerEmailContent.body,
            },
            status: 'queued',
            createdAt: serverTimestamp(),
        }));

        // Queue client email if applicable
        if (clientEmail && clientEmailContent) {
            emailsToQueue.push(addDoc(emailQueueRef, {
                to: clientEmail,
                gameId: input.gameId,
                customerId: input.customerId,
                prize: input.prizeName,
                validationCode: validationCode,
                message: {
                    subject: clientEmailContent.subject,
                    html: clientEmailContent.body,
                },
                status: 'queued',
                createdAt: serverTimestamp(),
            }));
        }
        
        await Promise.all(emailsToQueue);

        return {
            success: true,
            message: 'Notification emails have been successfully queued.',
            validationCode: validationCode,
        };

    } catch (error: any) {
        console.error('Error in prizeNotificationFlow:', error);
        return {
            success: false,
            message: error.message || 'An unexpected error occurred.',
        };
    }
  }
);

    