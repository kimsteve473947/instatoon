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
      'Fill the ENTIRE SQUARE FRAME from edge to edge',
      'No empty borders, margins, or whitespace - full bleed',
      'Balanced composition that maximally uses the square format',
      'No rectangular or portrait elements - pure square format only'
    ],
    dimensions: (width: number, height: number) => `1024x1024`,
    description: 'Perfect square format with centered composition'
  },
  '4:5': {
    format: 'PORTRAIT VERTICAL',
    orientation: 'portrait',
    composition: 'vertical portrait composition',
    requirements: [
      'The image MUST be in 4:5 portrait ratio (vertical orientation)',
      'Taller than wide - vertical format',
      'Fill the ENTIRE VERTICAL FRAME from top to bottom',
      'No empty borders, margins, or whitespace - full bleed',
      'Compose vertically with full height utilization',
      'Utilize the full vertical space effectively - edge to edge',
      'Perfect for social media portrait format - maximize frame usage'
    ],
    dimensions: (width: number, height: number) => `${width}x${height}`,
    description: 'Vertical portrait format (Gemini generation size: 896×1152px)'
  },
  '16:9': {
    format: 'LANDSCAPE HORIZONTAL',
    orientation: 'landscape',
    composition: 'horizontal landscape composition',
    requirements: [
      'The image MUST be in 16:9 landscape ratio (horizontal orientation)',
      'Wider than tall - horizontal format',
      'Fill the ENTIRE HORIZONTAL FRAME from left to right',
      'No empty borders, margins, or whitespace - full bleed',
      'Compose horizontally with full width utilization',
      'Utilize the full width for panoramic effect - edge to edge',
      'Perfect for widescreen landscape format - maximize frame usage'
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
  const exactDimensions = template.dimensions(width, height);
  
  const optimizedPrompt = `Create a professional Korean webtoon style illustration with these EXACT specifications:

${userPrompt}

${characterInstructions ? `
🎭 CHARACTER CONSISTENCY REQUIREMENTS:
${characterInstructions}
- Maintain EXACT character appearance from reference images
- Preserve ALL visual details and characteristics PRECISELY
- Keep the same face shape, hair style, eye color, clothing details
- Use the reference images as the PRIMARY source for character design
- Character appearance must be IDENTICAL to the reference images
- Adapt to the scene while keeping character identity COMPLETELY intact
- The reference images are the DEFINITIVE guide for how characters should look
` : ''}

📐 CRITICAL ASPECT RATIO REQUIREMENTS - ${template.format}:
${template.requirements.map(req => `• ${req}`).join('\n')}

📏 EXACT DIMENSIONS REQUIRED:
• Target size: ${exactDimensions} pixels
• Aspect ratio: ${aspectRatio} (${template.description})
• Orientation: ${template.orientation}
• Composition style: ${template.composition}

🎨 KOREAN WEBTOON ILLUSTRATION STYLE:
• High-quality digital artwork in Korean manhwa/webtoon aesthetic
• Clean, vibrant colors with smooth digital painting style
• Professional character design and detailed backgrounds
• Clear focal points and balanced composition
• Modern Korean digital comic book art style
• Seamless full-canvas illustration - NOT a comic panel or frame
• Content flows naturally across the entire canvas edge-to-edge
• Complete scene illustration without any framing elements
• NO WHITE PADDING or margins - pure artwork fills entire space
• NO BORDER effects - this is a complete standalone illustration
• Artwork extends fully to all canvas edges like a digital painting
• Think "digital art piece" NOT "comic book panel"

🚫 STRICTLY PROHIBITED ELEMENTS:
• NO TEXT of any kind (Korean, English, symbols, signs, labels)
• NO SPEECH BUBBLES or dialogue balloons
• NO THOUGHT BUBBLES or conversation elements
• NO WRITTEN WORDS anywhere in the image
• NO TYPOGRAPHY or lettering elements
• NO WATERMARKS or text overlays
• NO CAPTIONS or subtitles
• NO BOOK TEXT, NEWSPAPER TEXT, or SIGNS
• NO WHITE MARGINS, padding, or empty borders around content
• NO FRAME effects or picture-frame style composition
• NO PANEL BORDERS or comic book frame effects
• NO RECTANGULAR FRAMES or border lines around the image
• NO WINDOW FRAMES or architectural framing elements
• NO PHOTO FRAME effects or picture frame appearance
• NO EMPTY WHITE SPACE around the main subject
• NO COMIC BOOK PANEL appearance - this is a COMPLETE ILLUSTRATION, not a panel
• NO WEBTOON PANEL borders or frames - treat as standalone digital art
• The illustration must fill the ENTIRE canvas like a digital painting
• Think "full digital artwork" NOT "comic panel with content inside"
• PURE VISUAL STORYTELLING through complete scene illustration

⚠️ ABSOLUTE REQUIREMENTS - NON-NEGOTIABLE:
1. The final image MUST be exactly ${aspectRatio} aspect ratio
2. Dimensions must be ${exactDimensions} pixels  
3. ${template.format} format is mandatory
4. ${template.orientation} orientation only
5. Perfect ${template.composition} required
6. ZERO TEXT OR WRITING of any kind - ABSOLUTELY FORBIDDEN
7. Full bleed composition - fill entire frame edge to edge
8. ABSOLUTELY NO WHITE PADDING or margins - content must reach all edges
9. No speech bubbles, dialogue, or text elements whatsoever
10. ABSOLUTELY NO FRAMES, BORDERS, or PANEL EFFECTS - this is a COMPLETE DIGITAL ILLUSTRATION
11. Content must extend to ALL FOUR EDGES like a seamless digital painting  
12. NO RECTANGULAR BORDER appearance - treat as FULL ARTWORK, not content inside a frame
13. Think "digital art masterpiece" NOT "webtoon panel with borders"

🔍 FINAL VALIDATION CHECKPOINT:
Before generation, verify ALL these requirements:
- Is this image exactly ${aspectRatio} ratio in ${template.orientation} ${template.format} format?
- Does the composition fill the entire frame edge-to-edge with no margins?
- Is there absolutely NO WHITE PADDING or empty space around the content?
- Does the artwork extend fully to all four edges without any frame effect?
- Is there absolutely NO TEXT, speech bubbles, or writing of any kind?
- Does the image maximize visual content within the aspect ratio boundaries?
- Is there NO FRAME, BORDER, or PANEL appearance - no rectangular framing?
- Does the image look like a FULL SCENE, not content inside a frame?
- Is the content bleeding to all edges with zero empty space around it?

If ANY requirement is not met, adjust composition before generation.

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
      return { width: 896, height: 1152 }; // Gemini 4:5 generation size
    case '16:9':
      return { width: 1920, height: 1080 }; // Landscape widescreen
    default:
      return { width: 896, height: 1152 }; // Default to Gemini 4:5
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