import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChatParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export async function generateChatCompletion(params: GroqChatParams) {
  try {
    const completion = await groq.chat.completions.create({
      messages: params.messages,
      model: params.model || 'mixtral-8x7b-32768',
      temperature: params.temperature || 0.7,
      max_tokens: params.maxTokens || 1024,
      stream: params.stream || false,
    });

    return completion;
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate chat completion');
  }
}

export async function analyzeFlowPattern(sessionData: {
  typingSpeed: number[];
  tabSwitches: number[];
  mouseActivity: number[];
  duration: number;
}): Promise<string> {
  const prompt = `Analyze this focus session data and provide insights:
- Average typing speed variations: ${sessionData.typingSpeed.join(', ')}
- Tab switches per interval: ${sessionData.tabSwitches.join(', ')}
- Mouse activity levels: ${sessionData.mouseActivity.join(', ')}
- Total duration: ${sessionData.duration} seconds

Provide a brief analysis of the flow state quality and suggestions for improvement.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an AI coach specialized in focus and flow states. Provide concise, actionable insights.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const completion = await generateChatCompletion({ messages, maxTokens: 512 });
  return (completion as any).choices[0]?.message?.content || 'No analysis available';
}

export async function generateFlowCoachResponse(userQuery: string, context?: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a supportive AI Flow Coach. Help users understand their focus patterns, 
      overcome distractions, and build better concentration habits. Be encouraging and specific.
      ${context ? `User context: ${context}` : ''}`,
    },
    {
      role: 'user',
      content: userQuery,
    },
  ];

  const completion = await generateChatCompletion({ messages, maxTokens: 512 });
  return (completion as any).choices[0]?.message?.content || 'I apologize, I cannot help with that right now.';
}
