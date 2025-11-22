import axios from 'axios';

const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const hfClient = axios.create({
  headers: {
    Authorization: `Bearer ${HF_API_KEY}`,
  },
});

export interface SentimentResult {
  label: string;
  score: number;
}

export async function analyzeSentiment(text: string): Promise<SentimentResult[]> {
  try {
    const response = await hfClient.post(
      `${HF_API_URL}/distilbert-base-uncased-finetuned-sst-2-english`,
      { inputs: text }
    );
    return response.data[0];
  } catch (error) {
    console.error('Hugging Face sentiment analysis error:', error);
    throw new Error('Failed to analyze sentiment');
  }
}

export interface ClassificationResult {
  label: string;
  score: number;
}

export async function classifyText(text: string, model = 'facebook/bart-large-mnli'): Promise<ClassificationResult[]> {
  try {
    const response = await hfClient.post(`${HF_API_URL}/${model}`, {
      inputs: text,
      parameters: {
        candidate_labels: ['focused', 'distracted', 'stressed', 'relaxed', 'productive'],
      },
    });
    return response.data.labels.map((label: string, i: number) => ({
      label,
      score: response.data.scores[i],
    }));
  } catch (error) {
    console.error('Hugging Face classification error:', error);
    throw new Error('Failed to classify text');
  }
}

export interface EmbeddingResult {
  embeddings: number[];
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await hfClient.post(
      `${HF_API_URL}/sentence-transformers/all-MiniLM-L6-v2`,
      { inputs: texts }
    );
    return response.data;
  } catch (error) {
    console.error('Hugging Face embeddings error:', error);
    throw new Error('Failed to generate embeddings');
  }
}

export async function detectAnomalies(data: number[]): Promise<{ isAnomaly: boolean; score: number }> {
  // Simple statistical anomaly detection
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  const lastValue = data[data.length - 1];
  const zScore = Math.abs((lastValue - mean) / stdDev);
  
  return {
    isAnomaly: zScore > 2, // 2 standard deviations
    score: zScore,
  };
}

export async function predictFatigue(metrics: {
  typingSpeed: number[];
  errorRate: number[];
  pauseDuration: number[];
}): Promise<{ fatigueLevel: number; recommendation: string }> {
  // Combine metrics for fatigue prediction
  const typingTrend = metrics.typingSpeed.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const errorTrend = metrics.errorRate.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const pauseTrend = metrics.pauseDuration.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  // Simple fatigue score (0-100)
  const baselineTyping = metrics.typingSpeed[0] || 60;
  const typingDrop = Math.max(0, (baselineTyping - typingTrend) / baselineTyping);
  const fatigueLevel = Math.min(100, (typingDrop * 40 + errorTrend * 30 + pauseTrend * 0.3));
  
  let recommendation = 'Keep going! You\'re doing great.';
  if (fatigueLevel > 70) {
    recommendation = 'Take a 10-minute break. You\'re showing signs of fatigue.';
  } else if (fatigueLevel > 40) {
    recommendation = 'Consider a 2-minute breathing exercise to refresh.';
  }
  
  return { fatigueLevel: Math.round(fatigueLevel), recommendation };
}
