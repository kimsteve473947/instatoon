import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // 캐릭터 등록 (Supabase 직접 연결)
    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        name,
        description,
        metadata: {
          aliases: allAliases,
          visualFeatures: visualFeatures || extractVisualFeatures(description),
          clothing: clothing || { default: "", variations: [] },
          personality: personality || "",
        },
        reference_images: referenceImages,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

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

    // 모든 캐릭터 조회 (Supabase 직접 연결)
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Supabase select error:", error);
      throw error;
    }

    const formattedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      description: char.description,
      aliases: char.metadata?.aliases || [],
      visualFeatures: char.metadata?.visualFeatures || {},
      clothing: char.metadata?.clothing || {},
      personality: char.metadata?.personality || "",
      referenceImages: char.reference_images || [],
      createdAt: char.created_at,
      updatedAt: char.updated_at,
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

    // 캐릭터 업데이트 (Supabase 직접 연결)
    const { error } = await supabase
      .from('characters')
      .update({
        name: updates.name,
        description: updates.description,
        metadata: updates.metadata,
        reference_images: updates.referenceImages,
      })
      .eq('id', characterId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
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

    // 캐릭터 삭제 (Supabase 직접 연결)
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Supabase delete error:", error);
      throw error;
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

// 설명에서 시각적 특징 추출
function extractVisualFeatures(description: string): any {
  const features: any = {
    hairColor: "",
    hairStyle: "",
    eyeColor: "",
    faceShape: "",
    bodyType: "",
    height: "",
    age: "",
    gender: "",
    skinTone: "",
    distinctiveFeatures: [],
  };

  // 머리 색상 패턴
  const hairColorPattern = /(검은|갈색|금발|빨간|파란|녹색|보라|회색|흰|검정)\s*머리/;
  const hairColorMatch = description.match(hairColorPattern);
  if (hairColorMatch) features.hairColor = hairColorMatch[1];

  // 머리 스타일 패턴
  const hairStylePattern = /(단발|장발|롱|숏|웨이브|곱슬|직모|포니테일|양갈래)/;
  const hairStyleMatch = description.match(hairStylePattern);
  if (hairStyleMatch) features.hairStyle = hairStyleMatch[1];

  // 눈 색상 패턴
  const eyeColorPattern = /(검은|갈색|파란|녹색|회색|빨간)\s*눈/;
  const eyeColorMatch = description.match(eyeColorPattern);
  if (eyeColorMatch) features.eyeColor = eyeColorMatch[1];

  // 나이 패턴
  const agePattern = /(\d+)살|(\d+)대/;
  const ageMatch = description.match(agePattern);
  if (ageMatch) features.age = ageMatch[1] || ageMatch[2] + "대";

  // 성별 패턴
  if (description.includes("남자") || description.includes("남성")) {
    features.gender = "남성";
  } else if (description.includes("여자") || description.includes("여성")) {
    features.gender = "여성";
  }

  // 키 패턴
  const heightPattern = /(큰|작은|보통)\s*키|([\d]+)cm/;
  const heightMatch = description.match(heightPattern);
  if (heightMatch) features.height = heightMatch[0];

  return features;
}