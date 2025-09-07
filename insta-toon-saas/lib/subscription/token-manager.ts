import { prisma } from "@/lib/db/prisma";
import { SubscriptionPlan, TransactionType, TransactionStatus } from "@prisma/client";

// 토큰 관리 서비스
export class TokenManager {
  // 토큰 사용
  async useTokens(userId: string, amount: number): Promise<boolean> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error("구독 정보를 찾을 수 없습니다");
      }

      const remainingTokens = subscription.tokensTotal - subscription.tokensUsed;
      
      if (remainingTokens < amount) {
        return false; // 토큰 부족
      }

      // 토큰 차감
      await prisma.subscription.update({
        where: { userId },
        data: {
          tokensUsed: subscription.tokensUsed + amount,
        },
      });

      // 사용 내역 기록
      await prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.TOKEN_PURCHASE,
          tokens: -amount,
          amount: 0,
          status: TransactionStatus.COMPLETED,
          description: `토큰 사용: ${amount}개`,
        },
      });

      return true;
    } catch (error) {
      console.error("Token usage error:", error);
      throw error;
    }
  }

  // 토큰 잔액 확인
  async getBalance(userId: string): Promise<number> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return 0;
      }

      return subscription.tokensTotal - subscription.tokensUsed;
    } catch (error) {
      console.error("Get balance error:", error);
      return 0;
    }
  }

  // 토큰 충전
  async addTokens(userId: string, amount: number): Promise<void> {
    try {
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

      // 충전 내역 기록
      await prisma.transaction.create({
        data: {
          userId,
          type: TransactionType.TOKEN_PURCHASE,
          tokens: amount,
          amount: 0,
          status: TransactionStatus.COMPLETED,
          description: `토큰 충전: ${amount}개`,
        },
      });
    } catch (error) {
      console.error("Add tokens error:", error);
      throw error;
    }
  }

  // 월간 토큰 리셋 (구독 갱신시)
  async resetMonthlyTokens(userId: string, plan: SubscriptionPlan): Promise<void> {
    try {
      const tokenLimits = this.getTokensByPlan(plan);
      
      await prisma.subscription.update({
        where: { userId },
        data: {
          tokensTotal: tokenLimits,
          tokensUsed: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        },
      });
    } catch (error) {
      console.error("Reset monthly tokens error:", error);
      throw error;
    }
  }

  // 플랜별 토큰 수
  private getTokensByPlan(plan: SubscriptionPlan): number {
    const tokenMap = {
      [SubscriptionPlan.FREE]: 10,
      [SubscriptionPlan.PERSONAL]: 500000,
      [SubscriptionPlan.HEAVY]: 2000000,
      [SubscriptionPlan.ENTERPRISE]: 5000000,
    };
    
    return tokenMap[plan] || 10;
  }

  // 사용 내역 조회
  async getUsageHistory(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    date: Date;
    tokens: number;
    description: string;
  }>> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          tokens: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          createdAt: true,
          tokens: true,
          description: true,
        },
      });

      return transactions.map(t => ({
        date: t.createdAt,
        tokens: t.tokens || 0,
        description: t.description || "",
      }));
    } catch (error) {
      console.error("Get usage history error:", error);
      return [];
    }
  }

  // 토큰 사용 통계
  async getUsageStats(userId: string): Promise<{
    todayUsage: number;
    weekUsage: number;
    monthUsage: number;
    totalUsage: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setMonth(now.getMonth() - 1));

      const [today, week, month, total] = await Promise.all([
        this.getUsageInPeriod(userId, todayStart),
        this.getUsageInPeriod(userId, weekStart),
        this.getUsageInPeriod(userId, monthStart),
        this.getTotalUsage(userId),
      ]);

      return {
        todayUsage: today,
        weekUsage: week,
        monthUsage: month,
        totalUsage: total,
      };
    } catch (error) {
      console.error("Get usage stats error:", error);
      return {
        todayUsage: 0,
        weekUsage: 0,
        monthUsage: 0,
        totalUsage: 0,
      };
    }
  }

  // 특정 기간 사용량
  private async getUsageInPeriod(
    userId: string,
    startDate: Date
  ): Promise<number> {
    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        createdAt: { gte: startDate },
        tokens: { lt: 0 }, // 사용만 계산 (음수)
      },
      _sum: {
        tokens: true,
      },
    });

    return Math.abs(result._sum.tokens || 0);
  }

  // 총 사용량
  private async getTotalUsage(userId: string): Promise<number> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    return subscription?.tokensUsed || 0;
  }

  // 토큰 부족 알림 확인
  async checkLowBalance(userId: string): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance < 10; // 10개 미만이면 알림
  }

  // 추천인 보상
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
        return; // 이미 보상 지급됨
      }

      // 추천인에게 50토큰
      await this.addTokens(referrerId, 50);
      
      // 가입자에게 20토큰
      await this.addTokens(referredId, 20);

      // 보상 기록
      await prisma.referralReward.create({
        data: {
          referrerId,
          referredId,
          tokensRewarded: 50,
        },
      });
    } catch (error) {
      console.error("Grant referral reward error:", error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const tokenManager = new TokenManager();