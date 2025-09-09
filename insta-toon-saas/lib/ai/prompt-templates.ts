/**
 * 캔버스 비율에 최적화된 프롬프트 템플릿 생성기
 * 1:1, 4:5, 16:9 비율에 맞는 완벽한 프롬프트를 자동 구성
 */

export type AspectRatio = '1:1' | '4:5' | '16:9';

interface PromptTemplateOptions {
  aspectRatio: AspectRatio;
  userPrompt: string;
  characterInstructions?: string;
  width: number;
  height: number;
}

/**
 * 비율별 최적화된 기본 지시사항
 */
const ASPECT_RATIO_TEMPLATES = {
  '1:1': {
    format: 'PERFECT SQUARE',
    orientation: 'square',
    composition: 'centered square composition',
    requirements: [
      'The image MUST be a perfect 1:1 square ratio',
      'Equal width and height dimensions exactly',
      'Center the subject within the square frame',
      'Balanced composition that fills the square format completely',
      'No rectangular or portrait elements - pure square format only'
    ],
    dimensions: (size: number) => `${size}x${size}`,
    description: 'Perfect square format with centered composition'
  },
  '4:5': {
    format: 'PORTRAIT VERTICAL',
    orientation: 'portrait',
    composition: 'vertical portrait composition',
    requirements: [
      'The image MUST be in 4:5 portrait ratio (vertical orientation)',
      'Taller than wide - vertical format',
      'Compose vertically with proper headroom and ground space',
      'Utilize the full vertical space effectively',
      'Perfect for social media portrait format'
    ],
    dimensions: (width: number, height: number) => `${width}x${height}`,
    description: 'Vertical portrait format optimized for social media'
  },
  '16:9': {
    format: 'LANDSCAPE HORIZONTAL',
    orientation: 'landscape',
    composition: 'horizontal landscape composition',
    requirements: [
      'The image MUST be in 16:9 landscape ratio (horizontal orientation)',
      'Wider than tall - horizontal format',
      'Compose horizontally with proper left-right balance',
      'Utilize the full width for panoramic effect',
      'Perfect for widescreen landscape format'
    ],
    dimensions: (width: number, height: number) => `${width}x${height}`,
    description: 'Wide horizontal landscape format'
  }
} as const;

/**
 * 비율에 최적화된 완벽한 프롬프트 생성
 */
export function generateOptimizedPrompt(options: PromptTemplateOptions): string {
  const { aspectRatio, userPrompt, characterInstructions, width, height } = options;
  const template = ASPECT_RATIO_TEMPLATES[aspectRatio];
  
  // 정확한 치수 계산
  let exactDimensions: string;
  if (aspectRatio === '1:1') {
    const squareSize = Math.max(width, height);
    exactDimensions = template.dimensions(squareSize);
  } else {
    exactDimensions = template.dimensions(width, height);
  }
  
  const optimizedPrompt = `Create a professional Korean webtoon panel image with these EXACT specifications:

${userPrompt}

${characterInstructions ? `
🎭 CHARACTER CONSISTENCY REQUIREMENTS:
${characterInstructions}
- Maintain exact character appearance from reference images
- Preserve all visual details and characteristics
- Adapt to the scene while keeping character identity intact
` : ''}

📐 CRITICAL ASPECT RATIO REQUIREMENTS - ${template.format}:
${template.requirements.map(req => `• ${req}`).join('\n')}

📏 EXACT DIMENSIONS REQUIRED:
• Target size: ${exactDimensions} pixels
• Aspect ratio: ${aspectRatio} (${template.description})
• Orientation: ${template.orientation}
• Composition style: ${template.composition}

🎨 KOREAN WEBTOON STYLE SPECIFICATIONS:
• High-quality digital illustration
• Clean, vibrant colors suitable for webtoon
• Professional character design and backgrounds
• Clear focal points and balanced composition
• Style consistent with modern Korean webcomics
• NO text, speech bubbles, or dialogue in the image

⚠️ ABSOLUTE REQUIREMENTS - NON-NEGOTIABLE:
1. The final image MUST be exactly ${aspectRatio} aspect ratio
2. Dimensions must be ${exactDimensions} pixels  
3. ${template.format} format is mandatory
4. ${template.orientation} orientation only
5. Perfect ${template.composition} required

🔍 FINAL VALIDATION CHECKPOINT:
Before generation, verify: Is this image going to be exactly ${aspectRatio} ratio in ${template.orientation} ${template.format} format? If not, adjust composition to match requirements above.

Generate the image now with perfect adherence to these specifications.`;

  return optimizedPrompt;
}

/**
 * 비율별 권장 치수 반환
 */
export function getRecommendedDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 }; // Perfect square
    case '4:5':
      return { width: 1024, height: 1280 }; // Portrait for social media
    case '16:9':
      return { width: 1920, height: 1080 }; // Landscape widescreen
    default:
      return { width: 1024, height: 1280 }; // Default to 4:5
  }
}

/**
 * 비율 검증
 */
export function validateAspectRatio(width: number, height: number, expectedRatio: AspectRatio): boolean {
  const actualRatio = width / height;
  
  switch (expectedRatio) {
    case '1:1':
      return Math.abs(actualRatio - 1.0) < 0.01; // Allow 1% tolerance
    case '4:5':
      return Math.abs(actualRatio - 0.8) < 0.01; // 4/5 = 0.8
    case '16:9':
      return Math.abs(actualRatio - (16/9)) < 0.01; // 16/9 ≈ 1.778
    default:
      return false;
  }
}

/**
 * 비율별 내부 처리용 메타데이터 (UI 노출 없음)
 */
export function getInternalRatioMetadata(aspectRatio: AspectRatio): {
  formatName: string;
  orientation: string;
  description: string;
} {
  const template = ASPECT_RATIO_TEMPLATES[aspectRatio];
  return {
    formatName: template.format,
    orientation: template.orientation,
    description: template.description
  };
}