import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { active: true },
      orderBy: { priceCents: 'asc' },
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Failed to fetch credit packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit packages' },
      { status: 500 }
    );
  }
}