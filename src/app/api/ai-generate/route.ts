import openai from '../../../lib/openai'; // Corrected path
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AiGenerateRequestBody {
  prompt: string;
  n?: number;
  // targetWidthPx?: number; // Removed as unused for now
  // targetHeightPx?: number;// Removed as unused for now
}

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user's credit balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true },
    });

    const AI_GENERATION_COST = 10; // Credits required for AI generation
    
    if (!user || user.creditBalance < AI_GENERATION_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${AI_GENERATION_COST} credits for AI generation.` },
        { status: 402 } // Payment Required
      );
    }

    // Removed targetWidthPx, targetHeightPx from destructuring
    const { prompt, n = 1 } = await request.json() as AiGenerateRequestBody;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const dallESize = "1024x1792" as const; // Use const assertion

    console.log(`Generating AI image with DALL-E. Prompt: "${prompt.substring(0,100)}...", Size: ${dallESize}`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: n,
      size: dallESize, 
      quality: "standard", 
      response_format: "url", 
    });

    if (response.data && response.data.length > 0 && response.data[0].url) {
      const image_url = response.data[0].url;
      console.log(`Successfully generated image. URL: ${image_url}`);
      
      // Deduct credits from user's balance
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          creditBalance: {
            decrement: AI_GENERATION_COST,
          },
        },
      });
      
      // Get updated balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { creditBalance: true },
      });
      
      return NextResponse.json({ 
        image_url, 
        generated_size: dallESize,
        creditsUsed: AI_GENERATION_COST,
        newBalance: updatedUser?.creditBalance || 0,
      }); 
    } else {
      console.error('Invalid response structure from OpenAI API DALL-E call:', response);
      return NextResponse.json({ error: 'Failed to get image URL from OpenAI DALL-E response' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in /api/ai-generate route:', error);
    
    // Type guard for error object
    if (error instanceof Error && 'message' in error) {
        return NextResponse.json(
            { 
                error: 'OpenAI API error during image generation', 
                details: error.message
            }, 
            { status: 500 }
        );
    }
    return NextResponse.json({ 
      error: 'Failed to generate image due to an unexpected server error'
    }, { status: 500 });
  }
} 