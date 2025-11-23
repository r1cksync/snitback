import 'server-only';

// This wrapper ensures WhatsApp Web.js only runs on the server
let whatsappService: any = null;

async function getWhatsAppService() {
  if (!whatsappService) {
    // Dynamic import to avoid bundling issues
    const { WhatsAppService } = await import('./whatsapp-service-node');
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
}

export { getWhatsAppService };