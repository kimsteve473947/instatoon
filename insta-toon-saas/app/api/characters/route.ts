import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

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
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 구독 정보 확인 (캐릭터 개수 제한)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: userData.id }
    });

    const currentCharacterCount = await prisma.character.count({
      where: { userId: userData.id }
    });

    const maxCharacters = subscription?.maxCharacters || 1;
    if (currentCharacterCount >= maxCharacters) {
      return NextResponse.json(
        { 
          success: false, 
          error: `캐릭터 생성 한도를 초과했습니다 (${currentCharacterCount}/${maxCharacters})`,
          needsUpgrade: true
        },
        { status: 402 }
      );
    }

    // 캐릭터 등록 (Prisma 사용)
    const character = await prisma.character.create({
      data: {
        userId: userData.id,
        name,
        description,
        styleGuide: personality || "",
        referenceImages: referenceImages || [],
        thumbnailUrl: referenceImages && referenceImages.length > 0 ? referenceImages[0] : null,
      }
    });

    return NextResponse.json({
      success: true,
      characterId: character.id,
      message: `캐릭터 '${name}'이(가) 등록되었습니다`,
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
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 모든 캐릭터 조회 (Prisma 사용)
    const characters = await prisma.character.findMany({
      where: { userId: userData.id },
      orderBy: { updatedAt: 'desc' }
    });

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
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 캐릭터 업데이트 (Prisma 사용)
    const updatedCount = await prisma.character.updateMany({
      where: { 
        id: characterId,
        userId: userData.id 
      },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.styleGuide !== undefined && { styleGuide: updates.styleGuide }),
        ...(updates.referenceImages && { 
          referenceImages: updates.referenceImages,
          thumbnailUrl: updates.referenceImages.length > 0 ? updates.referenceImages[0] : null
        }),
        ...(updates.isFavorite !== undefined && { isFavorite: updates.isFavorite }),
        updatedAt: new Date(),
      }
    });

    if (updatedCount.count === 0) {
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
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 캐릭터 삭제 (Prisma 사용)
    const deletedCount = await prisma.character.deleteMany({
      where: { 
        id: characterId,
        userId: userData.id 
      }
    });

    if (deletedCount.count === 0) {
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

