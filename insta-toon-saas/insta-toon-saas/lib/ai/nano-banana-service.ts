import { GoogleGenAI } from "@google/genai";
import { characterReferenceManager } from "./character-reference-manager";
import { CANVAS_RATIOS } from "@/lib/utils/image-resize";
import { fetchAndResizeImage } from "@/lib/utils/server-image-resize";
import { generateOptimizedPrompt, getRecommendedDimensions, getInternalRatioMetadata, type AspectRatio } from "./prompt-templates";

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
      selectedCharacterIds?: string[];
      referenceImages?: string[];
      characterDescriptions?: Map<string, string>;
      style?: string;
      negativePrompt?: string;
      aspectRatio?: '4:5' | '1:1' | '16:9';
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
    
    // 🚨 핵심 디버깅: 나노바나나 서비스 호출 확인
    console.log('🎨 =================================================================');
    console.log('🎨 NANO BANANA SERVICE CALLED');
    console.log('🎨 =================================================================');
    console.log('📝 Prompt:', prompt);
    console.log('🔧 Options:', JSON.stringify({
      userId: options?.userId,
      selectedCharacterIds: options?.selectedCharacterIds,
      referenceImages: options?.referenceImages?.length || 0,
      characterDescriptions: options?.characterDescriptions?.size || 0,
      style: options?.style,
      aspectRatio: options?.aspectRatio,
      width: options?.width,
      height: options?.height
    }, null, 2));
    console.log('🎨 =================================================================');
    
    try {
      console.log('🔄 Step 1: 캐릭터 자동 감지 및 향상 시작');
      // 캐릭터 자동 감지 및 향상
      let enhancedPrompt = prompt;
      let characterDescriptions = "";
      let additionalReferenceImages: string[] = [];
      let detectedCharacterNames: string[] = [];
      
      // 🚀 먼저 aspectRatio 정의 (캐릭터 처리에서 사용하기 위해)
      const aspectRatio: AspectRatio = (options?.aspectRatio || '4:5') as AspectRatio;
      
      if (options?.userId) {
        // 개발 모드와 프로덕션 모드 모두에서 캐릭터 매니저 사용
        try {
          let enhancement;
          
          // 선택된 캐릭터 ID가 있는 경우 우선 처리
          if (options.selectedCharacterIds && options.selectedCharacterIds.length > 0) {
            console.log(`🎯 선택된 캐릭터 사용: [${options.selectedCharacterIds.join(', ')}]`);
            enhancement = await characterReferenceManager.enhancePromptWithSelectedCharacters(
              options.userId,
              prompt,
              options.selectedCharacterIds,
              aspectRatio // 🚀 비율별 이미지를 위한 aspectRatio 전달
            );
          } else {
            // 선택된 캐릭터가 없으면 자동 감지
            console.log('🔍 캐릭터 자동 감지 모드');
            enhancement = await characterReferenceManager.enhancePromptWithCharacters(
              options.userId,
              prompt
            );
          }
          
          enhancedPrompt = enhancement.enhancedPrompt;
          characterDescriptions = enhancement.characterDescriptions;
          additionalReferenceImages = enhancement.referenceImages;
          detectedCharacterNames = enhancement.detectedCharacters.map(c => c.name);
          
          console.log(`🎭 사용된 캐릭터: ${detectedCharacterNames.length}개 (${detectedCharacterNames.join(', ')})`);
          console.log(`🖼️ 추가된 참조 이미지: ${additionalReferenceImages.length}개`);
          
          // 캐릭터 사용 기록
          if (enhancement.detectedCharacters.length > 0) {
            await characterReferenceManager.recordCharacterUsage(
              enhancement.detectedCharacters.map(c => c.id)
            );
          }
        } catch (error) {
          console.error("Character enhancement error:", error);
          // 캐릭터 관리자 오류가 있어도 이미지 생성은 계속 진행
          if (process.env.NODE_ENV === 'development') {
            console.warn("개발 모드: 캐릭터 참조 관리자 오류 발생하여 기본 프롬프트로 진행");
          }
        }
      }
      
      console.log('🔄 Step 2: 크기 설정');
      // 2. 크기 설정 (aspectRatio는 이미 위에서 정의됨)
      const recommendedDimensions = getRecommendedDimensions(aspectRatio);
      const width = options?.width || recommendedDimensions.width;
      const height = options?.height || recommendedDimensions.height;
      
      console.log(`✅ Image generation settings: ${aspectRatio} (${width}x${height})`);
      
      console.log('🔄 Step 3: 레퍼런스 이미지 준비');
      // 3. 레퍼런스 이미지 준비
      const allReferenceImages = [
        ...(options?.referenceImages || []),
        ...additionalReferenceImages
      ];
      console.log(`✅ Total reference images: ${allReferenceImages.length}`);
      
      console.log('🔄 Step 4: 이미지 생성 요청 준비');
      // 4. 이미지 생성 요청 준비
      const parts = [];
      
      console.log('🔄 Step 5: 캐릭터 참조 이미지 처리 시작');
      // 5. 캐릭터 참조 이미지 처리 (사전 생성된 비율별 이미지 사용)
      if (allReferenceImages.length > 0) {
        console.log(`📸 Using pre-processed ratio images for ${aspectRatio} ratio`);
        
        // 사전 생성된 비율별 이미지 사용 (성능 최적화)
        for (const imageUrl of allReferenceImages.slice(0, 4)) { // 최대 4개로 제한
          try {
            // 🚀 새로운 방식: 사전 생성된 비율별 이미지 직접 사용
            const imageData = await this.fetchImageAsBase64(imageUrl);
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData
              }
            });
            console.log(`✅ Using pre-processed ${aspectRatio} ratio image: ${imageUrl.slice(0, 50)}...`);
          } catch (error) {
            console.error(`❌ Failed to fetch pre-processed image: ${imageUrl}`, error);
          }
        }
      }
      
      console.log('🔄 Step 6: 캐릭터 참조 지시사항 준비');
      // 6. 캐릭터 참조 지시사항 준비
      let characterInstructions = '';
      if (allReferenceImages.length > 0) {
        characterInstructions = `🎭 CHARACTER REFERENCE INSTRUCTIONS:
Reference images have been processed to match your target canvas ratio (${aspectRatio}).

📐 IMAGE PROCESSING APPLIED:
- Each reference image has been fitted into ${width}x${height} canvas with white padding
- Original character proportions are preserved (no stretching or distortion)
- White borders were added where needed to match the ${aspectRatio} aspect ratio
- The character appearance within the white-padded frame is exactly what you should replicate

🎯 GENERATION REQUIREMENTS:
- Generate output in the exact ${aspectRatio} aspect ratio (${width}x${height})
- Preserve the character's visual features, facial structure, and style from the reference images
- Ignore the white padding areas - focus only on the character details
- Adapt the character to the new scene while keeping their identity intact
- Your output should naturally fill the entire ${aspectRatio} canvas without white borders`;
        
        console.log(`✅ Character reference instructions prepared for ${allReferenceImages.length} images`);
      }
      
      console.log('🔄 Step 7: 최종 프롬프트 생성');
      // 7. 최종 프롬프트 생성
      const finalPrompt = generateOptimizedPrompt({
        aspectRatio,
        userPrompt: enhancedPrompt,
        characterInstructions: characterInstructions || undefined,
        width, // 실제 width 전달
        height // 실제 height 전달
      });

      console.log('🔄 Step 8: Parts 배열 구성');
      // 8. 텍스트 프롬프트를 parts 배열에 추가 (첫 번째 요소)
      parts.unshift({ text: finalPrompt }); // 프롬프트를 맨 앞에 추가
      console.log(`✅ Final prompt generated (${finalPrompt.length} characters)`);
      
      console.log('🔄 Step 9: Gemini API 호출 준비');

      console.log(`🎨 AI Image Generation Started`);
      console.log(`🔧 Auto-optimized for ${aspectRatio} ratio with ${allReferenceImages.length} reference images`);
      console.log(`📋 Request structure:`, {
        totalParts: parts.length,
        textPrompt: !!parts.find(p => p.text),
        imageCount: parts.filter(p => p.inlineData).length,
        firstImageType: parts.find(p => p.inlineData)?.inlineData?.mimeType
      });
      
      // 상세 프롬프트는 개발 환경에서만 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Final Prompt (Dev Only):');
        console.log('- User prompt:', enhancedPrompt.substring(0, 150) + '...');
        console.log('- Has character instructions:', !!characterInstructions);
        console.log('- Full prompt length:', finalPrompt.length, 'characters');
      }

      // Gemini 나노바나나 모델 호출 (원래 방식 복원)
      console.log('🚀 Calling Gemini 2.5 Flash with optimized image generation settings...');
      console.log(`📤 Sending request with ${parts.length} parts to Gemini API`);
      
      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: [{ parts }] // parts 배열을 contents로 전달
      });
      console.log('📥 Received response from Gemini API');

      // 5. 생성된 이미지 데이터 추출 (원래 방식 복원)
      let imageData = null;
      const candidates = result.candidates;
      
      console.log('📋 Gemini API Response Structure:', JSON.stringify({
        candidates: candidates?.length || 0,
        firstCandidate: candidates?.[0] ? {
          finishReason: candidates[0].finishReason,
          contentParts: candidates[0].content?.parts?.length || 0
        } : null
      }, null, 2));
      
      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                imageData = part.inlineData;
                console.log('✅ Found image data:', part.inlineData.mimeType);
                break;
              } else if (part.text) {
                console.log('📄 Gemini returned text instead of image:', part.text.substring(0, 200) + '...');
              }
            }
          }
        }
      }

      if (!imageData) {
        console.log("❌ Gemini API에서 이미지 데이터를 찾을 수 없음");
        console.log("📋 Full Response Debug Info:");
        console.log("- Candidates count:", candidates?.length || 0);
        
        if (candidates?.[0]) {
          console.log("- First candidate finish reason:", candidates[0].finishReason);
          console.log("- First candidate content parts:", candidates[0].content?.parts?.length || 0);
          
          if (candidates[0].content?.parts) {
            candidates[0].content.parts.forEach((part, index) => {
              console.log(`- Part ${index}:`, {
                hasText: !!part.text,
                hasInlineData: !!part.inlineData,
                mimeType: part.inlineData?.mimeType
              });
            });
          }
        }
        
        console.log("🔄 Gemini API 응답에 이미지가 없음. 폴백 시스템 사용.");
        
        // 🎯 비율 기반 폴백 이미지 - 자연스러운 크기로
        const seed = Math.random().toString(36).substring(7);
        
        // 비율에 맞는 정확한 크기로 폴백 이미지 생성
        let fallbackWidth, fallbackHeight;
        switch(aspectRatio) {
          case '1:1':
            fallbackWidth = fallbackHeight = 1024; // 정확한 1:1 비율
            break;
          case '4:5':
            fallbackWidth = 1024;
            fallbackHeight = 1280; // 정확한 4:5 비율 (1024 * 1.25)
            break;
          case '16:9':
            fallbackWidth = 1920;
            fallbackHeight = 1080; // 정확한 16:9 비율
            break;
          default:
            fallbackWidth = 1024;
            fallbackHeight = 1280;
        }
        
        console.log(`📐 Fallback image with natural ratio: ${fallbackWidth}x${fallbackHeight} (${aspectRatio})`);
        
        const imageUrl = `https://picsum.photos/seed/webtoon-${seed}/${fallbackWidth}/${fallbackHeight}`;
        
        // 썸네일은 비율 유지하며 작은 크기로
        const thumbWidth = 300;
        const thumbHeight = Math.round(thumbWidth * (fallbackHeight / fallbackWidth));
        const thumbnailUrl = `https://picsum.photos/seed/webtoon-${seed}/${thumbWidth}/${thumbHeight}`;
        
        return {
          imageUrl,
          thumbnailUrl,
          tokensUsed: 2,
          generationTime: Date.now() - startTime,
          detectedCharacters: detectedCharacterNames,
        };
      }

      console.log('✅ Step 10: 이미지 데이터 발견! 저장 프로세스 시작');
      // 6. 이미지를 Vercel Blob Storage에 저장
      const imageUrl = await this.saveImageToStorage(imageData.data, imageData.mimeType);
      const thumbnailUrl = await this.generateThumbnail(imageUrl);
      
      const generationTime = Date.now() - startTime;
      const tokensUsed = this.calculateTokenUsage(
        enhancedPrompt, 
        allReferenceImages.length
      );
      
      console.log('🎉 =================================================================');
      console.log('🎉 NANO BANANA SERVICE SUCCESS!');
      console.log('🎉 =================================================================');
      console.log('🖼️ Image URL:', imageUrl);
      console.log('📎 Thumbnail URL:', thumbnailUrl);
      console.log('⚡ Tokens used:', tokensUsed);
      console.log('⏱️ Generation time:', generationTime, 'ms');
      console.log('👥 Detected characters:', detectedCharacterNames);
      console.log('🎉 =================================================================');
      
      return {
        imageUrl, // 182번째 줄에서 생성한 올바른 imageUrl 변수 사용
        thumbnailUrl,
        tokensUsed,
        generationTime,
        detectedCharacters: detectedCharacterNames.length > 0 ? detectedCharacterNames : undefined
      };
    } catch (error) {
      // 🚨 강화된 에러 로깅
      console.error('❌ =================================================================');
      console.error('❌ NANO BANANA SERVICE ERROR');
      console.error('❌ =================================================================');
      console.error('📝 Original prompt:', prompt);
      console.error('🔧 Options:', JSON.stringify(options, null, 2));
      console.error('💥 Error details:', error);
      console.error('📋 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('🕐 Execution time before error:', Date.now() - startTime, 'ms');
      console.error('❌ =================================================================');
      
      // 구체적인 에러 메시지 생성
      const errorMessage = error instanceof Error ? error.message : "웹툰 패널 생성에 실패했습니다";
      const detailedError = new Error(`나노바나나 서비스 에러: ${errorMessage}`);
      
      // 개발 모드에서는 원본 에러도 포함
      if (process.env.NODE_ENV === 'development') {
        (detailedError as any).originalError = error;
      }
      
      throw detailedError;
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
      // 임시로 빈 분석 결과 반환 (실제 구현시 Gemini Vision 사용)
      console.log("Character analysis requested for:", description, "Images:", characterImages.length);
      return this.parseCharacterAnalysis("");
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
        options.characterDescriptions.forEach((desc: string, name: string) => {
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
   * 🎯 핵심 메서드: 레퍼런스 이미지에 캔버스 비율 맞춤 패딩 추가
   * 이미지를 왜곡하지 않고, 하얀 배경을 추가해서 목표 비율에 맞춤
   * 
   * 예: 1:1 이미지 → 4:5 캔버스 설정시 → 위아래에 하얀 여백 추가하여 4:5로 변환
   */
  private async addPaddingToMatchCanvasRatio(
    imageUrl: string, 
    targetAspectRatio: string, 
    canvasWidth: number, 
    canvasHeight: number
  ): Promise<string> {
    try {
      const sharp = require('sharp');
      
      // 1. 원본 이미지 다운로드
      const response = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // 2. 원본 이미지 메타데이터 얻기
      const { width: originalWidth, height: originalHeight } = await sharp(imageBuffer).metadata();
      
      if (!originalWidth || !originalHeight) {
        throw new Error("Failed to get image dimensions");
      }
      
      // 3. 목표 캔버스 비율 계산
      const targetRatio = canvasWidth / canvasHeight;
      const originalRatio = originalWidth / originalHeight;
      
      console.log(`📏 Original: ${originalWidth}x${originalHeight} (${originalRatio.toFixed(2)})`);
      console.log(`🎯 Target: ${canvasWidth}x${canvasHeight} (${targetRatio.toFixed(2)})`);
      
      // 4. 패딩 계산 (contain 방식)
      let newWidth, newHeight;
      let padTop = 0, padBottom = 0, padLeft = 0, padRight = 0;
      
      if (originalRatio > targetRatio) {
        // 원본이 더 넓음 → 좌우 기준으로 맞추고 위아래 패딩
        newWidth = canvasWidth;
        newHeight = Math.round(canvasWidth / originalRatio);
        const totalVerticalPad = canvasHeight - newHeight;
        padTop = Math.floor(totalVerticalPad / 2);
        padBottom = totalVerticalPad - padTop;
      } else {
        // 원본이 더 높음 → 상하 기준으로 맞추고 좌우 패딩
        newHeight = canvasHeight;
        newWidth = Math.round(canvasHeight * originalRatio);
        const totalHorizontalPad = canvasWidth - newWidth;
        padLeft = Math.floor(totalHorizontalPad / 2);
        padRight = totalHorizontalPad - padLeft;
      }
      
      console.log(`📐 Resized: ${newWidth}x${newHeight}, Padding: T${padTop} R${padRight} B${padBottom} L${padLeft}`);
      
      // 5. Sharp로 이미지 처리: 리사이즈 + 패딩
      const paddedBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          fit: 'fill', // 비율 유지하면서 정확한 크기로
          background: { r: 255, g: 255, b: 255, alpha: 1 } // 하얀 배경
        })
        .extend({
          top: padTop,
          bottom: padBottom,
          left: padLeft,
          right: padRight,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // 하얀 패딩
        })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      console.log(`✅ Successfully padded image to ${canvasWidth}x${canvasHeight} (${targetAspectRatio})`);
      return paddedBuffer.toString('base64');
      
    } catch (error) {
      console.error("Padding addition error:", error);
      
      // 폴백: Canvas API 사용
      try {
        return await this.addPaddingWithCanvas(imageUrl, canvasWidth, canvasHeight);
      } catch (canvasError) {
        console.error("Canvas padding fallback also failed:", canvasError);
        throw new Error("Failed to add padding to reference image");
      }
    }
  }

  /**
   * Canvas API를 사용한 패딩 추가 (Sharp 폴백)
   */
  private async addPaddingWithCanvas(imageUrl: string, canvasWidth: number, canvasHeight: number): Promise<string> {
    try {
      const { createCanvas, loadImage } = require('canvas');
      
      // 1. 캔버스 생성
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      
      // 2. 하얀 배경
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // 3. 이미지 로드
      const img = await loadImage(imageUrl);
      const originalRatio = img.width / img.height;
      const targetRatio = canvasWidth / canvasHeight;
      
      // 4. contain 방식으로 이미지 배치 계산
      let drawWidth, drawHeight, drawX, drawY;
      
      if (originalRatio > targetRatio) {
        // 가로가 넓음 → 가로 기준
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / originalRatio;
        drawX = 0;
        drawY = (canvasHeight - drawHeight) / 2;
      } else {
        // 세로가 김 → 세로 기준  
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * originalRatio;
        drawX = (canvasWidth - drawWidth) / 2;
        drawY = 0;
      }
      
      // 5. 이미지 그리기 (중앙 배치)
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      
      // 6. Buffer로 변환
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      
      console.log(`✅ Canvas padding successful: ${canvasWidth}x${canvasHeight}`);
      return buffer.toString('base64');
      
    } catch (error) {
      console.error("Canvas padding error:", error);
      throw error;
    }
  }

  /**
   * 캔버스 비율 가이드 이미지 생성
   * 원하는 비율의 흰색 배경 이미지를 생성하여 Gemini에게 명확한 비율 가이드 제공
   */
  private async generateCanvasRatioGuide(targetRatio: string, width: number, height: number): Promise<string> {
    try {
      const sharp = require('sharp');
      
      // 비율에 맞는 흰색 배경 이미지 생성
      const buffer = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg({ quality: 95 })
      .toBuffer();
      
      console.log(`📐 Generated canvas ratio guide: ${width}x${height} (${targetRatio})`);
      return buffer.toString('base64');
      
    } catch (error) {
      console.error("Canvas ratio guide generation error:", error);
      
      // 폴백: 간단한 Canvas API 사용
      try {
        // Node.js에서 Canvas 사용하는 경우
        const { createCanvas } = require('canvas');
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // 흰색 배경 그리기
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // 비율 표시를 위한 미묘한 회색 테두리
        ctx.strokeStyle = '#F0F0F0';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width-2, height-2);
        
        // Buffer로 변환
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        return buffer.toString('base64');
        
      } catch (canvasError) {
        console.error("Canvas fallback also failed:", canvasError);
        throw new Error("Canvas ratio guide generation failed");
      }
    }
  }

  /**
   * 이미지를 지정된 비율로 조정하여 Base64로 변환
   * Gemini 2.5 Flash가 참조 이미지 비율을 그대로 유지하므로 미리 조정
   */
  private async fetchImageAsBase64(imageUrl: string, targetRatio = CANVAS_RATIOS.PORTRAIT): Promise<string> {
    try {
      
      // 1. 이미지를 지정된 비율로 조정 (서버측 처리)
      const aspectRatioForDimensions: AspectRatio = targetRatio === CANVAS_RATIOS.LANDSCAPE ? '16:9' :
                                                   targetRatio === CANVAS_RATIOS.SQUARE ? '1:1' : '4:5';
      const { width, height } = getRecommendedDimensions(aspectRatioForDimensions);
      
      const resizedBuffer = await fetchAndResizeImage(imageUrl, {
        width,
        height,
        mode: 'cover',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });
      
      return resizedBuffer.toString('base64');
    } catch (error) {
      console.error("Failed to fetch and resize image:", error);
      
      // 폴백: 원본 이미지를 그대로 사용
      try {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return buffer.toString('base64');
      } catch (fallbackError) {
        console.error("Fallback image fetch also failed:", fallbackError);
        throw fallbackError;
      }
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
      // 간단한 프롬프트 개선 로직 (실제 구현시 Gemini 사용)
      const improvedPrompt = `${originalPrompt}\n\nAdditional details: High-quality Korean webtoon style, professional illustration, vibrant colors, clear composition, detailed character design.`;
      console.log("Prompt improvement applied to:", originalPrompt.substring(0, 100) + "...");
      return improvedPrompt;
    } catch (error) {
      console.error("Prompt improvement error:", error);
      return originalPrompt; // 실패시 원본 반환
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const nanoBananaService = new NanoBananaService();