import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tokenManager } from "@/lib/subscription/token-manager";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 내부 사용자 ID 찾기
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }
    
    const balance = await tokenManager.getBalance(userData.id);
    const isLow = await tokenManager.checkLowBalance(userData.id);
    
    return NextResponse.json({
      success: true,
      balance,
      isLowBalance: isLow,
    });
  } catch (error) {
    console.error("Get token balance error:", error);
    return NextResponse.json(
      { success: false, error: "토큰 잔액 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}