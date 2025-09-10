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
  const { aspectRatio, userPrompt, characterInstructions } = options;
  const template = ASPECT_RATIO_TEMPLATES[aspectRatio];
  
  // 정확한 치수 계산
  // 비율 기반 접근법 - 절대적 크기 제거
  
  // 비율에 따른 정확한 픽셀 크기 계산
  const exactDimensions = getRecommendedDimensions(aspectRatio);
  
  const optimizedPrompt = `🚨 CRITICAL ASPECT RATIO REQUIREMENT: MUST BE EXACTLY ${aspectRatio} RATIO 🚨

GENERATE IMAGE: Create a professional Korean webtoon panel image with these EXACT specifications:

${userPrompt}

${characterInstructions ? `
🎭 CHARACTER CONSISTENCY REQUIREMENTS:
${characterInstructions}
- Maintain exact character appearance from reference images
- Preserve all visual details and characteristics
- Adapt to the scene while keeping character identity intact
` : ''}

📐 MANDATORY IMAGE DIMENSIONS AND RATIO - NO EXCEPTIONS:
• ⚡ CRITICAL: EXACT RATIO ${aspectRatio} - NOT 1:1, NOT ANY OTHER RATIO
• EXACT SIZE: ${exactDimensions.width} × ${exactDimensions.height} pixels  
• FORMAT: ${template.format} - MUST BE ${template.orientation}
• ORIENTATION: ${template.orientation} - ${aspectRatio === '4:5' ? 'VERTICAL PORTRAIT' : aspectRatio === '16:9' ? 'HORIZONTAL LANDSCAPE' : 'PERFECT SQUARE'}
• COMPOSITION: ${template.composition}

⚠️ CRITICAL REQUIREMENTS - ABSOLUTE COMPLIANCE REQUIRED:
${template.requirements.map(req => `• ${req}`).join('\n')}
• 🔥 NEVER GENERATE 1:1 SQUARE IMAGES WHEN ${aspectRatio} IS REQUESTED
• 🔥 MUST FOLLOW ${aspectRatio} ASPECT RATIO EXACTLY

🎨 KOREAN WEBTOON STYLE SPECIFICATIONS:
• High-quality digital illustration optimized for ${aspectRatio} format
• Clean, vibrant colors suitable for webtoon
• Professional character design and backgrounds
• Clear focal points and balanced composition for ${template.orientation} orientation
• Style consistent with modern Korean webcomics
• NO text, speech bubbles, or dialogue in the image
• Perfect fit for ${exactDimensions.width}×${exactDimensions.height} canvas

🚫 ABSOLUTELY FORBIDDEN ELEMENTS:
• NO black borders, frames, or outlines around the image
• NO white borders, frames, or picture frame effects
• NO decorative borders or edge effects of any kind
• The image should fill the entire canvas edge-to-edge
• NO letterbox, pillarbox, or any boxing effects
• Generate content that extends completely to all edges
• Seamless image without any border artifacts

🔒 NON-NEGOTIABLE FINAL REQUIREMENTS:
1. OUTPUT IMAGE MUST BE EXACTLY ${exactDimensions.width} × ${exactDimensions.height} pixels
2. OUTPUT IMAGE MUST BE EXACTLY ${aspectRatio} aspect ratio - NOT 1:1 OR ANY OTHER RATIO
3. ${template.format} format is absolutely mandatory
4. ${template.orientation} orientation only - no exceptions  
5. Perfect ${template.composition} composition required
6. Do NOT crop, stretch, or distort - generate natively in ${aspectRatio}

🎯 FINAL GENERATION COMMAND:
Generate EXACTLY ${aspectRatio} aspect ratio image (${exactDimensions.width}×${exactDimensions.height} pixels) with ${template.orientation} orientation. 
NEVER generate 1:1 square images when ${aspectRatio} is requested.
CRITICAL: The final output MUST be ${aspectRatio} ratio, not square (1:1).`;

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