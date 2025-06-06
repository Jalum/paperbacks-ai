import { PrismaClient } from '@prisma/client'

// Global declaration for PrismaClient to prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Create a single instance of PrismaClient
const prisma = globalThis.prisma || new PrismaClient()

// In development, store the instance globally to prevent multiple instances
if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma
}

export default prisma

// Helper function to safely disconnect Prisma (for serverless environments)
export async function disconnect() {
  if (prisma) {
    await prisma.$disconnect()
  }
}

// Health check function
export async function healthCheck() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    }
  }
}