import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWhatsAppService } from '@/src/services/whatsapp-server';
import User from '@/models/User';
import FlowSession from '@/models/FlowSession';
import connectDB from '@/lib/mongodb';
import { generatePDFReport } from '@/lib/pdf-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const whatsappService = await getWhatsAppService();

    // Check if WhatsApp is ready
    if (!whatsappService.isClientReady()) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp client not ready. Please scan QR code first.'
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found'
        },
        { status: 404 }
      );
    }

    if (!user.phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'User phone number not found'
        },
        { status: 400 }
      );
    }

    // Get user's flow sessions
    const sessions = await FlowSession.find({ userId: user._id })
      .sort({ startTime: -1 })
      .limit(50);

    // Generate analytics data
    const analytics = await calculateUserAnalytics(user._id.toString(), sessions);
    
    // Generate PDF report
    const pdfBuffer = await generatePDFReport(user, analytics);

    // Send WhatsApp report with PDF
    const success = await whatsappService.sendReportWithPDF(user, analytics, pdfBuffer);

    if (success) {
      // Update last sent timestamp
      await User.findByIdAndUpdate(user._id, {
        lastWhatsAppSent: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp report sent successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send WhatsApp report'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending WhatsApp report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send WhatsApp report'
      },
      { status: 500 }
    );
  }
}

async function calculateUserAnalytics(userId: string, sessions: any[]) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Filter recent sessions
  const recentSessions = sessions.filter(session => 
    new Date(session.startTime) > oneWeekAgo
  );

  // Calculate metrics
  const totalSessions = sessions.length;
  const totalFocusTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
  const averageSessionDuration = totalSessions > 0 ? totalFocusTime / totalSessions : 0;
  
  // Calculate productivity score (based on session completion and focus scores)
  const completedSessions = sessions.filter(session => session.completed);
  const productivityScore = Math.round(
    totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0
  );

  // Calculate streak (consecutive days with sessions)
  const streakDays = calculateStreak(sessions);

  // Count different session types
  const codeSessionsCount = sessions.filter(s => s.sessionType === 'code').length;
  const whiteboardSessionsCount = sessions.filter(s => s.sessionType === 'whiteboard').length;
  const focusSessionsCount = sessions.filter(s => s.sessionType === 'focus').length;

  // Calculate wellness score (based on session frequency and breaks)
  const wellnessScore = Math.min(100, Math.round((recentSessions.length / 7) * 20 + productivityScore * 0.3));

  // Weekly progress (last 7 days)
  const weeklyProgress = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    });
    
    return Math.min(100, daySessions.length * 25); // Each session adds 25% to daily progress
  }).reverse();

  return {
    totalSessions,
    totalFocusTime,
    averageSessionDuration,
    productivityScore,
    streakDays,
    codeSessionsCount,
    whiteboardSessionsCount,
    focusSessionsCount,
    wellnessScore,
    weeklyProgress
  };
}

function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  const sortedSessions = sessions
    .map(session => new Date(session.startTime).toDateString())
    .filter((date, index, array) => array.indexOf(date) === index) // Remove duplicates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date().toDateString();
  let currentDate = new Date();

  for (const sessionDate of sortedSessions) {
    const checkDate = currentDate.toDateString();
    
    if (sessionDate === checkDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (sessionDate === new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 2);
    } else {
      break;
    }
  }

  return streak;
}