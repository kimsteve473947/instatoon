import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoBananaService } from "@/lib/ai/nano-banana-service";
import { tokenManager } from "@/lib/subscription/token-manager";
import { memoryCache } from "@/lib/cache/memory-cache";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30초 타임아웃

export async function POST(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    let userId: string;
    
    if (isDevelopment) {
      // 개발 모드: 가상의 사용자 ID 사용
      userId = 'dev-user-id';
      console.log('Development mode: Using mock user ID');
    } else {
      // 프로덕션 모드: 실제 인증 확인
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: "인증이 필요합니다" },
          { status: 401 }
        );
      }
      
      userId = user.id;
    }

    const body = await request.json();
    const { prompt, characterIds, projectId, panelId, settings } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "프롬프트가 필요합니다" },
        { status: 400 }
      );
    }

    // 개발 모드에서는 토큰 체크 우회
    let balanceInfo;
    
    if (isDevelopment) {
      // 개발 모드: 충분한 토큰이 있다고 가정
      balanceInfo = {
        balance: 1000,
        used: 0,
        total: 1000,
        dailyUsed: 0,
        dailyLimit: 100,
        estimatedImagesRemaining: 1000,
      };
    } else {
      // 프로덕션 모드: 실제 토큰 잔액 확인
      balanceInfo = await tokenManager.getBalance(userId);
    }
    
    // 이미지 생성 옵션 설정
    const imageCount = settings?.batchCount || 1; // 배치 생성 개수
    const highResolution = settings?.highResolution || false;
    const saveCharacter = settings?.saveCharacter || false;
    
    // 사전 토큰 체크 (개발 모드가 아닌 경우만)
    if (!isDevelopment && balanceInfo.estimatedImagesRemaining < imageCount) {
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
    
    // 일일 한도 체크 (개발 모드가 아닌 경우만)
    if (!isDevelopment && balanceInfo.dailyUsed + imageCount > balanceInfo.dailyLimit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `일일 생성 한도 초과 (${balanceInfo.dailyUsed}/${balanceInfo.dailyLimit})`,
          dailyRemaining: balanceInfo.dailyLimit - balanceInfo.dailyUsed
        },
        { status: 429 }
      );
    }

    // 캐릭터 정보 가져오기 (캐싱 적용)
    const characterDescriptions = new Map<string, string>();
    const referenceImages: string[] = [];
    const supabase = await createClient();
    
    if (characterIds && characterIds.length > 0) {
      try {
        // 캐시 키 생성
        const cacheKey = `characters:${userId}:${characterIds.sort().join(',')}`;
        let characters = memoryCache.get<any[]>(cacheKey);
        
        if (!characters) {
          const { data: charactersData } = await supabase
            .from('character')
            .select('*')
            .in('id', characterIds);
          
          characters = charactersData || [];
          // 5분간 캐싱
          if (characters.length > 0) {
            memoryCache.set(cacheKey, characters, 300000);
          }
        }
        
        characters.forEach(char => {
          characterDescriptions.set(char.name, char.description);
          // 레퍼런스 이미지 추가
          if (char.referenceImages) {
            const images = char.referenceImages as string[];
            referenceImages.push(...images.slice(0, 2)); // 최대 2개
          }
        });
      } catch (dbError) {
        if (isDevelopment) {
          console.warn("개발 모드: 캐릭터 로드 실패 (계속 진행):", dbError);
        } else {
          console.error("캐릭터 로드 실패:", dbError);
        }
      }
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
        negativePrompt: settings?.negativePrompt,
        aspectRatio: settings?.aspectRatio || '4:5',
        width: settings?.width || 800,
        height: settings?.height || 1000
      }
    );

    // 토큰 차감 (개발 모드에서는 우회)
    let tokenResult;
    
    if (isDevelopment) {
      // 개발 모드: 토큰 차감을 건너뜀
      tokenResult = {
        success: true,
        remainingTokens: 999,
        dailyRemaining: 99,
      };
    } else {
      // 프로덕션 모드: 실제 토큰 차감
      tokenResult = await tokenManager.useTokensForImage(
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
    }

    // 사용자 정보 조회
    let userData;
    try {
      const { data: userRecord } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', isDevelopment ? 'dev-user-id' : userId)
        .single();
      
      userData = userRecord;
    } catch (dbError) {
      if (isDevelopment) {
        console.warn("개발 모드: DB 연결 실패, 가상 사용자 사용");
        userData = null;
      } else {
        console.error("사용자 조회 실패:", dbError);
      }
    }

    // 생성 기록 저장 (개발/프로덕션 모드 통합)
    let generation;
    
    if (isDevelopment) {
      // 개발 모드: 가상의 생성 기록
      generation = {
        id: `dev-gen-${Date.now()}`,
        userId: userData?.id || 'dev-user-id',
        projectId: projectId || null,
        panelId: panelId || null,
        characterId: characterIds?.[0] || null,
        prompt,
        imageUrl: result.imageUrl,
        tokensUsed: result.tokensUsed,
        model: "gemini-2.5-flash-image-preview",
        createdAt: new Date(),
      };
      
      // 개발 모드에서 DB 사용 가능하면 저장 시도
      if (userData) {
        try {
          const { data: genData } = await supabase
            .from('generation')
            .insert({
              userId: userData.id,
              projectId: projectId || null,
              panelId: panelId || null,
              characterId: characterIds?.[0] || null,
              prompt: prompt,
              imageUrl: result.imageUrl,
              tokensUsed: result.tokensUsed,
              model: "gemini-2.5-flash-image-preview",
              metadata: {
                detectedCharacters: result.detectedCharacters,
                generationTime: result.generationTime,
                thumbnailUrl: result.thumbnailUrl,
                isDevelopment: true,
              },
            })
            .select()
            .single();
          
          if (genData) {
            generation = genData;
          }
        } catch (dbError) {
          console.warn("개발 모드 DB 저장 실패 (계속 진행):", dbError);
        }
      }
    } else {
      // 프로덕션 모드: 실제 DB 저장
      if (!userData) {
        return NextResponse.json(
          { success: false, error: "사용자 정보를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      const { data: genData } = await supabase
        .from('generation')
        .insert({
          userId: userData.id,
          projectId: projectId || null,
          panelId: panelId || null,
          characterId: characterIds?.[0] || null,
          prompt: prompt,
          imageUrl: result.imageUrl,
          tokensUsed: result.tokensUsed,
          model: "gemini-2.5-flash-image-preview",
          metadata: {
            detectedCharacters: result.detectedCharacters,
            generationTime: result.generationTime,
            thumbnailUrl: result.thumbnailUrl,
            settings: settings,
          },
        })
        .select()
        .single();

      generation = genData;

      // 패널 업데이트 (있는 경우)
      if (panelId) {
        await supabase
          .from('panel')
          .update({
            imageUrl: result.imageUrl,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', panelId);
      }

      // 프로젝트가 지정된 경우 프로젝트 최종 편집 시간 업데이트
      if (projectId) {
        await supabase
          .from('project')
          .update({
            lasteditedat: new Date().toISOString(),
          })
          .eq('id', projectId);
      }
    }

    const responseData = {
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
    };
    
    console.log('📤 Sending response:', responseData);
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