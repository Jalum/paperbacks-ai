import { handleUpload } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Blob handler request received');
    
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Processing blob upload for user:', session.user.email);

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log('Generating upload token for:', pathname);
        
        // Validate file path includes user email for security
        let validatedPathname = pathname;
        const userPath = `covers/${session.user.email}/`;
        if (!pathname.startsWith(userPath)) {
          // Update pathname to include user email for security
          const filename = pathname.split('/').pop();
          validatedPathname = `${userPath}${filename}`;
        }
        
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
          validUntil: Date.now() + 1000 * 60 * 10, // 10 minutes
          pathname: validatedPathname,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob upload completed:', blob.url);
        // Optional: Additional processing after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Blob handler error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to handle blob upload',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}