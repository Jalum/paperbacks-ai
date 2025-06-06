import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Validate the URL to ensure it's an OpenAI/Azure URL if needed for security
    // For now, we'll trust valid URLs are passed from our controlled frontend.
    if (!imageUrl.startsWith('https://oaidalleapiprodscus.blob.core.windows.net')) {
        // A more robust check might be needed depending on URL variations
        // console.warn('Image proxy requested for non-OpenAI URL:', imageUrl);
        // For now, let's allow any https URL, but be mindful of SSRF risks if this were a general proxy.
        if (!imageUrl.startsWith('https://')) {
            return NextResponse.json({ error: 'Invalid image URL scheme' }, { status: 400 });
        }
    }

    const imageResponse = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        // Add any necessary headers if OpenAI required them, but usually not for direct blob access URLs
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from external source' }, { status: imageResponse.status });
    }

    const imageBlob = await imageResponse.blob();
    const contentType = imageResponse.headers.get('content-type') || 'image/png'; // Default to png if not specified
    
    // Create a new NextResponse with the blob data and correct headers
    // ReadableStream is preferred for larger files to avoid buffering entire file in memory
    const readableStream = imageBlob.stream() as ReadableStream<Uint8Array>; // Cast needed for some TS versions

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache aggressively
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return NextResponse.json({ error: 'Internal server error in image proxy' }, { status: 500 });
  }
} 