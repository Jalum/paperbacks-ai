import { NextResponse } from 'next/server'
import { healthCheck } from '@/lib/prisma'

// GET /api/health - Database health check
export async function GET() {
  try {
    const dbHealth = await healthCheck()
    
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth
      }
    }

    return NextResponse.json(response, {
      status: dbHealth.status === 'healthy' ? 200 : 503
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}