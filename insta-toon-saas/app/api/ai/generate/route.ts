import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoBananaService } from "@/lib/ai/nano-banana-service";
import { tokenManager } from "@/lib/subscription/token-manager";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { prompt, characterIds, projectId, panelId, settings } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "프롬프트가 필요합니다" },
        { status: 400 }
      );
    }

    // 토큰 잔액 및 일일 한도 확인
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

    // 캐릭터 정보 가져오기
    const characterDescriptions = new Map<string, string>();
    const referenceImages: string[] = [];
    
    if (characterIds && characterIds.length > 0) {
      const characters = await prisma.character.findMany({
        where: {
          id: { in: characterIds },
          userId,
        },
      });
      
      characters.forEach(char => {
        characterDescriptions.set(char.name, char.description);
        // 레퍼런스 이미지 추가
        if (char.referenceImages) {
          const images = char.referenceImages as string[];
          referenceImages.push(...images.slice(0, 2)); // 최대 2개
        }
      });
    }

    // 프롬프트 개선은 나노바나나 서비스 내부에서 처리
    // 캐릭터 자동 감지를 포함하여

    // Nano Banana로 이미지 생성 (캐릭터 자동 감지 포함)
    const result = await nanoBananaService.generateWebtoonPanel(
      prompt, // 원본 프롬프트 전달 (내부에서 개선)
      {
        userId, // 사용자 ID로 캐릭터 자동 로드
        referenceImages,
        characterDescriptions: characterIds?.length > 0 ? characterDescriptions : undefined,
        style: settings?.style || "Korean webtoon style",
        negativePrompt: settings?.negativePrompt
      }
    );

    // 토큰 차감 (새로운 방식)
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

    // 생성 기록 저장
    const generation = await prisma.generation.create({
      data: {
        userId,
        projectId: projectId || null,
        panelId: panelId || null,
        characterId: characterIds?.[0] || null,
        prompt: prompt, // 원본 프롬프트 저장
        imageUrl: result.imageUrl,
        tokensUsed: result.tokensUsed,
        model: "gemini-2.0-flash-exp",
        metadata: {
          detectedCharacters: result.detectedCharacters,
          generationTime: result.generationTime,
          thumbnailUrl: result.thumbnailUrl,
        },
      },
    });

    // 패널 업데이트 (있는 경우)
    if (panelId) {
      await prisma.panel.update({
        where: { id: panelId },
        data: {
          imageUrl: result.imageUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      tokensUsed: result.tokensUsed,
      generationId: generation.id,
      remainingTokens: tokenResult.remainingTokens,
      dailyRemaining: tokenResult.dailyRemaining,
      detectedCharacters: result.detectedCharacters,
      usage: {
        imageCount,
        estimatedCost: imageCount * 52, // 원가 52원/이미지
        platformPrice: imageCount * 130, // 판매가 130원/이미지 (2.5배 마진)
        generationTimeMs: result.generationTime,
      }
    });

  } catch (error) {
    console.error("Generation API error:", error);
    return NextResponse.json(
      { success: false, error: "이미지 생성 중 오류가 발생했습니다" },
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

    const generations = await prisma.generation.findMany({
      where: {
        userId,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        character: true,
        project: true,
      },
    });

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