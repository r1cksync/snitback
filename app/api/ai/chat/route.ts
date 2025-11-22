import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, errorResponse, successResponse } from '@/lib/middleware';
import { generateChatCompletion, analyzeFlowPattern, generateFlowCoachResponse } from '@/lib/groq';

// POST: Generate AI chat completion
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return unauthorizedResponse();

    const body = await req.json();
    const { messages, type } = body;

    if (!messages || !Array.isArray(messages)) {
      return errorResponse('messages array is required', 400);
    }

    let response: string;

    switch (type) {
      case 'flow-analysis':
        const { sessionData } = body;
        if (!sessionData) {
          return errorResponse('sessionData is required for flow-analysis', 400);
        }
        response = await analyzeFlowPattern(sessionData);
        break;

      case 'coach':
        const userQuery = messages[messages.length - 1]?.content;
        const context = body.context;
        response = await generateFlowCoachResponse(userQuery, context);
        break;

      default:
        const completion = await generateChatCompletion({ messages });
        response = completion.choices[0]?.message?.content || 'No response generated';
    }

    return successResponse({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    return errorResponse('Failed to generate AI response');
  }
}
