import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('Metadata save request received');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { filename, url, originalName, contentType, size } = data;

    console.log('Saving metadata for:', filename);

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Save file metadata to database
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        userId: user.id,
        filename: filename,
        url: url,
        originalName: originalName,
        contentType: contentType,
        size: size,
        width: null, // We don't have dimensions from direct upload
        height: null,
      }
    });

    console.log('Metadata saved successfully');

    return NextResponse.json({
      id: uploadedFile.id,
      success: true
    });

  } catch (error) {
    console.error('Metadata save error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save metadata',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}