const express = require('express');
const { whatsappService } = require('../services/whatsapp-service');
const User = require('../models/User');
const { generateAnalyticsData } = require('../utils/analytics');
const { generatePDFReport } = require('../utils/pdf-generator');
const router = express.Router();

// Get WhatsApp status and QR code
router.get('/status', async (req, res) => {
  try {
    const isReady = whatsappService.isClientReady();
    const qrCode = whatsappService.getQRCode();
    const clientInfo = await whatsappService.getClientInfo();

    res.json({
      success: true,
      isReady,
      qrCode: qrCode || null,
      clientInfo
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status'
    });
  }
});

// Send WhatsApp report
router.post('/send-report', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if WhatsApp is ready
    if (!whatsappService.isClientReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp client not ready. Please scan QR code first.'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'User phone number not found'
      });
    }

    // Generate analytics data
    const analytics = await generateAnalyticsData(userId);
    
    // Generate PDF report
    const pdfBuffer = await generatePDFReport(user, analytics);

    // Send WhatsApp report with PDF
    const success = await whatsappService.sendReportWithPDF(user, analytics, pdfBuffer);

    if (success) {
      // Update last sent timestamp
      await User.findByIdAndUpdate(userId, {
        lastWhatsAppSent: new Date()
      });

      res.json({
        success: true,
        message: 'WhatsApp report sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send WhatsApp report'
      });
    }
  } catch (error) {
    console.error('Error sending WhatsApp report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send WhatsApp report'
    });
  }
});

// Test WhatsApp connection
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    if (!whatsappService.isClientReady()) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp client not ready. Please scan QR code first.'
      });
    }

    const success = await whatsappService.sendMessage({
      to: phoneNumber,
      message
    });

    res.json({
      success,
      message: success ? 'Test message sent successfully' : 'Failed to send test message'
    });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test message'
    });
  }
});

// Destroy WhatsApp session
router.post('/destroy', async (req, res) => {
  try {
    await whatsappService.destroy();
    res.json({
      success: true,
      message: 'WhatsApp session destroyed'
    });
  } catch (error) {
    console.error('Error destroying WhatsApp session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to destroy WhatsApp session'
    });
  }
});

module.exports = router;