import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// 모델 설정 - Gemini 2.5 Flash (Nano Banana) 사용
// Gemini 2.5 Flash는 이미지 생성 및 편집에 특화된 모델
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 캐릭터 일관성을 위한 프롬프트 빌더
export class PromptBuilder {
  private basePrompt: string;
  private characterDescriptions: Map<string, string>;
  private style: string;

  constructor() {
    this.basePrompt = "Create a webtoon panel image with the following specifications:";
    this.characterDescriptions = new Map();
    this.style = "Korean webtoon style, clean lines, vibrant colors";
  }

  setStyle(style: string) {
    this.style = style;
    return this;
  }

  addCharacter(id: string, description: string) {
    this.characterDescriptions.set(id, description);
    return this;
  }

  build(userPrompt: string): string {
    let finalPrompt = `${this.basePrompt}\n\nStyle: ${this.style}\n\n`;
    
    if (this.characterDescriptions.size > 0) {
      finalPrompt += "Characters:\n";
      this.characterDescriptions.forEach((desc, id) => {
        finalPrompt += `- ${desc}\n`;
      });
      finalPrompt += "\n";
    }
    
    finalPrompt += `Scene: ${userPrompt}\n\n`;
    finalPrompt += "Important: Maintain character consistency with the descriptions provided. ";
    finalPrompt += "Create a single panel suitable for Instagram carousel format (1:1 aspect ratio).";
    
    return finalPrompt;
  }
}

// 이미지 생성 서비스
export class ImageGenerationService {
  private promptBuilder: PromptBuilder;

  constructor() {
    this.promptBuilder = new PromptBuilder();
  }

  // 텍스트 기반 이미지 생성 (프롬프트만 사용)
  async generateFromText(
    prompt: string,
    characterDescriptions?: Map<string, string>
  ): Promise<{ imageUrl: string; tokensUsed: number }> {
    try {
      // 캐릭터 설명 추가
      if (characterDescriptions) {
        characterDescriptions.forEach((desc, id) => {
          this.promptBuilder.addCharacter(id, desc);
        });
      }

      const finalPrompt = this.promptBuilder.build(prompt);
      
      // Gemini API 호출 (텍스트 모델로 이미지 생성 프롬프트 최적화)
      const result = await textModel.generateContent(finalPrompt);
      const response = await result.response;
      const text = response.text();
      
      // 실제 이미지 생성은 별도 API나 서비스 연동 필요
      // 여기서는 플레이스홀더 반환
      return {
        imageUrl: `/api/placeholder?prompt=${encodeURIComponent(text)}`,
        tokensUsed: 2, // 기본 토큰 소비
      };
    } catch (error) {
      console.error("Image generation error:", error);
      throw new Error("이미지 생성에 실패했습니다");
    }
  }

  // 이미지 기반 생성 (레퍼런스 이미지 사용)
  async generateWithReference(
    prompt: string,
    referenceImages: string[],
    characterDescriptions?: Map<string, string>
  ): Promise<{ imageUrl: string; tokensUsed: number }> {
    try {
      // 캐릭터 설명 추가
      if (characterDescriptions) {
        characterDescriptions.forEach((desc, id) => {
          this.promptBuilder.addCharacter(id, desc);
        });
      }

      const finalPrompt = this.promptBuilder.build(prompt);
      
      // Vision 모델 사용하여 레퍼런스 이미지 분석
      // 실제 구현시 이미지 업로드 및 분석 로직 추가
      
      return {
        imageUrl: `/api/placeholder?prompt=${encodeURIComponent(finalPrompt)}`,
        tokensUsed: 3, // 레퍼런스 사용시 추가 토큰
      };
    } catch (error) {
      console.error("Image generation with reference error:", error);
      throw new Error("레퍼런스 이미지를 사용한 생성에 실패했습니다");
    }
  }

  // 프롬프트 개선 제안
  async improvePrompt(prompt: string): Promise<string> {
    try {
      const improveRequest = `
        다음 웹툰 생성 프롬프트를 개선해주세요. 
        더 구체적이고 시각적으로 명확한 설명을 추가하세요:
        
        원본 프롬프트: ${prompt}
        
        개선된 프롬프트:
      `;
      
      const result = await textModel.generateContent(improveRequest);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Prompt improvement error:", error);
      return prompt; // 실패시 원본 반환
    }
  }

  // 토큰 예상 계산
  estimateTokens(prompt: string, hasReference: boolean = false): number {
    const baseTokens = 2;
    const referenceBonus = hasReference ? 1 : 0;
    const complexityBonus = prompt.length > 200 ? 1 : 0;
    
    return baseTokens + referenceBonus + complexityBonus;
  }
}

// 캐릭터 일관성 관리
export class CharacterConsistencyManager {
  private characterCache: Map<string, {
    description: string;
    features: string[];
    lastUpdated: Date;
  }>;

  constructor() {
    this.characterCache = new Map();
  }

  // 캐릭터 등록
  registerCharacter(id: string, description: string, imageUrl?: string) {
    const features = this.extractFeatures(description);
    
    this.characterCache.set(id, {
      description,
      features,
      lastUpdated: new Date(),
    });
  }

  // 특징 추출 (AI 사용)
  private extractFeatures(description: string): string[] {
    // 간단한 특징 추출 로직
    const features = [];
    
    // 머리 색상
    const hairColorMatch = description.match(/(검은|갈색|금발|빨간|파란|녹색|보라|회색|흰)\s*머리/);
    if (hairColorMatch) features.push(hairColorMatch[0]);
    
    // 눈 색상
    const eyeColorMatch = description.match(/(검은|갈색|파란|녹색|회색|빨간)\s*눈/);
    if (eyeColorMatch) features.push(eyeColorMatch[0]);
    
    // 의상
    const clothingMatch = description.match(/(셔츠|드레스|정장|유니폼|캐주얼|한복)/);
    if (clothingMatch) features.push(clothingMatch[0]);
    
    return features;
  }

  // 캐릭터 설명 가져오기
  getCharacterDescription(id: string): string | undefined {
    return this.characterCache.get(id)?.description;
  }

  // 모든 캐릭터 설명 가져오기
  getAllCharacterDescriptions(): Map<string, string> {
    const descriptions = new Map<string, string>();
    
    this.characterCache.forEach((value, key) => {
      descriptions.set(key, value.description);
    });
    
    return descriptions;
  }

  // 캐릭터 일관성 검증
  validateConsistency(characterId: string, newDescription: string): boolean {
    const existing = this.characterCache.get(characterId);
    if (!existing) return true;
    
    const newFeatures = this.extractFeatures(newDescription);
    const commonFeatures = existing.features.filter(f => 
      newFeatures.some(nf => nf.includes(f) || f.includes(nf))
    );
    
    // 50% 이상 특징이 일치하면 일관성 있음
    return commonFeatures.length >= existing.features.length * 0.5;
  }
}

// 싱글톤 인스턴스
export const imageGenerationService = new ImageGenerationService();
export const characterConsistencyManager = new CharacterConsistencyManager();