import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoBananaService } from "@/lib/ai/nano-banana-service";
import { tokenManager } from "@/lib/subscription/token-manager";
import { canUploadFile } from "@/lib/storage/storage-manager";
import { characterReferenceManager } from "@/lib/ai/character-reference-manager";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30초 타임아웃

export async function POST(request: NextRequest) {
  try {
    // 실제 사용자 인증 (실제 서비스 준비 완료)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log(`👤 인증된 사용자: ${userId}`);

    const body = await request.json();
    const { prompt, characterIds, projectId, panelId, settings, aspectRatio } = body;
    
    console.log('📥 Received request with projectId:', projectId, 'panelId:', panelId);

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "프롬프트가 필요합니다" },
        { status: 400 }
      );
    }

    // 실제 토큰 잔액 확인 (실제 서비스 준비 완료)
    const balanceInfo = await tokenManager.getBalance(userId);
    
    // 이미지 생성 옵션 설정
    const imageCount = settings?.batchCount || 1; // 배치 생성 개수
    const highResolution = settings?.highResolution || false;
    const saveCharacter = settings?.saveCharacter || false;
    
    // 사전 토큰 체크
    if (balanceInfo.estimatedImagesRemaining < imageCount) {
      return NextResponse.json(
        { 
          success: false, 
          error: "토큰이 부족합니다", 
          required: imageCount, // 1토큰 = 1이미지
          balance: balanceInfo.balance,
          canGenerate: balanceInfo.estimatedImagesRemaining
        },
        { status: 402 }
      );
    }
    
    // 일일 한도 체크
    if (balanceInfo.dailyUsed + imageCount > balanceInfo.dailyLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `일일 생성 한도 초과 (${balanceInfo.dailyUsed}/${balanceInfo.dailyLimit})`,
          dailyRemaining: balanceInfo.dailyLimit - balanceInfo.dailyUsed
        },
        { status: 429 }
      );
    }

    // 예상 파일 크기 체크 (이미지당 약 500KB로 추정)
    const estimatedFileSize = imageCount * 500 * 1024; // 500KB per image
    
    // 저장 용량 체크
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', userId)
      .single();
    
    if (userData) {
      const storageCheck = await canUploadFile(userData.id, estimatedFileSize);
      
      if (!storageCheck.canUpload) {
        return NextResponse.json(
          { 
            success: false, 
            error: "저장 공간이 부족합니다. 파일을 삭제하거나 멤버십을 업그레이드하세요.",
            storageInfo: {
              used: storageCheck.usedBytes,
              max: storageCheck.maxBytes,
              remaining: storageCheck.remainingBytes,
              usagePercentage: storageCheck.usagePercentage
            }
          },
          { status: 507 } // Insufficient Storage
        );
      }
    }

    // 비율 설정
    const ratio = aspectRatio || settings?.aspectRatio || '4:5';
    const width = ratio === '16:9' ? 1920 : ratio === '1:1' ? 1024 : 896;
    const height = ratio === '16:9' ? 1080 : ratio === '1:1' ? 1024 : 1152;
    console.log(`🔧 이미지 생성: ${ratio} 비율 (${width}x${height})`);

    // 캐릭터 레퍼런스 처리
    console.log('📝 캐릭터 ID들:', characterIds);
    
    let enhancedPrompt = prompt;
    let referenceImages: string[] = [];
    let characterDescriptions = "";

    if (characterIds && characterIds.length > 0) {
      try {
        // 선택된 캐릭터들로 프롬프트 향상 (프로젝트 비율 전달)
        const promptEnhancement = await characterReferenceManager.enhancePromptWithSelectedCharacters(
          userId,
          prompt,
          characterIds,
          ratio as '4:5' | '1:1' | '16:9' // 프로젝트 비율 전달
        );

        enhancedPrompt = promptEnhancement.enhancedPrompt;
        referenceImages = promptEnhancement.referenceImages;
        characterDescriptions = promptEnhancement.characterDescriptions;
        
        console.log(`🎭 캐릭터 레퍼런스 적용: ${promptEnhancement.detectedCharacters.length}개 캐릭터`);
        console.log(`📚 레퍼런스 이미지: ${referenceImages.length}개`);
      } catch (error) {
        console.warn('캐릭터 레퍼런스 처리 실패:', error);
        // 캐릭터 처리가 실패해도 기본 프롬프트로 계속 진행
      }
    }

    // 나노바나나로 이미지 생성 (캐릭터 정보 포함)
    const result = await nanoBananaService.generateWebtoonPanel(
      enhancedPrompt,
      {
        userId: userId,
        selectedCharacterIds: characterIds,
        referenceImages: referenceImages,
        characterDescriptions: new Map(characterIds?.map((id: string) => [id, characterDescriptions]) || []),
        aspectRatio: ratio,
        width: width,
        height: height
      }
    );

    // 실제 토큰 차감
    const tokenResult = await tokenManager.useTokensForImage(
      userId, 
      imageCount,
      { highResolution, saveCharacter }
    );
    
    if (!tokenResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: tokenResult.error || "토큰 차감 실패",
          remainingTokens: tokenResult.remainingTokens,
          dailyRemaining: tokenResult.dailyRemaining
        },
        { status: 500 }
      );
    }

    // 사용자 정보 조회 (이미 위에서 조회했으므로 재사용)
    // userData는 이미 위에서 조회됨

    // 단순한 생성 기록
    const generation = {
      id: `gen-${Date.now()}`,
      imageUrl: result.imageUrl,
      tokensUsed: result.tokensUsed,
    };
    
    console.log('💾 생성 완료:', generation.id);

    // 단순한 응답 데이터
    const responseData = {
      success: true,
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      tokensUsed: result.tokensUsed,
      generationId: generation.id,
      remainingTokens: tokenResult.remainingTokens,
      dailyRemaining: tokenResult.dailyRemaining
    };
    
    console.log('📤 응답 전송:', responseData.imageUrl);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Generation API error:", error);
    const errorMessage = error instanceof Error ? error.message : "이미지 생성 중 오류가 발생했습니다";
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// 토큰 사용량 조회 API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  
  // 사용량 통계 조회
  if (path === "usage") {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: "인증이 필요합니다" },
          { status: 401 }
        );
      }
      
      const userId = user.id;
      
      // 상세 잔액 정보
      const balanceInfo = await tokenManager.getBalance(userId);
      
      // 토큰 부족 체크
      const lowBalanceCheck = await tokenManager.checkLowBalance(userId);
      
      // 월간 수익성 분석
      const profitAnalysis = await tokenManager.getMonthlyProfitAnalysis(userId);
      
      // 사용 내역
      const usageHistory = await tokenManager.getUsageHistory(userId, 20);
      
      return NextResponse.json({
        success: true,
        balance: balanceInfo,
        lowBalance: lowBalanceCheck,
        profitAnalysis,
        history: usageHistory,
      });
      
    } catch (error) {
      console.error("Get usage error:", error);
      return NextResponse.json(
        { success: false, error: "사용량 조회 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }
  }
  
  // 기존 생성 기록 조회
  return getGenerationHistory(request);
}

// 생성 기록 조회
async function getGenerationHistory(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }
    
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "10");

    // 사용자 데이터 가져오기
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

    // 생성 기록 조회 쿼리 구성
    let query = supabase
      .from('generation')
      .select(`
        *,
        character (*),
        project (*)
      `)
      .eq('userId', userData.id)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq('projectId', projectId);
    }

    const { data: generations } = await query;

    return NextResponse.json({
      success: true,
      generations,
    });

  } catch (error) {
    console.error("Get generations error:", error);
    return NextResponse.json(
      { success: false, error: "생성 기록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}