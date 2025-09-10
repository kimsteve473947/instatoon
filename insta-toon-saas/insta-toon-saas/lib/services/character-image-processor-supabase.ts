/**
 * 캐릭터 이미지 다중 비율 처리 서비스 (Supabase 저장소 사용)
 * 
 * Vercel Blob 대신 Supabase Storage를 사용하는 임시 버전
 */

import Sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

export interface RatioImages {
  '1:1': string[];
  '4:5': string[];  
  '16:9': string[];
}

export interface ImageProcessingResult {
  success: boolean;
  ratioImages?: RatioImages;
  error?: string;
  processedCount?: number;
}

// 비율별 권장 크기 정의
const RATIO_DIMENSIONS = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '16:9': { width: 1920, height: 1080 }
} as const;

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 캐릭터 이미지를 다중 비율로 처리하고 저장
 */
export async function processCharacterImages(
  originalImages: string[],
  characterId: string
): Promise<ImageProcessingResult> {
  try {
    console.log(`🔄 Reprocessing images for existing character ${characterId}`);
    console.log(`🎨 Processing ${originalImages.length} images for character ${characterId}`);
    
    let processedCount = 0;
    const ratioImages: RatioImages = {
      '1:1': [],
      '4:5': [],
      '16:9': []
    };
    
    // 각 원본 이미지를 처리
    for (let i = 0; i < originalImages.length; i++) {
      const imageUrl = originalImages[i];
      console.log(`📸 Processing image ${i + 1}/${originalImages.length}: ${imageUrl.slice(0, 50)}...`);
      
      // 각 비율로 변환
      for (const ratio of ['1:1', '4:5', '16:9'] as const) {
        try {
          const paddedImageBuffer = await addWhitePaddingToRatio(imageUrl, ratio);
          const filename = `character_${characterId}_${i}_${ratio}_${Date.now()}.png`;
          
          // Supabase Storage에 저장
          const { data, error } = await supabase.storage
            .from('character-images')
            .upload(`ratio-images/${filename}`, paddedImageBuffer, {
              contentType: 'image/png',
              upsert: false
            });
          
          if (error) throw error;
          
          // 공개 URL 생성
          const { data: { publicUrl } } = supabase.storage
            .from('character-images')
            .getPublicUrl(`ratio-images/${filename}`);
          
          ratioImages[ratio].push(publicUrl);
          console.log(`✅ Saved ${ratio} ratio image: ${publicUrl.slice(0, 50)}...`);
          
        } catch (ratioError) {
          console.error(`❌ Failed to process ${ratio} ratio for image ${i}:`, ratioError);
          // 개별 비율 실패해도 계속 진행
        }
      }
      
      processedCount++;
    }
    
    console.log(`✅ Character image processing completed: ${processedCount}/${originalImages.length} images processed`);
    
    return {
      success: true,
      ratioImages,
      processedCount
    };
    
  } catch (error) {
    console.error('❌ Character image processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 이미지에 하얀 배경 패딩을 추가하여 특정 비율로 변환
 */
async function addWhitePaddingToRatio(
  imageUrl: string,
  targetRatio: keyof typeof RATIO_DIMENSIONS
): Promise<Buffer> {
  console.log(`📏 Processing for ${targetRatio}: Original image processing...`);
  
  // 원본 이미지 다운로드
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  
  // 원본 이미지 메타데이터 가져오기
  const { width: originalWidth, height: originalHeight } = await Sharp(imageBuffer).metadata();
  
  if (!originalWidth || !originalHeight) {
    throw new Error('Failed to get image dimensions');
  }
  
  // 타겟 비율 계산
  const targetDimensions = RATIO_DIMENSIONS[targetRatio];
  const targetRatioNum = targetDimensions.width / targetDimensions.height;
  const originalRatio = originalWidth / originalHeight;
  
  console.log(`📏 Processing for ${targetRatio}: Original ${originalWidth}x${originalHeight} (${originalRatio.toFixed(2)}) → Target ${targetDimensions.width}x${targetDimensions.height} (${targetRatioNum.toFixed(2)})`);
  
  // 리사이즈 및 패딩 계산
  let newWidth, newHeight;
  let padTop = 0, padBottom = 0, padLeft = 0, padRight = 0;
  
  if (originalRatio > targetRatioNum) {
    // 원본이 더 가로로 넓음 - 높이에 맞추고 좌우에 패딩
    newWidth = targetDimensions.width;
    newHeight = Math.round(targetDimensions.width / originalRatio);
    padTop = Math.floor((targetDimensions.height - newHeight) / 2);
    padBottom = targetDimensions.height - newHeight - padTop;
  } else {
    // 원본이 더 세로로 김 또는 같음 - 너비에 맞추고 상하에 패딩
    newHeight = targetDimensions.height;
    newWidth = Math.round(targetDimensions.height * originalRatio);
    padLeft = Math.floor((targetDimensions.width - newWidth) / 2);
    padRight = targetDimensions.width - newWidth - padLeft;
  }
  
  console.log(`🔧 Padding calculation: resize to ${newWidth}x${newHeight}, pad: top=${padTop}, bottom=${padBottom}, left=${padLeft}, right=${padRight}`);
  
  // Sharp로 이미지 처리
  const processedImage = await Sharp(imageBuffer)
    .resize(newWidth, newHeight, {
      fit: 'fill',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toBuffer();
  
  console.log(`✅ Successfully processed image to ${targetRatio} ratio`);
  return processedImage;
}

/**
 * 기존 캐릭터의 이미지를 재처리 (Supabase 저장소 버전)
 */
export async function reprocessExistingCharacterImages(
  characterId: string,
  referenceImages: string[]
): Promise<ImageProcessingResult> {
  return processCharacterImages(referenceImages, characterId);
}