import { NextResponse } from 'next/server';
import  prisma  from '@/lib/prisma';

export async function GET() {
  try {
    const deletedUsers = await prisma.deletedUser.findMany({
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json(deletedUsers);
  } catch (error) {
    console.error('Error listando usuarios eliminados:', error);
    return NextResponse.json(
      { error: 'No se pudieron consultar los usuarios eliminados.' },
      { status: 500 }
    );
  }
}