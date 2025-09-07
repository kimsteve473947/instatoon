import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { 
  issueBillingKey, 
  createOrUpdateSubscription,
  TossPaymentsError,
  SUBSCRIPTION_PLANS 
} from "@/lib/payments/toss-billing-v2";

// 빌링키 발급 성공 처리 (v2 API)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const planId = searchParams.get("planId");

    if (!authKey || !customerKey || !planId) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // planId 검증
    if (!SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { error: "잘못된 플랜 ID입니다" },
        { status: 400 }
      );
    }

    // customerKey에서 userId 추출 (customer_userId 형식)
    const userId = customerKey.replace("customer_", "");

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 빌링키 발급
    const { billingKey, card } = await issueBillingKey(authKey, customerKey);
    
    console.log(`Billing key issued for user ${userId}, plan: ${planId}`);

    // 구독 생성 또는 업데이트 (첫 결제 포함)
    const { subscription, payment } = await createOrUpdateSubscription(
      userId,
      planId as keyof typeof SUBSCRIPTION_PLANS,
      billingKey,
      customerKey,
      card
    );

    // 성공 페이지로 리다이렉트
    return NextResponse.redirect(
      new URL("/dashboard/billing/success", req.nextUrl.origin)
    );
  } catch (error) {
    console.error("Billing success error:", error);
    
    // 사용자 친화적 에러 메시지로 리다이렉트
    const errorMessage = error instanceof TossPaymentsError 
      ? error.getUserFriendlyMessage()
      : "결제 처리 중 오류가 발생했습니다";
    
    return NextResponse.redirect(
      new URL(`/dashboard/billing/error?message=${encodeURIComponent(errorMessage)}`, req.nextUrl.origin)
    );
  }
}