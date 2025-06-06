import openai from '../../../lib/openai';
import { NextResponse } from 'next/server';

interface PromptElements {
  motifs?: string;
  elements?: string;
  setting?: string;
  style?: string;
  colors?: string;
  targetWidthPx?: number;
  targetHeightPx?: number;
  // Add other relevant fields as needed
}

// Define a more specific type for the ChatCompletionRequestMessage if using an older SDK version or for clarity
// For OpenAI SDK v4+, ChatCompletionMessageParam is used internally

export async function POST(request: Request) {
  try {
    const { motifs, elements, setting, style, colors, targetWidthPx, targetHeightPx } = await request.json() as PromptElements;

    // Basic validation
    if (!motifs && !elements && !setting && !style && !colors) {
      return NextResponse.json({ error: 'At least one descriptive field is required to suggest a prompt.' }, { status: 400 });
    }
    if (!targetWidthPx || !targetHeightPx) {
      return NextResponse.json({ error: 'Target dimensions (width and height) for the final design are required to inform prompt composition.' }, { status: 400 });
    }

    const userTargetAspectRatio = (targetWidthPx / targetHeightPx).toFixed(2);
    const dallEGenerationSize = "1024x1792";

    // Determine if the user's target is portrait, landscape, or square-ish for tailored instructions.
    let targetOrientationDescription = "a portrait orientation (taller than wide)";
    if (parseFloat(userTargetAspectRatio) > 1.1) targetOrientationDescription = "a landscape orientation (wider than tall)";
    else if (parseFloat(userTargetAspectRatio) < 0.9) targetOrientationDescription = "a portrait orientation (taller than wide)";
    else targetOrientationDescription = "a roughly square orientation";

    const systemMessage = `You are an expert prompt engineer for DALL-E 3. Your task is to generate a concise, effective DALL-E 3 prompt based on the user's described elements for a flat 2D illustration. \
The user intends to use this illustration on a design that has a ${targetOrientationDescription}, with an aspect ratio of approximately ${userTargetAspectRatio}. \
DALL-E 3 will generate its image at a fixed size of ${dallEGenerationSize} (which is portrait). \
Your generated DALL-E prompt *must* instruct DALL-E to create content that is well-composed and visually appealing when it is eventually displayed on the user's final design, considering potential cropping or fitting from the ${dallEGenerationSize} source to the user's target aspect ratio (${userTargetAspectRatio}). \
For example, if the user's target aspect ratio is ${targetOrientationDescription} and DALL-E provides a ${dallEGenerationSize} portrait image, the DALL-E prompt should encourage a composition that makes the best use of that. If the user target is landscape but DALL-E gives portrait, prompt DALL-E to keep essential elements away from top/bottom edges that would be cropped. \
Do not mention specific pixel dimensions like '${targetWidthPx}px' or '${targetHeightPx}px' in the DALL-E prompt itself. Instead, focus on compositional guidance for the ${dallEGenerationSize} image to suit the user's target aspect ratio (${userTargetAspectRatio}) and orientation (${targetOrientationDescription}). \
Avoid generating text within the image. Do not describe a 'book cover' in the prompt, instead describe the scene or artwork itself.`;
    
    let userQuery = "Based on the user\'s request, create an optimized DALL-E 3 prompt for a flat 2D illustration with the following characteristics:\n";
    if (motifs) userQuery += `- Motifs: ${motifs}\n`;
    if (elements) userQuery += `- Key Elements: ${elements}\n`;
    if (setting) userQuery += `- Setting/Context: ${setting}\n`;
    if (style) userQuery += `- Artistic Style: ${style}\n`;
    if (colors) userQuery += `- Preferred Colors: ${colors}\n`;
    userQuery += `The DALL-E prompt must guide DALL-E 3 to produce a high-quality flat illustration at ${dallEGenerationSize}. The composition should be suitable for a design that has a ${targetOrientationDescription} (aspect ratio ~${userTargetAspectRatio}). Emphasize compositional elements that will adapt well.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or "gpt-4" for potentially better results
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userQuery },
      ],
      temperature: 0.7, // Adjust for creativity vs. predictability
      max_tokens: 150, // DALL-E prompts are usually not extremely long
    });

    // Using `?.` for safe navigation, as `choices` or `message` or `content` could be undefined
    const suggestedPrompt = response.choices?.[0]?.message?.content?.trim();

    if (!suggestedPrompt) {
      console.error('OpenAI did not return a suggested prompt. Response:', response);
      return NextResponse.json({ error: 'Failed to get a prompt suggestion from AI.' }, { status: 500 });
    }

    return NextResponse.json({ suggestedPrompt });

  } catch (error) {
    console.error('Error suggesting DALL-E prompt:', error);
    // Consider more specific error handling for OpenAI API errors if needed
    // if (error instanceof OpenAI.APIError) { ... }
    return NextResponse.json({ error: 'Failed to suggest DALL-E prompt' }, { status: 500 });
  }
} 