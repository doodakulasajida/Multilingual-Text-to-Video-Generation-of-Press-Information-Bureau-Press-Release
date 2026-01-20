
'use server';
/**
 * @fileOverview A video generation AI agent using Veo.
 *
 * - generateVideo - A function that handles the video generation process.
 * - GenerateVideoInput - The input type for the generateVideo function.
 * - GenerateVideoOutput - The return type for the generateVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const GenerateVideoInputSchema = z.object({
  prompt: z.string().describe('A text description of the video to generate.'),
  narration: z.string().optional().describe('The text to be spoken in the audio narration.'),
  style: z.string().optional().describe('A text description of the style to use.'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '2:3']).optional().default('16:9'),
  language: z.enum(['en', 'hi', 'te']).optional().default('en'),
});
export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The data URI of the generated video.'),
  audioUrl: z.string().optional().describe('The data URI of the generated audio narration.'),
});
export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: z.object({ prompt: z.string(), language: z.string() }),
    outputSchema: z.string().optional(),
  },
  async ({ prompt, language }) => {
    try {
      let voiceName = 'Algenib'; // Default English
      if (language === 'hi') {
        voiceName = 'hi-IN-Neural2-A';
      } else if (language === 'te') {
        voiceName = 'te-IN-Wavenet-A';
      }

      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
        prompt,
      });

      if (!media?.url) {
        console.warn('TTS generation returned no media URL.');
        return undefined;
      }
      
      const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
      const wavBase64 = await toWav(audioBuffer);
      return `data:audio/wav;base64,${wavBase64}`;
    } catch (error) {
        console.error("Error in textToSpeechFlow:", error);
        return undefined; // Return undefined on failure
    }
  }
);

export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
  return generateVideoFlow(input);
}

const generateVideoFlow = ai.defineFlow(
  {
    name: 'generateVideoFlow',
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
  },
  async (input) => {
    const videoGenPromise = (async () => {
        const fetch = (await import('node-fetch')).default;

        const fullPrompt = `${input.prompt}, in the style of ${input.style || 'a cinematic film'}`;

        const promptParts = [{ text: fullPrompt }];
        
        let operation;
        try {
            const genkitResponse = await ai.generate({
                model: googleAI.model('veo-3.0-generate-preview'),
                prompt: promptParts,
                config: {
                    aspectRatio: input.aspectRatio,
                },
            });
            operation = genkitResponse.operation;
        } catch (e) {
            console.error("Error calling Veo API:", e);
            throw new Error(`Failed to initiate video generation: ${e instanceof Error ? e.message : String(e)}`);
        }

        if (!operation) {
          throw new Error('Expected the model to return an operation for video generation.');
        }
        
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5s
          try {
            operation = await ai.checkOperation(operation);
          } catch (e) {
             console.error("Error polling for video completion:", e);
             throw new Error(`Failed to check video generation status: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        if (operation.error) {
          console.error('Video generation failed:', operation.error);
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const video = operation.output?.message?.content.find((p) => !!p.media);
        if (!video || !video.media?.url) {
          throw new Error('Failed to find the generated video in the operation output.');
        }
        
        const videoDownloadUrl = `${video.media.url}&key=${process.env.GEMINI_API_KEY}`;
        const videoResponse = await fetch(videoDownloadUrl);

        if (!videoResponse.ok || !videoResponse.body) {
            throw new Error(`Failed to download video from ${video.media.url}. Status: ${videoResponse.statusText}`);
        }
        
        const videoBuffer = await videoResponse.arrayBuffer();
        const videoBase64 = Buffer.from(videoBuffer).toString('base64');
        const contentType = video.media.contentType || 'video/mp4';

        return `data:${contentType};base64,${videoBase64}`;
    })();

    const audioGenPromise = (async () => {
      if (!input.narration) {
        return undefined;
      }
      return textToSpeechFlow({ prompt: input.narration, language: input.language || 'en' });
    })();

    const [videoResult, audioResult] = await Promise.allSettled([videoGenPromise, audioGenPromise]);

    if (videoResult.status === 'rejected') {
        console.error('Video generation failed:', videoResult.reason);
        throw new Error(`Video generation failed: ${videoResult.reason.message}`);
    }

    let audioUrl: string | undefined = undefined;
    if (audioResult.status === 'fulfilled') {
        audioUrl = audioResult.value;
    } else {
        // Log the audio failure but don't crash
        console.warn('Audio generation failed:', audioResult.reason);
    }
    
    return {
      videoUrl: videoResult.value,
      audioUrl: audioUrl,
    };
  }
);
