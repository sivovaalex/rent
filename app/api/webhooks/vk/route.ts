/**
 * VK Bot Callback API
 * Receives messages from VK and generates link codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleVkMessage, verifyVkSecret, VKCallbackEvent } from '@/lib/notifications/vk';

const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE;

/**
 * POST /api/webhooks/vk
 * Receive VK Callback API events
 */
export async function POST(request: NextRequest) {
  try {
    const event: VKCallbackEvent = await request.json();

    // Verify secret if configured
    if (!verifyVkSecret(event.secret)) {
      console.warn('[VK WEBHOOK] Invalid secret key');
      return new NextResponse('Invalid secret', { status: 401 });
    }

    // Handle confirmation request
    if (event.type === 'confirmation') {
      if (!VK_CONFIRMATION_CODE) {
        console.error('[VK WEBHOOK] Confirmation code not configured');
        return new NextResponse('Configuration error', { status: 500 });
      }
      return new NextResponse(VK_CONFIRMATION_CODE);
    }

    // Handle new message
    if (event.type === 'message_new') {
      const result = await handleVkMessage(event);

      if (result) {
        // Save the link code to database
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

        // Delete any existing unused codes for this peer
        await prisma.messengerLinkCode.deleteMany({
          where: {
            chatId: result.peerId,
            type: 'vk',
            usedAt: null,
          },
        });

        // Create new link code
        await prisma.messengerLinkCode.create({
          data: {
            code: result.code,
            type: 'vk',
            chatId: result.peerId,
            expiresAt,
          },
        });

        console.log(
          `[VK WEBHOOK] Created link code ${result.code} for peer ${result.peerId}`
        );
      }
    }

    // VK expects 'ok' response for all non-confirmation events
    return new NextResponse('ok');
  } catch (error) {
    console.error('[VK WEBHOOK] Error:', error);
    // Always return 200 to VK to prevent retries
    return new NextResponse('ok');
  }
}

/**
 * GET /api/webhooks/vk
 * Health check for webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'vk-webhook',
  });
}
