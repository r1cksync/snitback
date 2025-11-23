import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

interface WhatsAppConfig {
  sessionPath?: string;
}

interface WhatsAppMessage {
  to: string; // Phone number in international format
  message: string;
  media?: Buffer;
  mediaType?: 'image' | 'document';
  filename?: string;
}

export class WhatsAppService {
  private client: Client;
  private isReady: boolean = false;
  private qrCode: string = '';

  constructor(config: WhatsAppConfig = {}) {
    const sessionPath = config.sessionPath || './whatsapp-session';
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'nits-ps1-whatsapp',
        dataPath: sessionPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.isReady = false;
    this.qrCode = '';
    this.setupEventHandlers();
    this.initializeClient();
  }

  private setupEventHandlers(): void {
    this.client.on('qr', (qr) => {
      console.log('📱 WhatsApp QR Code received');
      this.generateQRCode(qr);
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready!');
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.isReady = false;
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp disconnected:', reason);
      this.isReady = false;
    });

    this.client.on('message', async (message) => {
      // Handle incoming messages if needed
      console.log('📨 Received message:', message.body);
    });
  }

  private async initializeClient(): Promise<void> {
    try {
      await this.client.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp client:', error);
    }
  }

  private async generateQRCode(qr: string): Promise<void> {
    try {
      this.qrCode = await QRCode.toDataURL(qr);
      console.log('🔗 QR Code generated');
      
      // Also save QR code as file for easier access
      const qrPath = path.join(process.cwd(), 'public', 'whatsapp-qr.png');
      const qrBuffer = await QRCode.toBuffer(qr);
      
      // Ensure public directory exists
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      fs.writeFileSync(qrPath, qrBuffer);
      console.log('💾 QR Code saved to /public/whatsapp-qr.png');
    } catch (error) {
      console.error('❌ Failed to generate QR code:', error);
    }
  }

  async sendMessage(messageData: WhatsAppMessage): Promise<boolean> {
    if (!this.isReady) {
      console.log('⏳ WhatsApp client not ready. Please scan QR code first.');
      return false;
    }

    try {
      // Format phone number for WhatsApp (remove + and add @c.us)
      const chatId = this.formatWhatsAppNumber(messageData.to);
      
      console.log(`📱 Attempting to send WhatsApp message to: ${chatId}`);
      
      if (messageData.media) {
        // Send message with media
        const media = new MessageMedia(
          messageData.mediaType === 'image' ? 'image/png' : 'application/pdf',
          messageData.media.toString('base64'),
          messageData.filename || 'attachment'
        );
        
        await this.client.sendMessage(chatId, media, {
          caption: messageData.message
        });
      } else {
        // Send text message
        await this.client.sendMessage(chatId, messageData.message);
      }

      console.log(`✅ WhatsApp message sent successfully to ${messageData.to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      
      if (error.message.includes('number not registered')) {
        console.log('💡 Phone number is not registered on WhatsApp');
      } else if (error.message.includes('not found')) {
        console.log('💡 Chat not found. Make sure the number format is correct');
      }
      
      return false;
    }
  }

  private formatWhatsAppNumber(phoneNumber: string): string {
    // Remove all non-digit characters and + symbol
    const digits = phoneNumber.replace(/\D/g, '');
    
    // For WhatsApp, we need the number without + and with @c.us suffix
    return `${digits}@c.us`;
  }

  async sendReportMessage(user: any, analytics: any): Promise<boolean> {
    const message = this.generateReportText(user, analytics);
    
    return await this.sendMessage({
      to: user.phoneNumber,
      message
    });
  }

  async sendReportWithPDF(user: any, analytics: any, pdfBuffer: Buffer): Promise<boolean> {
    const message = this.generateReportText(user, analytics);
    
    return await this.sendMessage({
      to: user.phoneNumber,
      message,
      media: pdfBuffer,
      mediaType: 'document',
      filename: `NITS-PS1-Report-${new Date().toISOString().split('T')[0]}.pdf`
    });
  }

  private generateReportText(user: any, analytics: any): string {
    return `🧠 *NITS PS1 Productivity Report*

Hello ${user.name}! 👋

📊 *This Week's Progress:*
• Sessions: ${analytics.totalSessions}
• Focus Time: ${Math.round(analytics.totalFocusTime / 3600)}h
• Productivity: ${analytics.productivityScore}/100
• Streak: ${analytics.streakDays} days 🔥

🎯 *Session Breakdown:*
• Focus: ${analytics.focusSessionsCount}
• Code: ${analytics.codeSessionsCount}  
• Whiteboard: ${analytics.whiteboardSessionsCount}

💪 Keep up the excellent work! Your detailed report is attached as a PDF.

🌐 View full dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard

*- NITS PS1 Team*`;
  }

  getQRCode(): string {
    return this.qrCode;
  }

  isClientReady(): boolean {
    return this.isReady;
  }

  async getClientInfo(): Promise<any> {
    if (!this.isReady) {
      return { ready: false };
    }

    try {
      const info = this.client.info;
      return {
        ready: true,
        phone: info?.wid?.user,
        platform: info?.platform,
        name: info?.pushname
      };
    } catch (error) {
      console.error('Error getting client info:', error);
      return { ready: false, error: error };
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.client.destroy();
      console.log('🔚 WhatsApp client destroyed');
    } catch (error) {
      console.error('Error destroying WhatsApp client:', error);
    }
  }
}

// Create and export WhatsApp service instance
export const whatsappService = new WhatsAppService();