import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'character_reference', aspectRatio = '4:5' } = await request.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '프롬프트가 필요합니다' },
        { status: 400 }
      );
    }

    // 캐릭터 레퍼런스용 프롬프트 최적화
    const optimizedPrompt = `Character reference sheet: ${prompt}

Style requirements:
- Korean webtoon/manhwa art style
- Clean professional character design
- Full body or upper body reference
- Simple clean background (white/light)
- High detail and clarity
- Consistent art style suitable for webtoon
- Vibrant but natural colors`;

    console.log('🎨 Generating character with optimized prompt:', optimizedPrompt);

    // 기존 이미지 생성 API 호출
    const generateResponse = await fetch(`${request.nextUrl.origin}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: optimizedPrompt,
        characterIds: [], // 캐릭터 생성이므로 빈 배열
        settings: {
          style: 'character_reference',
          quality: 'high',
        },
        aspectRatio: aspectRatio
      }),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      throw new Error(errorData.error || '이미지 생성에 실패했습니다');
    }

    const result = await generateResponse.json();
    
    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || '이미지 URL을 가져올 수 없습니다');
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      tokensUsed: result.tokensUsed || 2,
      message: '캐릭터가 성공적으로 생성되었습니다'
    });

  } catch (error) {
    console.error('캐릭터 생성 실패:', error);
    
    let errorMessage = '캐릭터 생성 중 오류가 발생했습니다';
    
    if (error instanceof Error) {
      if (error.message.includes('API_KEY') || error.message.includes('인증')) {
        errorMessage = 'AI 서비스 인증 오류입니다';
      } else if (error.message.includes('quota') || error.message.includes('토큰')) {
        errorMessage = 'AI 서비스 사용량이 초과되었습니다';
      } else if (error.message.includes('timeout') || error.message.includes('시간')) {
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