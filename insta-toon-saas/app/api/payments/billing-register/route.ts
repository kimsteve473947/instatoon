import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db/prisma";
import { createBillingAuthRequest, SUBSCRIPTION_PLANS } from "@/lib/payments/toss-billing-v2";

// 빌링키 등록 요청 (구독 시작)
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { planId } = await req.json();
    
    if (!planId || !["PERSONAL", "HEAVY", "ENTERPRISE"].includes(planId)) {
      return NextResponse.json(
        { error: "유효하지 않은 플랜입니다" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회 또는 생성
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      // 신규 사용자 생성
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || "사용자",
          imageUrl: user.user_metadata?.avatar_url,
        },
      });
    }

    // 빌링키 등록 요청 생성 (v2 API)
    const billingAuthRequest = await createBillingAuthRequest(
      dbUser.id,
      planId,
      user.email || "",
      user.user_metadata?.full_name || user.email?.split('@')[0] || undefined
    );

    return NextResponse.json({
      success: true,
      billingAuthRequest,
      planInfo: SUBSCRIPTION_PLANS[planId],
    });
  } catch (error) {
    console.error("Billing register error:", error);
    return NextResponse.json(
      { error: "빌링키 등록 요청 생성 실패" },
      { status: 500 }
    );
  }
}