import { GoogleGenAI } from "@google/genai";
import { characterReferenceManager } from "./character-reference-manager";

/**
 * Nano Banana (Gemini 2.5 Flash) Service
 * 
 * Google의 혁신적인 AI 이미지 생성 및 편집 모델
 * 참고: https://github.com/JimmyLv/awesome-nano-banana
 * 
 * 주요 특징:
 * - 고급 AI 이미지 생성 및 편집
 * - 컨텍스트 인식 이미지 조작
 * - 3D 공간에 대한 깊은 이해
 * - 정확한 객체 추가 및 교체
 * - 이미지 전반의 스타일 일관성
 */
export class NanoBananaService {
  private genAI: GoogleGenAI;
  
  constructor() {
    // Google AI API 키로 초기화
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is required");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }
  
  /**
   * 웹툰 패널 생성
   * Nano Banana의 고급 기능을 활용한 웹툰 이미지 생성
   */
  async generateWebtoonPanel(
    prompt: string, 
    options?: {
      userId?: string;
      referenceImages?: string[];
      characterDescriptions?: Map<string, string>;
      style?: string;
      negativePrompt?: string;
      aspectRatio?: '4:5' | '1:1';
      width?: number;
      height?: number;
    }
  ): Promise<{
    imageUrl: string;
    thumbnailUrl: string;
    tokensUsed: number;
    generationTime: number;
    detectedCharacters?: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // 캐릭터 자동 감지 및 향상
      let enhancedPrompt = prompt;
      let characterDescriptions = "";
      let additionalReferenceImages: string[] = [];
      let detectedCharacterNames: string[] = [];
      
      if (options?.userId && process.env.NODE_ENV !== 'development') {
        // 프로덕션 모드에서만 캐릭터 매니저 사용
        try {
          const enhancement = await characterReferenceManager.enhancePromptWithCharacters(
            options.userId,
            prompt
          );
          
          enhancedPrompt = enhancement.enhancedPrompt;
          characterDescriptions = enhancement.characterDescriptions;
          additionalReferenceImages = enhancement.referenceImages;
          detectedCharacterNames = enhancement.detectedCharacters.map(c => c.name);
          
          // 감지된 캐릭터 사용 기록
          if (enhancement.detectedCharacters.length > 0) {
            await characterReferenceManager.recordCharacterUsage(
              enhancement.detectedCharacters.map(c => c.id)
            );
          }
        } catch (error) {
          console.error("Character enhancement error in production:", error);
          // 캐릭터 관리자 오류가 있어도 이미지 생성은 계속 진행
        }
      } else if (options?.userId && process.env.NODE_ENV === 'development') {
        // 개발 모드: 캐릭터 매니저 우회
        console.log("Development mode: Skipping character reference manager");
      }
      
      // 2. Nano Banana 최적화 프롬프트 생성
      const optimizedPrompt = this.buildNanoBananaPrompt(
        enhancedPrompt, 
        {
          ...options,
          characterDescriptions: characterDescriptions
        }
      );
      
      // 3. 이미지 생성 요청 준비
      const parts = [];
      
      // 텍스트 프롬프트 추가
      parts.push({ text: optimizedPrompt });
      
      // 레퍼런스 이미지가 있는 경우 추가 (캐릭터 일관성)
      const allReferenceImages = [
        ...(options?.referenceImages || []),
        ...additionalReferenceImages
      ];
      
      if (allReferenceImages.length > 0) {
        for (const imageUrl of allReferenceImages.slice(0, 5)) { // 최대 5개
          try {
            const imageData = await this.fetchImageAsBase64(imageUrl);
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData
              }
            });
          } catch (error) {
            console.error(`Failed to fetch reference image: ${imageUrl}`, error);
          }
        }
      }
      
      // 4. Gemini 2.5 Flash Image (나노바나나)로 직접 이미지 생성 - 공식 API 방식
      const finalPrompt = `Create a professional Korean webtoon panel image with the following specifications:

${optimizedPrompt}

TECHNICAL REQUIREMENTS:
- Aspect ratio: ${options?.aspectRatio || '4:5'}
- Recommended size: ${options?.width || 800}x${options?.height || 1000} pixels
- Style: High-quality digital illustration suitable for Instagram webtoon
- Colors: Vibrant and eye-catching
- Composition: Clear focal point with balanced layout
- Text: NO TEXT OR SPEECH BUBBLES in the image

Please generate a single, high-quality webtoon panel that matches these requirements.`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: finalPrompt
      });

      // 5. 생성된 이미지 데이터 추출
      let imageData = null;
      const candidates = result.candidates;
      
      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                imageData = part.inlineData;
                break;
              }
            }
          }
        }
      }

      if (!imageData) {
        console.log("Gemini 2.5 Flash에서 직접 이미지 생성을 지원하지 않음. 대체 방법 사용.");
        // 폴백: placeholder 이미지 사용
        const seed = Math.random().toString(36).substring(7);
        const width = options?.width || 800;
        const height = options?.height || 1000;
        const imageUrl = `https://picsum.photos/seed/webtoon-${seed}/${width}/${height}`;
        const thumbnailUrl = `https://picsum.photos/seed/webtoon-${seed}/300/200`;
        
        return {
          imageUrl,
          thumbnailUrl,
          tokensUsed: 2,
          generationTime: Date.now() - startTime,
          detectedCharacters: detectedCharacterNames,
        };
      }

      // 6. 이미지를 Vercel Blob Storage에 저장
      const imageUrl = await this.saveImageToStorage(imageData.data, imageData.mimeType);
      const thumbnailUrl = await this.generateThumbnail(imageUrl);
      
      const generationTime = Date.now() - startTime;
      const tokensUsed = this.calculateTokenUsage(
        enhancedPrompt, 
        allReferenceImages.length
      );
      
      return {
        imageUrl, // 182번째 줄에서 생성한 올바른 imageUrl 변수 사용
        thumbnailUrl,
        tokensUsed,
        generationTime,
        detectedCharacters: detectedCharacterNames.length > 0 ? detectedCharacterNames : undefined
      };
    } catch (error) {
      console.error("Nano Banana generation error:", error);
      throw new Error("웹툰 패널 생성에 실패했습니다");
    }
  }
  
  /**
   * 캐릭터 일관성 유지를 위한 분석
   * Nano Banana의 3D 이해 능력을 활용
   */
  async analyzeCharacterConsistency(
    characterImages: string[],
    description: string
  ): Promise<{
    features: string[];
    styleGuide: string;
    colorPalette: string[];
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-image-preview" 
      });
      
      const parts = [{
        text: `
        [Character Analysis with Nano Banana]
        
        Analyze the following character images and extract:
        1. Key visual features (hair, eyes, clothing, accessories)
        2. Art style characteristics
        3. Color palette
        4. Distinctive traits
        
        Character Description: ${description}
        
        Provide a detailed analysis for maintaining character consistency across different scenes.
        `
      }];
      
      // 캐릭터 이미지 추가
      for (const imageUrl of characterImages) {
        try {
          const imageData = await this.fetchImageAsBase64(imageUrl);
          parts.push({
            inlineData: {
              mimeType: "image/jpeg",
              data: imageData
            }
          });
        } catch (error) {
          console.error(`Failed to fetch character image: ${imageUrl}`, error);
        }
      }
      
      const result = await model.generateContent({
        contents: [{ role: "user", parts }]
      });
      
      const response = await result.response;
      const analysis = response.text();
      
      // 분석 결과 파싱
      return this.parseCharacterAnalysis(analysis);
    } catch (error) {
      console.error("Character analysis error:", error);
      throw new Error("캐릭터 분석에 실패했습니다");
    }
  }
  
  /**
   * Nano Banana 최적화 프롬프트 생성
   * 3D 이해, 컨텍스트 인식, 스타일 일관성을 강조
   */
  private buildNanoBananaPrompt(prompt: string, options?: any): string {
    let enhancedPrompt = `
[Advanced Webtoon Generation]
You are an expert webtoon art director using Gemini Flash.
Task: Create a professional Korean webtoon panel

=== CRITICAL INSTRUCTIONS ===
- DO NOT include ANY text, letters, words, or written content in the image
- DO NOT generate speech bubbles with text inside
- DO NOT add any captions, labels, or written elements
- ONLY generate the visual scene with characters and backgrounds
- Leave all areas where text/dialogue would go completely empty

=== SCENE DESCRIPTION ===
${prompt}

=== STYLE REQUIREMENTS ===
- Format: Instagram-optimized ${options?.aspectRatio === '1:1' ? 'square panel (1:1 ratio)' : 'vertical panel (4:5 ratio)'}
- Dimensions: ${options?.width || 800}x${options?.height || (options?.aspectRatio === '1:1' ? 800 : 1000)} pixels
- Aspect Ratio: ${options?.aspectRatio || '4:5'}
- Style: ${options?.style || "Modern Korean webtoon style"}
- Quality: Professional, publication-ready
- Coloring: Vibrant, eye-catching colors
- Text: ABSOLUTELY NO TEXT OR LETTERS IN THE IMAGE
`;
    
    // 캐릭터 일관성 요구사항
    if (options?.characterDescriptions) {
      if (typeof options.characterDescriptions === 'string') {
        // 문자열로 전달된 경우 (자동 감지된 캐릭터)
        enhancedPrompt += `
=== CHARACTER CONSISTENCY ===
${options.characterDescriptions}
`;
      } else if (options.characterDescriptions.size > 0) {
        // Map으로 전달된 경우 (수동 설정)
        enhancedPrompt += `
=== CHARACTER CONSISTENCY ===
Maintain exact appearance for the following characters:
`;
        options.characterDescriptions.forEach((desc, name) => {
          enhancedPrompt += `
[${name}]
${desc}
`;
        });
      }
    }
    
    // Nano Banana 고급 기능 활용
    enhancedPrompt += `
=== NANO BANANA ADVANCED FEATURES ===
- 3D Understanding: Apply deep spatial awareness for realistic object placement
- Lighting: Intelligently re-render lighting and reflections based on environment
- Occlusion: Handle overlapping objects with precision
- Context Awareness: Understand relationships between characters and environment
- Style Consistency: Maintain uniform art style across all elements
`;
    
    // 네거티브 프롬프트
    if (options?.negativePrompt) {
      enhancedPrompt += `
=== AVOID ===
${options.negativePrompt}
`;
    }
    
    enhancedPrompt += `
=== OUTPUT REQUIREMENTS ===
- Single cohesive panel suitable for Instagram carousel
- Clear focal point and composition
- Professional webtoon quality
- Character consistency maintained if references provided
`;
    
    return enhancedPrompt;
  }
  
  /**
   * 이미지를 Base64로 변환
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      console.error("Failed to fetch image:", error);
      throw error;
    }
  }
  
  /**
   * 실제 이미지 생성 - Gemini 2.5 Flash (나노바나나) 이미지 생성 기능 사용
   */
  private async generateActualImage(optimizedPrompt: string, options?: any): Promise<{ url: string; width: number; height: number }> {
    try {
      // 이미지 생성을 위한 최종 프롬프트
      const finalPrompt = `Create a professional Korean webtoon panel image with the following specifications:

${optimizedPrompt}

TECHNICAL REQUIREMENTS:
- Aspect ratio: ${options?.aspectRatio || '4:5'}
- Recommended size: ${options?.width || 800}x${options?.height || 1000} pixels
- Style: High-quality digital illustration suitable for Instagram webtoon
- Colors: Vibrant and eye-catching
- Composition: Clear focal point with balanced layout
- Text: NO TEXT OR SPEECH BUBBLES in the image

Please generate a single, high-quality webtoon panel that matches these requirements.`;

      // Gemini 2.5 Flash Image (나노바나나)로 이미지 생성 요청 (공식 문서 방식)
      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: finalPrompt
      });
      
      // Gemini 2.5 Flash Image (나노바나나)의 응답에서 이미지 데이터 추출 (공식 문서 방식)
      const candidates = result.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No image generated by Gemini");
      }
      
      // 생성된 이미지 찾기
      let imageData = null;
      for (const candidate of candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
              imageData = part.inlineData;
              break;
            }
          }
        }
      }
      
      if (!imageData) {
        // Gemini가 이미지를 직접 생성하지 않는 경우, 최적화된 프롬프트를 사용해 다른 방법 시도
        console.log("Gemini 2.5 Flash에서 직접 이미지 생성을 지원하지 않음. 대체 방법 사용.");
        return await this.generateImageWithFallback(optimizedPrompt, options);
      }
      
      // 생성된 이미지를 Vercel Blob Storage에 저장
      const imageUrl = await this.saveImageToStorage(imageData.data, imageData.mimeType);
      
      return {
        url: imageUrl,
        width: options?.width || 800,
        height: options?.height || 1000
      };
      
    } catch (error) {
      console.error("이미지 생성 오류:", error);
      // 폴백 방법 시도
      return await this.generateImageWithFallback(optimizedPrompt, options);
    }
  }

  /**
   * 폴백 이미지 생성 방법
   * Gemini가 직접 이미지 생성을 지원하지 않는 경우 사용
   */
  private async generateImageWithFallback(optimizedPrompt: string, options?: any): Promise<{ url: string; width: number; height: number }> {
    // 임시로 고품질 placeholder 이미지 사용
    // 실제 서비스에서는 DALL-E 3, Midjourney, Stable Diffusion 등 연동 필요
    const seed = Math.random().toString(36).substring(7);
    const width = options?.width || 800;
    const height = options?.height || 1000;
    
    // 웹툰 스타일 placeholder (실제 서비스에서는 실제 이미지 생성 API 사용)
    const imageUrl = `https://picsum.photos/seed/webtoon-${seed}/${width}/${height}`;
    
    console.log(`폴백 이미지 생성: ${imageUrl}`);
    console.log(`최적화된 프롬프트: ${optimizedPrompt.substring(0, 200)}...`);
    
    return {
      url: imageUrl,
      width,
      height
    };
  }

  /**
   * 생성된 이미지를 Vercel Blob Storage에 저장
   */
  private async saveImageToStorage(base64Data: string, mimeType: string): Promise<string> {
    try {
      // Base64 데이터를 Buffer로 변환
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 파일명 생성
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = mimeType.split('/')[1] || 'png';
      const filename = `webtoon-panel-${timestamp}-${randomId}.${extension}`;
      
      // Vercel Blob Storage에 업로드 (실제 구현 필요)
      // const { url } = await put(filename, buffer, {
      //   access: 'public',
      //   contentType: mimeType,
      // });
      
      // 임시로 base64 데이터 URL 반환 (개발용)
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      console.log(`이미지 저장 완료: ${filename}`);
      return dataUrl;
      
    } catch (error) {
      console.error("이미지 저장 실패:", error);
      throw new Error("이미지 저장에 실패했습니다");
    }
  }
  
  /**
   * 썸네일 생성
   */
  private async generateThumbnail(imageUrl: string): Promise<string> {
    // TODO: 실제 썸네일 생성 로직
    return `${imageUrl}&thumbnail=true`;
  }
  
  /**
   * 토큰 사용량 계산 (2.5배 마진 기준)
   * 1 이미지 = 1토큰 (실제 비용 52원, 판매가 130원)
   */
  private calculateTokenUsage(prompt: string, referenceImageCount: number): number {
    // 기본: 1토큰 = 1이미지
    let tokens = 1;
    
    // 고해상도 옵션 (추가 0.5토큰)
    if (prompt.includes("high resolution") || prompt.includes("4K")) {
      tokens += 0.5;
    }
    
    // 레퍼런스 이미지 사용 (각 0.2토큰)
    tokens += referenceImageCount * 0.2;
    
    return Math.ceil(tokens); // 올림 처리
  }
  
  /**
   * 캐릭터 분석 결과 파싱
   */
  private parseCharacterAnalysis(analysis: string): {
    features: string[];
    styleGuide: string;
    colorPalette: string[];
  } {
    // TODO: 실제 분석 결과 파싱 로직
    return {
      features: [
        "검은 단발 머리",
        "큰 갈색 눈",
        "교복 착용",
        "밝은 표정"
      ],
      styleGuide: "한국 웹툰 스타일, 깔끔한 선화, 파스텔톤 컬러",
      colorPalette: ["#FFE5E5", "#FFF0E5", "#E5F3FF", "#F0E5FF"]
    };
  }
  
  /**
   * 프롬프트 개선 제안
   * Nano Banana의 능력을 최대한 활용하도록 프롬프트 최적화
   */
  async improvePrompt(originalPrompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-image-preview" 
      });
      
      const improveRequest = `
You are an expert in optimizing prompts for Nano Banana (Gemini 2.5 Flash) image generation.

Original prompt: ${originalPrompt}

Improve this prompt by:
1. Adding specific visual details
2. Describing spatial relationships clearly
3. Specifying lighting and atmosphere
4. Including style references
5. Making it more suitable for webtoon panel generation

Provide only the improved prompt without explanation.
`;
      
      const result = await model.generateContent(improveRequest);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Prompt improvement error:", error);
      return originalPrompt; // 실패시 원본 반환
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const nanoBananaService = new NanoBananaService();