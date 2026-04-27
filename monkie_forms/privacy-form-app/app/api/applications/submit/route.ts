import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Received application:', {
      firstName: body.firstName,
      email: body.email,
      walletAddress: body.walletAddress?.slice(0, 20) + '...',
      commitment: body.commitment?.slice(0, 16) + '...',
    });

    // Find or create user by wallet address
    let user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: body.email,
          publicKey: body.walletAddress,
          role: 'APPLICANT',
        },
      });
    }

    // Get next application ID
    const lastApp = await prisma.application.findFirst({
      orderBy: { applicationId: 'desc' },
    });
    const nextApplicationId = (lastApp?.applicationId ?? -1) + 1;

    // Create application (only public + hashes, NEVER private data)
    const application = await prisma.application.create({
      data: {
        applicationId: nextApplicationId,
        userId: user.id,

        // Public
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        gender: body.gender,
        citizenship: body.citizenship,
        birthMonthYear: body.birthMonthYear,

        // Hashes (NOT private data)
        cvHash: body.cvHash,
        writtenSubmissionHash: body.essayHash,
        videoLinkHash: body.videoHash,
        commitment: body.commitment,

        status: 'SUBMITTED',
      },
    });

    return NextResponse.json({
      success: true,
      applicationId: application.applicationId,
      message: 'Application submitted with privacy-preserving commitments',
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}