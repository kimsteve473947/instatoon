import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoBananaService } from "@/lib/ai/nano-banana-service";
import { tokenManager } from "@/lib/subscription/token-manager";
import { memoryCache } from "@/lib/cache/memory-cache";
import { canUploadFile, updateStorageUsage, saveFileMetadata } from "@/lib/storage/storage-manager";
import { randomUUID } from 'crypto';

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
    const { prompt, characterIds, projectId, panelId, settings, aspectRatio } = body;
    
    console.log('📥 Received request with projectId:', projectId, 'panelId:', panelId);

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

    // 예상 파일 크기 체크 (이미지당 약 500KB로 추정)
    const estimatedFileSize = imageCount * 500 * 1024; // 500KB per image
    
    // 용량 체크 (개발 모드가 아닌 경우만)
    if (!isDevelopment) {
      const supabase = await createClient();
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
          
          // 비율별 이미지가 있으면 aspect ratio에 맞는 이미지 사용, 없으면 원본 이미지 사용
          let characterImages: string[] = [];
          
          if (char.ratioImages && aspectRatio) {
            console.log(`🎯 Using ratio images for ${char.name}, aspect ratio: ${aspectRatio}`);
            const ratioImages = char.ratioImages as any;
            
            // 요청된 aspectRatio에 해당하는 이미지들 가져오기
            if (ratioImages[aspectRatio] && ratioImages[aspectRatio].length > 0) {
              characterImages = ratioImages[aspectRatio].slice(0, 2); // 최대 2개
              console.log(`✅ Found ${characterImages.length} images for ${aspectRatio} ratio`);
            } else {
              console.log(`⚠️ No ratio images found for ${aspectRatio}, fallback to original`);
              // 비율별 이미지가 없으면 원본 이미지 사용
              if (char.referenceImages) {
                characterImages = (char.referenceImages as string[]).slice(0, 2);
              }
            }
          } else {
            console.log(`📷 Using original reference images for ${char.name}`);
            // ratioImages가 없거나 aspectRatio가 없으면 원본 이미지 사용
            if (char.referenceImages) {
              characterImages = (char.referenceImages as string[]).slice(0, 2);
            }
          }
          
          if (characterImages.length > 0) {
            referenceImages.push(...characterImages);
            console.log(`📸 Added ${characterImages.length} character images for ${char.name}`);
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

    // 내부 비율 최적화 처리 (사용자 투명)
    const ratio = aspectRatio || settings?.aspectRatio || '4:5';
    console.log('🔍 Aspect Ratio Debug:', {
      received_aspectRatio: aspectRatio,
      settings_aspectRatio: settings?.aspectRatio,
      final_ratio: ratio,
      request_body: { aspectRatio, settings }
    });
    
    let width, height;
    switch(ratio) {
      case '16:9':
        width = 1920;
        height = 1080;
        break;
      case '1:1':
        width = 1024;  // 완벽한 정사각형
        height = 1024;
        break;
      case '4:5':
      default:
        width = 1024;  // 인스타그램 최적화
        height = 1280;
        break;
    }
    
    console.log(`🔧 Internal processing: Auto-optimizing for ${ratio} ratio (${width}x${height})`);

    // 🚨 API 라우트 디버깅: 나노바나나 서비스 호출 직전
    console.log('🔥 ================================================================');
    console.log('🔥 API ROUTE: 나노바나나 서비스 호출 시작');
    console.log('🔥 ================================================================');
    console.log('📝 Final prompt to nano banana:', prompt);
    console.log('🎯 Aspect ratio:', ratio);
    console.log('📐 Dimensions:', width, 'x', height);
    console.log('👥 Character IDs:', characterIds);
    console.log('🖼️ Reference images count:', referenceImages.length);
    console.log('🔥 ================================================================');
    
    // Nano Banana로 이미지 생성 (선택된 캐릭터 참조 포함)
    const result = await nanoBananaService.generateWebtoonPanel(
      prompt, // 원본 프롬프트 전달 (내부에서 개선)
      {
        userId, // 사용자 ID로 캐릭터 자동 로드
        selectedCharacterIds: characterIds, // 선택된 캐릭터 ID들 전달
        referenceImages,
        characterDescriptions: characterIds?.length > 0 ? characterDescriptions : undefined,
        style: settings?.style || "Korean webtoon style",
        negativePrompt: settings?.negativePrompt,
        aspectRatio: ratio,
        width: width,
        height: height
      }
    );

    // 🚨 API 라우트 디버깅: 나노바나나 서비스 호출 완료
    console.log('✅ ================================================================');
    console.log('✅ API ROUTE: 나노바나나 서비스 호출 완료');
    console.log('✅ ================================================================');
    console.log('🖼️ Result image URL:', result.imageUrl);
    console.log('📎 Result thumbnail URL:', result.thumbnailUrl);
    console.log('⚡ Result tokens used:', result.tokensUsed);
    console.log('⏱️ Result generation time:', result.generationTime, 'ms');
    console.log('👥 Result detected characters:', result.detectedCharacters);
    console.log('✅ ================================================================');

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
      // 개발 모드: 가상의 생성 기록 (UUID 형식 사용)
      generation = {
        id: randomUUID(),
        userId: userData?.id || randomUUID(),
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

      console.log('💾 Saving to generation table with projectId:', projectId, 'userId:', userData.id);
      
      const { data: genData, error: genError } = await supabase
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
      
      if (genError) {
        console.error('❌ Error saving to generation table:', genError);
      } else {
        console.log('✅ Saved to generation table with id:', genData?.id, 'projectId:', genData?.projectId);
      }

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
      generationId: generation.id, // 중요: generationId를 반환하여 참조로 사용
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