import { jsPDF } from 'jspdf';
import type { IUser } from '@/models/User';
import type { IFlowSession } from '@/models/FlowSession';

interface UserAnalytics {
  totalSessions: number;
  totalFocusTime: number;
  averageSessionDuration: number;
  productivityScore: number;
  streakDays: number;
  codeSessionsCount: number;
  whiteboardSessionsCount: number;
  focusSessionsCount: number;
  wellnessScore: number;
  weeklyProgress: number[];
}

interface ReportData {
  user: any;
  sessions: any[];
  analytics: UserAnalytics;
  codeReports: any[];
  whiteboardAnalytics: any[];
}

export class PDFReportGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  async generateUserReport(reportData: ReportData): Promise<Buffer> {
    const { user, sessions, analytics, codeReports, whiteboardAnalytics } = reportData;

    // Reset document
    this.doc = new jsPDF();
    
    // Add title page
    this.addTitlePage(user);
    
    // Add analytics summary
    this.addAnalyticsSummary(analytics);
    
    // Add flow sessions details
    this.addFlowSessionsReport(sessions);
    
    // Add code reports
    this.addCodeReports(codeReports);
    
    // Add whiteboard analytics
    this.addWhiteboardAnalytics(whiteboardAnalytics);
    
    // Add wellness insights
    this.addWellnessInsights(analytics);

    return Buffer.from(this.doc.output('arraybuffer'));
  }

  private addTitlePage(user: any) {
    // Header
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('NITS PS1 - Personal Report', 20, 30);
    
    // User info
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Generated for: ${user.name}`, 20, 50);
    this.doc.text(`Email: ${user.email}`, 20, 65);
    this.doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 80);
    
    // Add logo area (placeholder)
    this.doc.rect(150, 20, 40, 40);
    this.doc.text('LOGO', 165, 45);
    
    // Add decorative line
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 100, 190, 100);
  }

  private addAnalyticsSummary(analytics: UserAnalytics) {
    this.doc.addPage();
    
    // Title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Analytics Summary', 20, 30);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    let yPos = 50;
    const lineHeight = 15;
    
    // Key metrics
    const metrics = [
      ['Total Sessions', analytics.totalSessions.toString()],
      ['Total Focus Time', `${Math.round(analytics.totalFocusTime / 60)} hours`],
      ['Average Session', `${Math.round(analytics.averageSessionDuration / 60)} minutes`],
      ['Productivity Score', `${analytics.productivityScore}/100`],
      ['Current Streak', `${analytics.streakDays} days`],
      ['Code Sessions', analytics.codeSessionsCount.toString()],
      ['Whiteboard Sessions', analytics.whiteboardSessionsCount.toString()],
      ['Focus Sessions', analytics.focusSessionsCount.toString()],
      ['Wellness Score', `${analytics.wellnessScore}/100`]
    ];

    metrics.forEach(([label, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(label + ':', 20, yPos);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, 100, yPos);
      yPos += lineHeight;
    });

    // Weekly progress chart (simplified text representation)
    yPos += 20;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Weekly Progress:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach((day, index) => {
      const progress = analytics.weeklyProgress[index] || 0;
      this.doc.text(`${day}: ${progress}% complete`, 20 + (index % 3) * 60, yPos + Math.floor(index / 3) * lineHeight);
    });
  }

  private addFlowSessionsReport(sessions: any[]) {
    this.doc.addPage();
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Recent Flow Sessions', 20, 30);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    let yPos = 50;
    const lineHeight = 12;
    
    // Table headers
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Date', 20, yPos);
    this.doc.text('Type', 60, yPos);
    this.doc.text('Duration', 100, yPos);
    this.doc.text('Focus Score', 140, yPos);
    this.doc.text('Productivity', 175, yPos);
    
    yPos += lineHeight;
    this.doc.line(20, yPos - 5, 190, yPos - 5);
    yPos += 5;
    
    // Session data (limit to recent 15 sessions)
    this.doc.setFont('helvetica', 'normal');
    sessions.slice(0, 15).forEach(session => {
      if (yPos > 280) {
        this.doc.addPage();
        yPos = 30;
      }
      
      const date = new Date(session.startTime).toLocaleDateString();
      const duration = `${Math.round(session.duration / 60)}m`;
      const focusScore = session.focusScore || 'N/A';
      const productivity = session.productivityMetrics?.overall || 'N/A';
      
      this.doc.text(date, 20, yPos);
      this.doc.text(session.sessionType, 60, yPos);
      this.doc.text(duration, 100, yPos);
      this.doc.text(focusScore.toString(), 140, yPos);
      this.doc.text(productivity.toString(), 175, yPos);
      
      yPos += lineHeight;
    });
  }

  private addCodeReports(codeReports: any[]) {
    this.doc.addPage();
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Code Session Analysis', 20, 30);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    let yPos = 50;
    const lineHeight = 15;
    
    if (codeReports.length === 0) {
      this.doc.text('No code sessions recorded yet.', 20, yPos);
      return;
    }
    
    // Aggregate code statistics
    const totalLines = codeReports.reduce((sum, report) => sum + (report.linesWritten || 0), 0);
    const totalCommits = codeReports.reduce((sum, report) => sum + (report.commits || 0), 0);
    const languages = [...new Set(codeReports.map(report => report.language).filter(Boolean))];
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Summary:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Lines Written: ${totalLines}`, 20, yPos);
    yPos += lineHeight;
    this.doc.text(`Total Commits: ${totalCommits}`, 20, yPos);
    yPos += lineHeight;
    this.doc.text(`Languages Used: ${languages.join(', ') || 'Various'}`, 20, yPos);
    yPos += lineHeight * 2;
    
    // Recent sessions
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Recent Code Sessions:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    codeReports.slice(0, 10).forEach(report => {
      if (yPos > 280) {
        this.doc.addPage();
        yPos = 30;
      }
      
      const date = new Date(report.date).toLocaleDateString();
      const lines = report.linesWritten || 0;
      const efficiency = report.efficiency || 'N/A';
      
      this.doc.text(`${date} - ${lines} lines, Efficiency: ${efficiency}`, 20, yPos);
      yPos += lineHeight;
    });
  }

  private addWhiteboardAnalytics(whiteboardAnalytics: any[]) {
    this.doc.addPage();
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Whiteboard Session Analysis', 20, 30);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    let yPos = 50;
    const lineHeight = 15;
    
    if (whiteboardAnalytics.length === 0) {
      this.doc.text('No whiteboard sessions recorded yet.', 20, yPos);
      return;
    }
    
    // Aggregate whiteboard statistics
    const totalSessions = whiteboardAnalytics.length;
    const totalTime = whiteboardAnalytics.reduce((sum, session) => sum + (session.duration || 0), 0);
    const avgDuration = totalTime / totalSessions;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Summary:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Sessions: ${totalSessions}`, 20, yPos);
    yPos += lineHeight;
    this.doc.text(`Total Time: ${Math.round(totalTime / 60)} minutes`, 20, yPos);
    yPos += lineHeight;
    this.doc.text(`Average Duration: ${Math.round(avgDuration / 60)} minutes`, 20, yPos);
    yPos += lineHeight * 2;
    
    // Recent sessions
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Recent Whiteboard Sessions:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    whiteboardAnalytics.slice(0, 10).forEach(session => {
      if (yPos > 280) {
        this.doc.addPage();
        yPos = 30;
      }
      
      const date = new Date(session.date).toLocaleDateString();
      const duration = `${Math.round((session.duration || 0) / 60)}m`;
      const complexity = session.complexity || 'N/A';
      
      this.doc.text(`${date} - ${duration}, Complexity: ${complexity}`, 20, yPos);
      yPos += lineHeight;
    });
  }

  private addWellnessInsights(analytics: UserAnalytics) {
    this.doc.addPage();
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Wellness & Recommendations', 20, 30);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    let yPos = 50;
    const lineHeight = 15;
    
    // Wellness score
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Overall Wellness Score: ${analytics.wellnessScore}/100`, 20, yPos);
    yPos += lineHeight * 2;
    
    // Recommendations based on analytics
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Personalized Recommendations:', 20, yPos);
    yPos += lineHeight;
    
    this.doc.setFont('helvetica', 'normal');
    const recommendations = this.generateRecommendations(analytics);
    recommendations.forEach(rec => {
      if (yPos > 280) {
        this.doc.addPage();
        yPos = 30;
      }
      this.doc.text(`• ${rec}`, 25, yPos);
      yPos += lineHeight;
    });
    
    // Footer
    yPos += lineHeight * 2;
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Generated by NITS PS1 Analytics Engine', 20, yPos);
    this.doc.text(`Report generated on ${new Date().toLocaleString()}`, 20, yPos + 10);
  }

  private generateRecommendations(analytics: UserAnalytics): string[] {
    const recommendations = [];
    
    if (analytics.averageSessionDuration < 1500) { // Less than 25 minutes
      recommendations.push('Try extending your focus sessions to 25-30 minutes for better flow state.');
    }
    
    if (analytics.productivityScore < 70) {
      recommendations.push('Consider using the Pomodoro technique to boost your productivity.');
    }
    
    if (analytics.streakDays < 3) {
      recommendations.push('Build consistency by setting daily focus goals.');
    }
    
    if (analytics.wellnessScore < 80) {
      recommendations.push('Take regular breaks and practice mindfulness during sessions.');
    }
    
    if (analytics.codeSessionsCount > analytics.whiteboardSessionsCount * 3) {
      recommendations.push('Balance coding with planning - try more whiteboard sessions.');
    }
    
    recommendations.push('Keep up the great work! Consistency is key to long-term success.');
    
    return recommendations;
  }
}

export const pdfGenerator = new PDFReportGenerator();

export async function generatePDFReport(user: any, analytics: any): Promise<Buffer> {
  const reportData = {
    user,
    sessions: [],
    analytics,
    codeReports: [],
    whiteboardAnalytics: []
  };

  const pdfDoc = pdfGenerator.generate(reportData);
  return Buffer.from(pdfDoc.output('arraybuffer'));
}