import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppService } from '@/src/services/whatsapp-server';

export async function GET(request: NextRequest) {
  try {
    const whatsappService = await getWhatsAppService();
    const isReady = whatsappService.isClientReady();
    const qrCode = whatsappService.getQRCode();
    const clientInfo = await whatsappService.getClientInfo();

    return NextResponse.json({
      success: true,
      isReady,
      qrCode: qrCode || null,
      clientInfo
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get WhatsApp status'
      },
      { status: 500 }
    );
  }
}