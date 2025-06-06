import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      authenticated: !!session?.user?.email,
      userEmail: session?.user?.email || null,
      blobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      message: 'Upload test endpoint working'
    })
  } catch (error) {
    console.error('Error in upload test:', error)
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    )
  }
}