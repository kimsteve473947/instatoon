import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processCharacterImages } from "@/lib/services/character-image-processor";

// 캐릭터 등록
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
    
    const body = await request.json();
    const { 
      name, 
      aliases = [], 
      description,
      visualFeatures,
      clothing,
      personality,
      referenceImages = []
    } = body;

    // 필수 필드 검증
    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: "이름과 설명은 필수입니다" },
        { status: 400 }
      );
    }

    // 이름 변형 자동 생성
    const autoAliases = generateAliases(name);
    const allAliases = [...new Set([...aliases, ...autoAliases])];

    // 사용자 정보 조회
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

    // 구독 정보 확인 (캐릭터 개수 제한)
    const { data: subscription } = await supabase
      .from('subscription')
      .select('maxCharacters')
      .eq('userId', userData.id)
      .single();

    const { count: currentCharacterCount } = await supabase
      .from('character')
      .select('id', { count: 'exact' })
      .eq('userId', userData.id);

    const maxCharacters = subscription?.maxCharacters || 1;
    if ((currentCharacterCount || 0) >= maxCharacters) {
      return NextResponse.json(
        { 
          success: false, 
          error: `캐릭터 생성 한도를 초과했습니다 (${currentCharacterCount}/${maxCharacters})`,
          needsUpgrade: true
        },
        { status: 402 }
      );
    }

    // 캐릭터 등록
    const { data: character, error: insertError } = await supabase
      .from('character')
      .insert({
        userId: userData.id,
        name,
        description,
        styleGuide: personality || "",
        referenceImages: referenceImages || [],
        thumbnailUrl: referenceImages && referenceImages.length > 0 ? referenceImages[0] : null,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 🎨 참조 이미지가 있으면 비율별 이미지 처리 시작 (백그라운드)
    let imageProcessingResult = null;
    if (referenceImages && referenceImages.length > 0) {
      console.log(`🚀 Starting background image processing for character ${character.id}`);
      
      try {
        imageProcessingResult = await processCharacterImages(referenceImages, character.id);
        
        if (imageProcessingResult.success && imageProcessingResult.ratioImages) {
          // DB에 비율별 이미지 업데이트
          const { error: updateError } = await supabase
            .from('character')
            .update({ ratioImages: imageProcessingResult.ratioImages })
            .eq('id', character.id);
          
          if (updateError) {
            console.error(`❌ Failed to save ratio images for character ${character.id}:`, updateError);
          } else {
            console.log(`✅ Successfully saved ratio images for character ${character.id}`);
          }
        }
      } catch (processingError) {
        console.error(`⚠️ Image processing failed for character ${character.id}:`, processingError);
        // 이미지 처리 실패해도 캐릭터 생성은 성공으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      characterId: character.id,
      message: `캐릭터 '${name}'이(가) 등록되었습니다`,
      imageProcessing: imageProcessingResult ? {
        processed: imageProcessingResult.success,
        processedCount: imageProcessingResult.processedCount,
        error: imageProcessingResult.error
      } : null,
      aliases: allAliases,
    });

  } catch (error) {
    console.error("Character registration error:", error);
    return NextResponse.json(
      { success: false, error: "캐릭터 등록 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 캐릭터 목록 조회
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

    const { searchParams } = new URL(request.url);
    const includeFrequent = searchParams.get("frequent") === "true";

    if (includeFrequent) {
      // 자주 사용하는 캐릭터 조회 (임시로 빈 배열 반환)
      return NextResponse.json({
        success: true,
        characters: [],
      });
    }

    // 사용자 정보 조회
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

    // 모든 캐릭터 조회
    const { data: characters } = await supabase
      .from('character')
      .select('*')
      .eq('userId', userData.id)
      .order('updatedAt', { ascending: false });

    const formattedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      styleGuide: char.styleGuide,
      referenceImages: char.referenceImages as string[],
      thumbnailUrl: char.thumbnailUrl,
      isFavorite: char.isFavorite,
      createdAt: char.createdAt,
      updatedAt: char.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      characters: formattedCharacters,
    });

  } catch (error) {
    console.error("Get characters error:", error);
    return NextResponse.json(
      { success: false, error: "캐릭터 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 캐릭터 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { characterId, ...updates } = body;

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "캐릭터 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회
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

    // 캐릭터 업데이트
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.styleGuide !== undefined) updateData.styleGuide = updates.styleGuide;
    if (updates.referenceImages) {
      updateData.referenceImages = updates.referenceImages;
      updateData.thumbnailUrl = updates.referenceImages.length > 0 ? updates.referenceImages[0] : null;
    }
    if (updates.isFavorite !== undefined) updateData.isFavorite = updates.isFavorite;
    updateData.updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('character')
      .update(updateData)
      .eq('id', characterId)
      .eq('userId', userData.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: "캐릭터를 찾을 수 없거나 권한이 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "캐릭터가 업데이트되었습니다",
    });

  } catch (error) {
    console.error("Update character error:", error);
    return NextResponse.json(
      { success: false, error: "캐릭터 수정 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 캐릭터 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("id");

    if (!characterId) {
      return NextResponse.json(
        { success: false, error: "캐릭터 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회
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

    // 캐릭터 삭제
    const { error: deleteError } = await supabase
      .from('character')
      .delete()
      .eq('id', characterId)
      .eq('userId', userData.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: "캐릭터를 찾을 수 없거나 권한이 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "캐릭터가 삭제되었습니다",
    });

  } catch (error) {
    console.error("Delete character error:", error);
    return NextResponse.json(
      { success: false, error: "캐릭터 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 별칭 자동 생성 헬퍼
function generateAliases(name: string): string[] {
  const aliases: string[] = [];
  
  // 한국어 이름인 경우
  if (/[가-힣]/.test(name)) {
    const lastChar = name.charCodeAt(name.length - 1);
    const hasJongsung = (lastChar - 0xAC00) % 28 !== 0;
    
    if (hasJongsung) {
      aliases.push(name + "이");
      aliases.push(name + "아");
      aliases.push(name + "이가");
      aliases.push(name + "이는");
    } else {
      aliases.push(name + "야");
      aliases.push(name + "가");
      aliases.push(name + "는");
    }
    
    aliases.push(name + "씨");
    aliases.push(name + "님");
  }
  
  // 영어 이름인 경우
  if (/^[A-Za-z]+$/.test(name)) {
    aliases.push(name.toLowerCase());
    aliases.push(name.toUpperCase());
  }
  
  return aliases;
}

