import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({
    // temperature: 1, // uncomment to get more creative results
  })],
  model: 'googleai/gemini-2.0-flash',
});
