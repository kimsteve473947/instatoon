import { loadTossPayments } from "@tosspayments/payment-sdk";
import { prisma } from "@/lib/db/prisma";
import { tokenManager } from "@/lib/subscription/token-manager";
import { SubscriptionPlan } from "@prisma/client";

// Toss Payments 클라이언트 초기화
export async function getTossClient() {
  const tossPayments = await loadTossPayments(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
  );
  return tossPayments;
}

// 구독 플랜 정보
export const SUBSCRIPTION_PLANS = {
  PERSONAL: {
    id: "personal",
    name: "개인",
    price: 30000,
    tokens: 500000,
    characters: 3,
    projects: Infinity,
    description: "개인 창작자를 위한 플랜",
  },
  HEAVY: {
    id: "heavy",
    name: "헤비유저",
    price: 100000,
    tokens: 2000000,
    characters: 5,
    projects: Infinity,
    description: "전문 창작자를 위한 플랜",
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "기업",
    price: 200000,
    tokens: 5000000,
    characters: Infinity,
    projects: Infinity,
    description: "기업 및 팀을 위한 플랜",
  },
};

// 결제 요청 생성
export async function createPaymentRequest(
  userId: string,
  planId: keyof typeof SUBSCRIPTION_PLANS
) {
  const plan = SUBSCRIPTION_PLANS[planId];
  const orderId = `order_${Date.now()}_${userId}`;
  
  return {
    amount: plan.price,
    orderId,
    orderName: `인스타툰 ${plan.name} 플랜`,
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/success`,
    failUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/fail`,
    customerEmail: "", // Supabase에서 이메일 가져오기 필요
    customerName: "", // Supabase에서 이름 가져오기 필요
  };
}

// 구독 업그레이드
export async function upgradeSubscription(
  userId: string,
  planId: keyof typeof SUBSCRIPTION_PLANS,
  paymentKey: string
) {
  try {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    // 기존 구독 조회
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId },
    });
    
    if (!existingSubscription) {
      throw new Error("구독 정보를 찾을 수 없습니다");
    }
    
    // 구독 업데이트
    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        plan: planId as SubscriptionPlan,
        tokensTotal: plan.tokens,
        tokensUsed: 0,
        maxCharacters: plan.characters === Infinity ? 999 : plan.characters,
        maxProjects: plan.projects === Infinity ? 999 : plan.projects,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tossCustomerId: paymentKey,
      },
    });
    
    // 결제 기록 생성
    await prisma.transaction.create({
      data: {
        userId,
        type: "SUBSCRIPTION",
        amount: plan.price,
        tokens: plan.tokens,
        status: "COMPLETED",
        description: `${plan.name} 플랜 구독`,
        tossPaymentKey: paymentKey,
      },
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    throw error;
  }
}

// 일회성 토큰 구매
export async function purchaseTokens(
  userId: string,
  tokenAmount: number,
  price: number,
  paymentKey: string
) {
  try {
    // 토큰 추가
    await tokenManager.addTokens(userId, tokenAmount);
    
    // 결제 기록 생성
    await prisma.transaction.create({
      data: {
        userId,
        type: "TOKEN_PURCHASE",
        amount: price,
        tokens: tokenAmount,
        status: "COMPLETED",
        description: `토큰 ${tokenAmount}개 구매`,
        tossPaymentKey: paymentKey,
      },
    });
    
    return true;
  } catch (error) {
    console.error("Token purchase error:", error);
    throw error;
  }
}

// 결제 검증
export async function verifyPayment(paymentKey: string, orderId: string, amount: number) {
  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY! + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "결제 검증 실패");
    }
    
    const payment = await response.json();
    return payment;
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
}

// 구독 취소
export async function cancelSubscription(userId: string) {
  try {
    const subscription = await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
    
    return subscription;
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    throw error;
  }
}

// 환불 처리
export async function processRefund(
  userId: string,
  transactionId: string,
  refundAmount: number,
  reason: string
) {
  try {
    // 트랜잭션 조회
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    
    if (!transaction || !transaction.tossPaymentKey) {
      throw new Error("결제 정보를 찾을 수 없습니다");
    }
    
    // Toss API로 환불 요청
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${transaction.tossPaymentKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY! + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: reason,
          cancelAmount: refundAmount,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "환불 처리 실패");
    }
    
    // 트랜잭션 상태 업데이트
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "REFUNDED",
      },
    });
    
    // 환불 기록 생성
    await prisma.transaction.create({
      data: {
        userId,
        type: "REFUND",
        amount: -refundAmount,
        status: "COMPLETED",
        description: `환불: ${reason}`,
      },
    });
    
    return true;
  } catch (error) {
    console.error("Refund processing error:", error);
    throw error;
  }
}

// 결제 내역 조회
export async function getPaymentHistory(userId: string, limit = 10) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: ["SUBSCRIPTION", "TOKEN_PURCHASE", "REFUND"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    
    return transactions;
  } catch (error) {
    console.error("Get payment history error:", error);
    return [];
  }
}