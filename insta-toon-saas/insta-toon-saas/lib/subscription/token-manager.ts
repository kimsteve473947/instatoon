import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan, TransactionType, TransactionStatus } from "@prisma/client";

// Gemini 2.5 Flash 이미지 생성 토큰 소비량 기준
// 실제 Gemini API: 이미지당 약 1,290 토큰 (100만 토큰당 $30)
// 이미지당 원가: 약 52원 (1,290 토큰 × $0.00003 × 1,330원/달러)
const GEMINI_COST = {
  TOKENS_PER_IMAGE: 1290,           // Gemini 실제 토큰 소비량
  COST_PER_MILLION: 30,              // $30 per 1M tokens
  USD_TO_KRW: 1330,                   // 환율
  COST_PER_IMAGE_KRW: 52,            // 이미지당 원가 (원)
} as const;

// 플랫폼 토큰 설정 (수익 마진 고려)
const PLATFORM_PRICING = {
  TOKENS_PER_IMAGE: 1,                 // 플랫폼 토큰: 1이미지 = 1토큰
  HIGH_RESOLUTION_TOKENS: 0.5,        // 고해상도 추가 토큰
  CHARACTER_SAVE_TOKENS: 0.2,          // 캐릭터 저장 토큰
  MARGIN_MULTIPLIER: 2.5,              // 2.5배 마진 (원가 52원 → 판매 130원)
} as const;

// 구독 플랜 설정 (2.5배 마진 기준)
const SUBSCRIPTION_CONFIG = {
  FREE: {
    name: '무료',
    price: 0,                          // 무료
    platformTokens: 10,                // 10 토큰 제공
    maxImages: 10,                     // 월 이미지 생성 한도
    dailyLimit: 3,                     // 일일 생성 한도
    maxCharacters: 1,
    estimatedCost: 520,                // 예상 원가 (10 × 52원)
    profit: -520,                      // 무료 플랜
  },
  PRO: {
    name: '프로',
    price: 30000,                      // 월 3만원
    platformTokens: 500000,            // 50만 토큰 제공
    maxImages: 500000,                 // 월 이미지 생성 한도
    dailyLimit: 20000,                 // 일일 생성 한도 (충분히 큰 값)
    maxCharacters: 3,
    estimatedCost: 26000000,           // 예상 원가 (500000 × 52원) - 실제로는 이렇게 많이 쓰지 않을 것
    profit: -25970000,                 // 토큰 기반 계산이므로 실제 사용량에 따라 달라짐
  },
  PREMIUM: {
    name: '프리미엄',
    price: 100000,                     // 월 10만원
    platformTokens: 2000000,           // 200만 토큰 제공
    maxImages: 2000000,                // 월 이미지 생성 한도
    dailyLimit: 80000,                 // 일일 생성 한도 (충분히 큰 값)
    maxCharacters: 5,
    estimatedCost: 104000000,          // 예상 원가 (2000000 × 52원) - 실제로는 이렇게 많이 쓰지 않을 것
    profit: -103900000,                // 토큰 기반 계산이므로 실제 사용량에 따라 달라짐
  },
} as const;

// 토큰 관리 서비스
export class TokenManager {
  private dailyUsageCache: Map<string, { date: string; count: number }> = new Map();

  // 토큰 사용 (이미지 생성)
  async useTokensForImage(
    userId: string, 
    imageCount: number,
    options?: {
      highResolution?: boolean;
      saveCharacter?: boolean;
    }
  ): Promise<{
    success: boolean;
    remainingTokens?: number;
    dailyRemaining?: number;
    error?: string;
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { user: true },
      });

      if (!subscription) {
        return { 
          success: false, 
          error: "구독 정보를 찾을 수 없습니다" 
        };
      }

      // 일일 한도 체크
      const dailyCheck = await this.checkDailyLimit(userId, subscription.plan);
      if (!dailyCheck.allowed) {
        return {
          success: false,
          error: `일일 생성 한도 초과 (${dailyCheck.used}/${dailyCheck.limit})`,
          remainingTokens: subscription.tokensTotal - subscription.tokensUsed,
          dailyRemaining: 0,
        };
      }

      // 필요 토큰 계산 (소수점 처리)
      let requiredTokens = imageCount * PLATFORM_PRICING.TOKENS_PER_IMAGE;
      if (options?.highResolution) {
        requiredTokens += imageCount * PLATFORM_PRICING.HIGH_RESOLUTION_TOKENS;
      }
      if (options?.saveCharacter) {
        requiredTokens += PLATFORM_PRICING.CHARACTER_SAVE_TOKENS;
      }
      requiredTokens = Math.ceil(requiredTokens); // 올림 처리

      const remainingTokens = subscription.tokensTotal - subscription.tokensUsed;
      
      if (remainingTokens < requiredTokens) {
        return {
          success: false,
          error: `토큰 부족 (필요: ${requiredTokens}, 보유: ${remainingTokens})`,
          remainingTokens,
          dailyRemaining: dailyCheck.limit - dailyCheck.used,
        };
      }

      // 토큰 차감
      await prisma.subscription.update({
        where: { userId },
        data: {
          tokensUsed: subscription.tokensUsed + requiredTokens,
        },
      });

      // 사용 내역 기록 (원가 추적용)
      const actualGeminiTokens = imageCount * GEMINI_COST.TOKENS_PER_IMAGE;
      const estimatedCost = Math.round(
        (actualGeminiTokens / 1000000) * 
        GEMINI_COST.COST_PER_MILLION * 
        GEMINI_COST.USD_TO_KRW
      );

      await prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.TOKEN_PURCHASE,
          tokens: -requiredTokens,
          amount: estimatedCost, // 원가 기록
          status: TransactionStatus.COMPLETED,
          description: `이미지 생성: ${imageCount}장 (${requiredTokens}토큰)`,
        },
      });
      
      // metadata는 별도 테이블에 저장 (필요시)
      // 또는 description에 JSON 문자열로 포함

      // 일일 사용량 업데이트
      await this.updateDailyUsage(userId, imageCount);

      return {
        success: true,
        remainingTokens: remainingTokens - requiredTokens,
        dailyRemaining: dailyCheck.limit - dailyCheck.used - imageCount,
      };
    } catch (error) {
      console.error("Token usage error:", error);
      return {
        success: false,
        error: "토큰 사용 중 오류가 발생했습니다",
      };
    }
  }

  // 일일 한도 체크
  private async checkDailyLimit(
    userId: string,
    plan: SubscriptionPlan
  ): Promise<{ allowed: boolean; used: number; limit: number }> {
    const config = SUBSCRIPTION_CONFIG[plan as keyof typeof SUBSCRIPTION_CONFIG];
    if (!config) {
      return { allowed: false, used: 0, limit: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyUsage = await prisma.transaction.count({
      where: {
        userId,
        type: TransactionType.TOKEN_PURCHASE,
        createdAt: { gte: today },
        tokens: { lt: 0 }, // 사용 내역만
        description: { contains: "이미지 생성" },
      },
    });

    return {
      allowed: dailyUsage < config.dailyLimit,
      used: dailyUsage,
      limit: config.dailyLimit,
    };
  }

  // 일일 사용량 캐시 업데이트
  private async updateDailyUsage(userId: string, count: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const cached = this.dailyUsageCache.get(userId);
    
    if (cached && cached.date === today) {
      cached.count += count;
    } else {
      this.dailyUsageCache.set(userId, { date: today, count });
    }
  }

  // 토큰 잔액 조회 (상세 정보)
  async getBalance(userId: string): Promise<{
    balance: number;
    used: number;
    total: number;
    dailyUsed: number;
    dailyLimit: number;
    estimatedImagesRemaining: number;
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return {
          balance: 0,
          used: 0,
          total: 0,
          dailyUsed: 0,
          dailyLimit: 0,
          estimatedImagesRemaining: 0,
        };
      }

      const config = SUBSCRIPTION_CONFIG[subscription.plan as keyof typeof SUBSCRIPTION_CONFIG];
      const dailyCheck = await this.checkDailyLimit(userId, subscription.plan);
      const balance = subscription.tokensTotal - subscription.tokensUsed;

      return {
        balance,
        used: subscription.tokensUsed,
        total: subscription.tokensTotal,
        dailyUsed: dailyCheck.used,
        dailyLimit: dailyCheck.limit,
        estimatedImagesRemaining: Math.floor(balance / PLATFORM_PRICING.TOKENS_PER_IMAGE),
      };
    } catch (error) {
      console.error("Get balance error:", error);
      return {
        balance: 0,
        used: 0,
        total: 0,
        dailyUsed: 0,
        dailyLimit: 0,
        estimatedImagesRemaining: 0,
      };
    }
  }

  // 월간 토큰 리셋 (구독 갱신시)
  async resetMonthlyTokens(userId: string, plan: SubscriptionPlan): Promise<void> {
    try {
      const config = SUBSCRIPTION_CONFIG[plan as keyof typeof SUBSCRIPTION_CONFIG];
      if (!config) {
        throw new Error("잘못된 구독 플랜입니다");
      }
      
      await prisma.subscription.update({
        where: { userId },
        data: {
          tokensTotal: config.platformTokens,
          tokensUsed: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 캐시 초기화
      this.dailyUsageCache.delete(userId);
    } catch (error) {
      console.error("Reset monthly tokens error:", error);
      throw error;
    }
  }

  // 수익성 분석
  async getMonthlyProfitAnalysis(userId: string): Promise<{
    revenue: number;
    actualCost: number;
    profit: number;
    margin: number;
    imageCount: number;
  }> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return {
          revenue: 0,
          actualCost: 0,
          profit: 0,
          margin: 0,
          imageCount: 0,
        };
      }

      const config = SUBSCRIPTION_CONFIG[subscription.plan as keyof typeof SUBSCRIPTION_CONFIG];
      if (!config) {
        return {
          revenue: 0,
          actualCost: 0,
          profit: 0,
          margin: 0,
          imageCount: 0,
        };
      }

      // 이번 달 사용 내역
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyUsage = await prisma.transaction.findMany({
        where: {
          userId,
          type: TransactionType.TOKEN_PURCHASE,
          createdAt: { gte: startOfMonth },
          tokens: { lt: 0 },
        },
      });

      // 실제 이미지 생성 수와 원가 계산
      let totalImages = 0;
      let totalCost = 0;

      monthlyUsage.forEach(usage => {
        // description에서 이미지 수 추출
        const match = usage.description?.match(/이미지 생성: (\d+)장/);
        if (match) {
          const imageCount = parseInt(match[1]);
          totalImages += imageCount;
          totalCost += imageCount * GEMINI_COST.COST_PER_IMAGE_KRW;
        }
      });

      const revenue = config.price;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        revenue,
        actualCost: totalCost,
        profit,
        margin: Math.round(margin),
        imageCount: totalImages,
      };
    } catch (error) {
      console.error("Profit analysis error:", error);
      return {
        revenue: 0,
        actualCost: 0,
        profit: 0,
        margin: 0,
        imageCount: 0,
      };
    }
  }

  // 사용 내역 조회
  async getUsageHistory(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    date: Date;
    tokens: number;
    description: string;
    imageCount?: number;
    cost?: number;
  }>> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          tokens: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return transactions.map(t => {
        // description에서 이미지 수 추출
        const match = t.description?.match(/이미지 생성: (\d+)장/);
        const imageCount = match ? parseInt(match[1]) : undefined;
        
        return {
          date: t.createdAt,
          tokens: Math.abs(t.tokens || 0),
          description: t.description || "",
          imageCount,
          cost: imageCount ? imageCount * GEMINI_COST.COST_PER_IMAGE_KRW : undefined,
        };
      });
    } catch (error) {
      console.error("Get usage history error:", error);
      return [];
    }
  }

  // 토큰 부족 알림 확인
  async checkLowBalance(userId: string): Promise<{
    isLow: boolean;
    balance: number;
    canGenerateImages: number;
  }> {
    const balanceInfo = await this.getBalance(userId);
    const canGenerate = Math.floor(balanceInfo.balance / PLATFORM_PRICING.TOKENS_PER_IMAGE);
    
    return {
      isLow: canGenerate < 5, // 5장 미만 생성 가능시 알림
      balance: balanceInfo.balance,
      canGenerateImages: canGenerate,
    };
  }

  // 추천인 보상 (수익성 고려)
  async grantReferralReward(
    referrerId: string,
    referredId: string
  ): Promise<void> {
    try {
      // 이미 보상을 받았는지 확인
      const existingReward = await prisma.referralReward.findUnique({
        where: {
          referrerId_referredId: {
            referrerId,
            referredId,
          },
        },
      });

      if (existingReward) {
        return;
      }

      // 추천인: 20토큰 (20이미지, 약 1040원 가치)
      await this.addTokens(referrerId, 20);
      
      // 가입자: 10토큰 (10이미지, 약 520원 가치)
      await this.addTokens(referredId, 10);

      // 보상 기록
      await prisma.referralReward.create({
        data: {
          referrerId,
          referredId,
          tokensRewarded: 20,
        },
      });
    } catch (error) {
      console.error("Grant referral reward error:", error);
      throw error;
    }
  }

  // 토큰 추가 (관리자용 및 내부 사용)
  async addTokens(userId: string, amount: number): Promise<void> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new Error("구독 정보를 찾을 수 없습니다");
    }

    await prisma.subscription.update({
      where: { userId },
      data: {
        tokensTotal: subscription.tokensTotal + amount,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.TOKEN_PURCHASE,
        tokens: amount,
        amount: 0,
        status: TransactionStatus.COMPLETED,
        description: `토큰 보너스: ${amount}개`,
      },
    });
  }
}

// 싱글톤 인스턴스
export const tokenManager = new TokenManager();