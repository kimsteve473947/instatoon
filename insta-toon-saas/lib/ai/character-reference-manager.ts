import { prisma } from "@/lib/db/prisma";

/**
 * 캐릭터 레퍼런스 관리 시스템
 * 사용자가 등록한 캐릭터와 레퍼런스 이미지를 관리하고
 * 프롬프트에서 자동으로 캐릭터를 인식하여 매칭
 */

// 캐릭터 정보 타입
export interface CharacterReference {
  id: string;
  name: string;                    // 기본 이름 (예: "은진")
  aliases: string[];               // 별칭들 (예: ["은진이", "은진씨", "김은진"])
  description: string;             // 상세 설명
  visualFeatures: {
    hairColor: string;
    hairStyle: string;
    eyeColor: string;
    faceShape: string;
    bodyType: string;
    height: string;
    age: string;
    gender: string;
    skinTone: string;
    distinctiveFeatures: string[]; // 특징적인 요소들
  };
  clothing: {
    default: string;               // 기본 의상
    variations: string[];          // 의상 변형들
  };
  personality: string;             // 성격 (표정 생성에 도움)
  referenceImages: string[];       // 레퍼런스 이미지 URL들
  lastUsed: Date;
  userId: string;
}

export class CharacterReferenceManager {
  private characterCache: Map<string, CharacterReference> = new Map();
  private nameToIdMap: Map<string, string> = new Map(); // 이름 -> ID 매핑
  
  /**
   * 캐릭터 등록
   */
  async registerCharacter(
    userId: string,
    character: Omit<CharacterReference, "id" | "lastUsed" | "userId">
  ): Promise<string> {
    try {
      // DB에 저장
      const saved = await prisma.character.create({
        data: {
          userId,
          name: character.name,
          description: character.description,
          referenceImages: character.referenceImages,
          metadata: {
            aliases: character.aliases,
            visualFeatures: character.visualFeatures,
            clothing: character.clothing,
            personality: character.personality,
          },
        },
      });
      
      // 캐시에 저장
      const fullCharacter: CharacterReference = {
        ...character,
        id: saved.id,
        userId,
        lastUsed: new Date(),
      };
      
      this.characterCache.set(saved.id, fullCharacter);
      
      // 이름 매핑 업데이트
      this.updateNameMappings(fullCharacter);
      
      return saved.id;
    } catch (error) {
      console.error("Character registration error:", error);
      throw new Error("캐릭터 등록 실패");
    }
  }
  
  /**
   * 이름 매핑 업데이트
   */
  private updateNameMappings(character: CharacterReference): void {
    // 기본 이름 매핑
    this.nameToIdMap.set(character.name.toLowerCase(), character.id);
    
    // 별칭 매핑
    character.aliases.forEach(alias => {
      this.nameToIdMap.set(alias.toLowerCase(), character.id);
    });
    
    // 이름 변형 자동 생성 및 매핑
    const variations = this.generateNameVariations(character.name);
    variations.forEach(variation => {
      this.nameToIdMap.set(variation.toLowerCase(), character.id);
    });
  }
  
  /**
   * 이름 변형 자동 생성
   * 예: "은진" → ["은진이", "은진씨", "은진님", "은진아", "은진이가", "은진이는"]
   */
  private generateNameVariations(name: string): string[] {
    const variations: string[] = [];
    
    // 한국어 조사/호칭 추가
    const suffixes = ["이", "씨", "님", "아", "야", "이가", "이는", "이를", "이와", "이한테", "에게"];
    const particles = ["가", "는", "를", "와", "한테", "에게", "의", "도", "만"];
    
    // 받침 확인 (간단한 체크)
    const lastChar = name.charCodeAt(name.length - 1);
    const hasJongsung = (lastChar - 0xAC00) % 28 !== 0;
    
    suffixes.forEach(suffix => {
      if (hasJongsung) {
        // 받침이 있는 경우
        if (suffix === "아" || suffix === "야") {
          variations.push(name + "아");
        } else if (suffix === "이" || suffix.startsWith("이")) {
          variations.push(name + suffix);
        } else {
          variations.push(name + suffix);
        }
      } else {
        // 받침이 없는 경우
        if (suffix === "아" || suffix === "야") {
          variations.push(name + "야");
        } else if (suffix === "이" || suffix.startsWith("이")) {
          variations.push(name + suffix.substring(1) || name);
        } else if (suffix !== "이") {
          variations.push(name + suffix);
        }
      }
    });
    
    // 조사 추가
    particles.forEach(particle => {
      if (hasJongsung) {
        if (particle === "가") variations.push(name + "이가");
        else if (particle === "는") variations.push(name + "이는");
        else if (particle === "를") variations.push(name + "을");
        else variations.push(name + particle);
      } else {
        variations.push(name + particle);
      }
    });
    
    // 영어 이름인 경우
    if (/^[A-Za-z]+$/.test(name)) {
      variations.push(name.toLowerCase());
      variations.push(name.toUpperCase());
      variations.push(name + "'s");
    }
    
    return [...new Set(variations)]; // 중복 제거
  }
  
  /**
   * 프롬프트에서 캐릭터 감지
   */
  detectCharactersInPrompt(prompt: string): {
    detectedCharacters: CharacterReference[];
    enhancedPrompt: string;
    characterMentions: Map<string, string[]>; // 캐릭터 ID -> 언급된 텍스트들
  } {
    const detectedCharacters: CharacterReference[] = [];
    const characterMentions = new Map<string, string[]>();
    let enhancedPrompt = prompt;
    
    // 모든 등록된 이름과 별칭을 검사
    for (const [nameVariant, characterId] of this.nameToIdMap.entries()) {
      // 대소문자 구분 없이 검색
      const regex = new RegExp(`\\b${this.escapeRegex(nameVariant)}\\b`, 'gi');
      const matches = prompt.match(regex);
      
      if (matches && matches.length > 0) {
        const character = this.characterCache.get(characterId);
        if (character && !detectedCharacters.find(c => c.id === characterId)) {
          detectedCharacters.push(character);
          
          // 언급된 텍스트 저장
          if (!characterMentions.has(characterId)) {
            characterMentions.set(characterId, []);
          }
          characterMentions.get(characterId)!.push(...matches);
          
          // 프롬프트에 캐릭터 마커 추가
          enhancedPrompt = enhancedPrompt.replace(
            regex,
            `[CHARACTER:${character.name}]$&[/CHARACTER]`
          );
        }
      }
    }
    
    return {
      detectedCharacters,
      enhancedPrompt,
      characterMentions,
    };
  }
  
  /**
   * 정규식 이스케이프
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * AI 프롬프트 생성용 캐릭터 설명 구성
   */
  buildCharacterDescriptionForAI(character: CharacterReference): string {
    const description = `
[캐릭터: ${character.name}]
=== 외모 특징 ===
- 머리: ${character.visualFeatures.hairColor} ${character.visualFeatures.hairStyle}
- 눈: ${character.visualFeatures.eyeColor}
- 얼굴형: ${character.visualFeatures.faceShape}
- 체형: ${character.visualFeatures.bodyType} (${character.visualFeatures.height})
- 나이: ${character.visualFeatures.age}
- 성별: ${character.visualFeatures.gender}
- 피부톤: ${character.visualFeatures.skinTone}
${character.visualFeatures.distinctiveFeatures.length > 0 ? 
  `- 특징: ${character.visualFeatures.distinctiveFeatures.join(', ')}` : ''}

=== 의상 ===
- 기본: ${character.clothing.default}
${character.clothing.variations.length > 0 ?
  `- 변형: ${character.clothing.variations.join(', ')}` : ''}

=== 성격 ===
${character.personality}

=== 중요 ===
이 캐릭터가 등장할 때마다 위의 특징을 정확히 유지해야 합니다.
별칭: ${character.aliases.join(', ')}
`;
    
    return description;
  }
  
  /**
   * 프롬프트 자동 향상
   */
  async enhancePromptWithCharacters(
    userId: string,
    originalPrompt: string
  ): Promise<{
    enhancedPrompt: string;
    detectedCharacters: CharacterReference[];
    characterDescriptions: string;
    referenceImages: string[];
  }> {
    // 사용자의 캐릭터 로드
    await this.loadUserCharacters(userId);
    
    // 프롬프트에서 캐릭터 감지
    const detection = this.detectCharactersInPrompt(originalPrompt);
    
    // 캐릭터 설명 생성
    let characterDescriptions = "";
    const referenceImages: string[] = [];
    
    detection.detectedCharacters.forEach(character => {
      characterDescriptions += this.buildCharacterDescriptionForAI(character) + "\n\n";
      
      // 레퍼런스 이미지 추가 (최대 3개)
      referenceImages.push(...character.referenceImages.slice(0, 3));
    });
    
    // 향상된 프롬프트 생성
    let enhancedPrompt = detection.enhancedPrompt;
    
    // 캐릭터가 감지되었다면 명확한 지시 추가
    if (detection.detectedCharacters.length > 0) {
      enhancedPrompt = `
${enhancedPrompt}

[캐릭터 일관성 요구사항]
위에 언급된 캐릭터들은 제공된 레퍼런스와 정확히 일치해야 합니다.
각 캐릭터의 고유한 특징을 반드시 유지하세요.
`;
    }
    
    return {
      enhancedPrompt,
      detectedCharacters: detection.detectedCharacters,
      characterDescriptions,
      referenceImages,
    };
  }
  
  /**
   * 사용자의 모든 캐릭터 로드
   */
  async loadUserCharacters(userId: string): Promise<void> {
    try {
      const characters = await prisma.character.findMany({
        where: { userId },
      });
      
      characters.forEach(char => {
        const metadata = char.metadata as any;
        
        const characterRef: CharacterReference = {
          id: char.id,
          name: char.name,
          aliases: metadata?.aliases || [],
          description: char.description,
          visualFeatures: metadata?.visualFeatures || {},
          clothing: metadata?.clothing || { default: "", variations: [] },
          personality: metadata?.personality || "",
          referenceImages: char.referenceImages as string[] || [],
          lastUsed: char.updatedAt,
          userId: char.userId,
        };
        
        this.characterCache.set(char.id, characterRef);
        this.updateNameMappings(characterRef);
      });
    } catch (error) {
      console.error("Error loading user characters:", error);
    }
  }
  
  /**
   * 캐릭터 정보 업데이트
   */
  async updateCharacter(
    characterId: string,
    updates: Partial<CharacterReference>
  ): Promise<void> {
    try {
      const character = this.characterCache.get(characterId);
      if (!character) {
        throw new Error("캐릭터를 찾을 수 없습니다");
      }
      
      // 캐시 업데이트
      const updated = { ...character, ...updates };
      this.characterCache.set(characterId, updated);
      
      // 이름 매핑 재구성
      if (updates.name || updates.aliases) {
        // 기존 매핑 제거
        for (const [name, id] of this.nameToIdMap.entries()) {
          if (id === characterId) {
            this.nameToIdMap.delete(name);
          }
        }
        // 새 매핑 추가
        this.updateNameMappings(updated);
      }
      
      // DB 업데이트
      await prisma.character.update({
        where: { id: characterId },
        data: {
          name: updated.name,
          description: updated.description,
          referenceImages: updated.referenceImages,
          metadata: {
            aliases: updated.aliases,
            visualFeatures: updated.visualFeatures,
            clothing: updated.clothing,
            personality: updated.personality,
          },
        },
      });
    } catch (error) {
      console.error("Character update error:", error);
      throw new Error("캐릭터 업데이트 실패");
    }
  }
  
  /**
   * 캐릭터 사용 통계 업데이트
   */
  async recordCharacterUsage(characterIds: string[]): Promise<void> {
    const now = new Date();
    
    for (const id of characterIds) {
      const character = this.characterCache.get(id);
      if (character) {
        character.lastUsed = now;
        
        // DB 업데이트 (비동기)
        prisma.character.update({
          where: { id },
          data: { updatedAt: now },
        }).catch(console.error);
      }
    }
  }
  
  /**
   * 자주 사용하는 캐릭터 조회
   */
  async getFrequentlyUsedCharacters(
    userId: string,
    limit: number = 5
  ): Promise<CharacterReference[]> {
    await this.loadUserCharacters(userId);
    
    const userCharacters = Array.from(this.characterCache.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit);
    
    return userCharacters;
  }
}

// 싱글톤 인스턴스
export const characterReferenceManager = new CharacterReferenceManager();