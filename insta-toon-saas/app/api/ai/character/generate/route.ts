import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Supabase 클라이언트 설정 (서버용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버용 키 사용
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Google AI 클라이언트 설정
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'character_reference' } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '프롬프트가 필요합니다' },
        { status: 400 }
      );
    }

    // 캐릭터 레퍼런스용 프롬프트 최적화
    const optimizedPrompt = `Create a high-quality character reference image. Style: Korean webtoon/manhwa art style, clean and professional character design.

Character description: ${prompt}

Requirements:
- Full body or upper body character reference
- Clean, simple background (white or light color)
- Consistent art style suitable for webtoon
- High detail and clarity
- Professional character sheet quality
- Multiple angles if possible (front view preferred)

Art style specifications:
- Korean webtoon/manhwa style
- Clean line art
- Soft shading
- Vibrant but not oversaturated colors
- Professional character design quality`;

    console.log('🎨 Generating character with prompt:', optimizedPrompt);

    // Gemini API로 이미지 생성
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
      }
    });

    const result = await model.generateContent([optimizedPrompt]);
    const response = await result.response;
    
    // 응답에서 이미지 데이터 추출 (실제 구현은 Gemini API 응답 형식에 따라 조정 필요)
    // 현재는 mock 응답으로 처리
    console.log('🤖 Gemini response:', response.text());
    
    // 임시로 플레이스홀더 이미지 URL 반환
    // 실제로는 Gemini에서 생성된 이미지를 Supabase Storage에 저장하고 URL 반환
    const mockImageUrl = `https://picsum.photos/512/512?random=${Date.now()}`;
    
    // 실제 구현에서는 여기서 이미지를 Supabase Storage에 업로드
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from('character-images')
    //   .upload(`generated/${Date.now()}.png`, imageBuffer);

    return NextResponse.json({
      success: true,
      imageUrl: mockImageUrl,
      tokensUsed: 2,
      message: '캐릭터가 성공적으로 생성되었습니다'
    });

  } catch (error) {
    console.error('캐릭터 생성 실패:', error);
    
    let errorMessage = '캐릭터 생성 중 오류가 발생했습니다';
    
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        errorMessage = 'AI 서비스 설정 오류입니다';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API 사용량이 초과되었습니다';
      } else if (error.message.includes('timeout')) {
        errorMessage = '생성 시간이 초과되었습니다. 다시 시도해주세요';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}