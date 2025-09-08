import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/db/prisma";
import { createBillingAuthRequest, SUBSCRIPTION_PLANS } from "@/lib/payments/toss-billing-v2";

// 빌링키 등록 요청 (구독 시작)
export async function POST(req: NextRequest) {
  try {
    console.log('=== Billing register API called ===');
    
    const user = await getUser();
    console.log('User from getUser():', user ? { id: user.id, email: user.email } : 'null');
    
    if (!user) {
      console.log('User not authenticated');
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log('Request body:', body);
    
    const { planId } = body;
    
    console.log('Plan ID received:', planId);
    
    if (!planId || !["PERSONAL", "HEAVY", "ENTERPRISE"].includes(planId)) {
      console.log('Invalid plan ID:', planId);
      return NextResponse.json(
        { error: "유효하지 않은 플랜입니다" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회 또는 생성
    console.log('Looking up user in database...');
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    
    console.log('DB User found:', dbUser ? { id: dbUser.id, email: dbUser.email } : 'null');

    if (!dbUser) {
      console.log('Creating new user in database...');
      // 신규 사용자 생성
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || "사용자",
          avatarUrl: user.user_metadata?.avatar_url,
        },
      });
      console.log('New user created:', { id: dbUser.id, email: dbUser.email });
    }

    // 빌링키 등록 요청 생성 (v2 API)
    console.log('Creating billing auth request...');
    const billingAuthRequest = await createBillingAuthRequest(
      dbUser.id,
      planId,
      user.email || "",
      user.user_metadata?.full_name || user.email?.split('@')[0] || undefined
    );
    
    console.log('Billing auth request created:', billingAuthRequest);

    const response = {
      success: true,
      billingAuthRequest,
      planInfo: SUBSCRIPTION_PLANS[planId],
    };
    
    console.log('Returning successful response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Billing register error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "빌링키 등록 요청 생성 실패",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}