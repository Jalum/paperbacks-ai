import openai from '../../../lib/openai';
import { NextResponse } from 'next/server';

interface AiGenerateRequestBody {
  prompt: string;
  n?: number;
  targetWidthPx?: number;
  targetHeightPx?: number;
}

export async function POST(request: Request) {
  try {
    const { prompt, n = 1, targetWidthPx, targetHeightPx } = await request.json() as AiGenerateRequestBody;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    // Validation for targetWidthPx and targetHeightPx can be added here if they become strictly necessary for future logic

    // DALL-E 3 will generate at a fixed portrait size as per previous discussion
    const dallESize: "1024x1792" = "1024x1792";

    console.log(`Generating AI image with DALL-E. Prompt: "${prompt.substring(0,100)}...", Size: ${dallESize}`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: n,
      size: dallESize, 
      quality: "standard", // "standard" or "hd"
      response_format: "url", 
    });

    if (response.data && response.data.length > 0 && response.data[0].url) {
      const image_url = response.data[0].url;
      console.log(`Successfully generated image. URL: ${image_url}`);
      return NextResponse.json({ image_url, generated_size: dallESize }); 
    } else {
      console.error('Invalid response structure from OpenAI API DALL-E call:', response);
      return NextResponse.json({ error: 'Failed to get image URL from OpenAI DALL-E response' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in /api/ai-generate route:', error);
    // Check if the error is an OpenAI API error to provide more specific feedback
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
        // This is a basic check. For more robust OpenAI error handling, 
        // you might need to import OpenAI.APIError and use `instanceof` if using the openai npm package v3.x
        // For v4+, the error structure is different.
        // const openAIError = error as { status: number; message: string; type?: string; code?: string; param?: string };
        return NextResponse.json(
            { 
                error: 'OpenAI API error during image generation', 
                details: error.message, 
                // statusCode: openAIError.status 
            }, 
            { status: (error as any).status || 500 }
        );
    }
    return NextResponse.json({ error: 'Failed to generate image due to an unexpected server error' }, { status: 500 });
  }
} 