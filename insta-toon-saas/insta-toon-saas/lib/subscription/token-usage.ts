import { createClient } from "@/lib/supabase/server";

// 토큰 사용량 기록 인터페이스
interface TokenUsageRecord {
  userId: string;
  serviceType: 'text_generation' | 'image_generation';
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  metadata?: Record<string, any>;
}

// Google AI API 모델별 정보
export const AI_MODELS = {
  TEXT_GENERATION: 'gemini-2.0-flash-exp',
  IMAGE_GENERATION: 'gemini-2-5-flash-image-preview'
} as const;

// 모델별 토큰 비용 (Google AI Pricing 기준, per 1K tokens)
export const TOKEN_COSTS = {
  [AI_MODELS.TEXT_GENERATION]: {
    input: 0.000075,   // $0.000075 per 1K input tokens
    output: 0.0003     // $0.0003 per 1K output tokens
  },
  [AI_MODELS.IMAGE_GENERATION]: {
    input: 0.0025,     // $0.0025 per 1K input tokens
    output: 0.01       // $0.01 per 1K output tokens
  }
} as const;

/**
 * 실제 API 토큰 사용량을 기록하고 사용자 잔액에서 차감
 * ⚠️ 중요: Google AI API의 실제 토큰 사용량만 사용!
 */
export async function recordTokenUsage({
  userId,
  serviceType,
  modelName,
  promptTokens,
  completionTokens,
  totalTokens,
  metadata = {}
}: TokenUsageRecord) {
  const supabase = await createClient();
  
  try {
    console.log(`📊 Recording token usage:`, {
      supabaseUserId: userId.substring(0, 8) + '...',
      serviceType,
      modelName,
      promptTokens,
      completionTokens,
      totalTokens
    });

    // ✅ Supabase 사용자 ID를 internal user ID로 변환
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', userId)
      .single();

    if (!userData) {
      throw new Error(`User not found for Supabase ID: ${userId}`);
    }

    const internalUserId = userData.id;
    console.log(`🔄 ID 변환: ${userId.substring(0, 8)}... → ${internalUserId.substring(0, 8)}...`);

    // 1. 토큰 사용량 상세 기록
    const { error: usageError } = await supabase
      .from('token_usage')
      .insert({
        userId: internalUserId, // ✅ internal user ID 사용
        service_type: serviceType,
        model_name: modelName,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        api_cost: calculateTokenCost(modelName, promptTokens, completionTokens),
        metadata,
        created_at: new Date().toISOString()
      });

    if (usageError) {
      console.error('❌ Token usage record failed:', usageError);
      throw usageError;
    }

    // 2. 사용자 잔액에서 실제 토큰 차감 (subscription 테이블도 internal ID 사용)
    const { error: deductError } = await supabase.rpc('deduct_user_tokens', {
      user_id: internalUserId, // ✅ internal user ID 사용
      tokens_used: totalTokens
    });

    if (deductError) {
      console.error('❌ Token deduction failed:', deductError);
      throw deductError;
    }

    console.log(`✅ Successfully recorded ${totalTokens} tokens for ${serviceType}`);
    
    return {
      success: true,
      tokensUsed: totalTokens,
      cost: calculateTokenCost(modelName, promptTokens, completionTokens)
    };

  } catch (error) {
    console.error('❌ Token usage recording failed:', error);
    throw new Error('토큰 사용량 기록 실패');
  }
}

/**
 * Google AI API 응답에서 토큰 사용량 추출
 */
export function extractTokenUsage(apiResponse: any) {
  const usage = apiResponse?.response?.usageMetadata;
  
  if (!usage) {
    console.warn('⚠️ No usage metadata in API response');
    return null;
  }

  return {
    promptTokens: usage.promptTokenCount || 0,
    completionTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0
  };
}

/**
 * 모델별 토큰 비용 계산
 */
function calculateTokenCost(modelName: string, promptTokens: number, completionTokens: number): number {
  const costs = TOKEN_COSTS[modelName as keyof typeof TOKEN_COSTS];
  
  if (!costs) {
    console.warn(`⚠️ Unknown model for cost calculation: ${modelName}`);
    return 0;
  }

  const inputCost = (promptTokens / 1000) * costs.input;
  const outputCost = (completionTokens / 1000) * costs.output;
  
  return inputCost + outputCost;
}

/**
 * 사용자별 토큰 사용량 통계 조회
 */
export async function getUserTokenStats(userId: string, days: number = 30) {
  const supabase = await createClient();
  
  const { data: stats } = await supabase
    .from('token_usage')
    .select(`
      service_type,
      model_name,
      total_tokens,
      api_cost,
      created_at
    `)
    .eq('userId', userId)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (!stats) return null;

  // 서비스별 통계 계산
  const textGeneration = stats.filter(s => s.service_type === 'text_generation');
  const imageGeneration = stats.filter(s => s.service_type === 'image_generation');

  return {
    totalRequests: stats.length,
    totalTokens: stats.reduce((sum, s) => sum + s.total_tokens, 0),
    totalCost: stats.reduce((sum, s) => sum + (s.api_cost || 0), 0),
    textGeneration: {
      requests: textGeneration.length,
      tokens: textGeneration.reduce((sum, s) => sum + s.total_tokens, 0),
      cost: textGeneration.reduce((sum, s) => sum + (s.api_cost || 0), 0)
    },
    imageGeneration: {
      requests: imageGeneration.length,
      tokens: imageGeneration.reduce((sum, s) => sum + s.total_tokens, 0),
      cost: imageGeneration.reduce((sum, s) => sum + (s.api_cost || 0), 0)
    },
    dailyStats: groupByDay(stats)
  };
}

/**
 * 일별 통계 그룹화
 */
function groupByDay(stats: any[]) {
  const dailyMap = new Map();
  
  stats.forEach(stat => {
    const date = stat.created_at.split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        textTokens: 0,
        imageTokens: 0,
        totalTokens: 0,
        requests: 0
      });
    }
    
    const day = dailyMap.get(date);
    day.requests++;
    day.totalTokens += stat.total_tokens;
    
    if (stat.service_type === 'text_generation') {
      day.textTokens += stat.total_tokens;
    } else {
      day.imageTokens += stat.total_tokens;
    }
  });
  
  return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}