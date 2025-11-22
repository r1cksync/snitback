import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';
import { analyzeSentiment, classifyText, predictFatigue } from '@/lib/huggingface';

// POST: ML operations via Hugging Face
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { operation, data } = body;

    if (!operation) {
      return errorResponse('operation is required', 400);
    }

    let result: any;

    switch (operation) {
      case 'sentiment':
        if (!data.text) {
          return errorResponse('text is required for sentiment analysis', 400);
        }
        result = await analyzeSentiment(data.text);
        break;

      case 'classify':
        if (!data.text) {
          return errorResponse('text is required for classification', 400);
        }
        result = await classifyText(data.text);
        break;

      case 'predict-fatigue':
        if (!data.metrics) {
          return errorResponse('metrics are required for fatigue prediction', 400);
        }
        result = await predictFatigue(data.metrics);
        break;

      default:
        return errorResponse('Invalid operation', 400);
    }

    return successResponse({ result });
  } catch (error) {
    console.error('ML operation error:', error);
    return errorResponse('Failed to perform ML operation');
  }
}
