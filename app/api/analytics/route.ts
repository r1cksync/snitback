import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import FlowSession from '@/models/FlowSession';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week'; // week, month, all

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = startOfWeek(endDate);
        break;
      case 'month':
        startDate = startOfMonth(endDate);
        break;
      case 'year':
        startDate = subDays(endDate, 365);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const sessions = await FlowSession.find({
      userId: auth.userId,
      startTime: { $gte: startDate, $lte: endDate },
    }).lean();

    // Calculate analytics
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum: number, s: any) => sum + s.duration, 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const avgQualityScore = totalSessions > 0 
      ? sessions.reduce((sum: number, s: any) => sum + s.qualityScore, 0) / totalSessions 
      : 0;

    // Flow triggers analysis
    const triggersMap = new Map<string, number>();
    sessions.forEach((s: any) => {
      s.triggers.forEach((t: string) => {
        triggersMap.set(t, (triggersMap.get(t) || 0) + 1);
      });
    });

    // Flow breakers analysis
    const breakersMap = new Map<string, number>();
    sessions.forEach((s: any) => {
      s.breakers.forEach((b: string) => {
        breakersMap.set(b, (breakersMap.get(b) || 0) + 1);
      });
    });

    // Best time analysis (group by hour)
    const hourMap = new Map<number, { count: number; totalQuality: number }>();
    sessions.forEach((s: any) => {
      const hour = new Date(s.startTime).getHours();
      const existing = hourMap.get(hour) || { count: 0, totalQuality: 0 };
      hourMap.set(hour, {
        count: existing.count + 1,
        totalQuality: existing.totalQuality + s.qualityScore,
      });
    });

    const bestHours = Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        sessions: data.count,
        avgQuality: data.totalQuality / data.count,
      }))
      .sort((a, b) => b.avgQuality - a.avgQuality)
      .slice(0, 3);

    const analytics = {
      totalSessions,
      totalDuration,
      avgDuration: Math.round(avgDuration),
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      topTriggers: Array.from(triggersMap.entries())
        .map(([trigger, count]) => ({ trigger, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topBreakers: Array.from(breakersMap.entries())
        .map(([breaker, count]) => ({ breaker, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      bestHours,
      sessionsOverTime: sessions.map((s: any) => ({
        date: s.startTime,
        duration: s.duration,
        quality: s.qualityScore,
      })),
    };

    return successResponse({ analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    return errorResponse('Failed to generate analytics');
  }
}
