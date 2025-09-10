/**
 * 캐릭터 이미지 다중 비율 처리 서비스
 * 
 * 캐릭터 등록 시점에 원본 이미지를 1:1, 4:5, 16:9 비율로 변환하여
 * 하얀 배경 패딩을 추가한 이미지를 생성하고 저장하는 서비스
 */

import { put } from '@vercel/blob';
import Sharp from 'sharp';

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

/**
 * 캐릭터 이미지들을 3가지 비율로 변환하여 저장
 */
export async function processCharacterImages(
  originalImages: string[],
  characterId: string
): Promise<ImageProcessingResult> {
  try {
    console.log(`🎨 Processing ${originalImages.length} images for character ${characterId}`);
    
    const ratioImages: RatioImages = {
      '1:1': [],
      '4:5': [],
      '16:9': []
    };

    let processedCount = 0;
    
    for (let i = 0; i < originalImages.length; i++) {
      const imageUrl = originalImages[i];
      console.log(`📸 Processing image ${i + 1}/${originalImages.length}: ${imageUrl.slice(0, 50)}...`);
      
      // 각 비율로 변환
      for (const ratio of ['1:1', '4:5', '16:9'] as const) {
        try {
          const paddedImageBuffer = await addWhitePaddingToRatio(imageUrl, ratio);
          const filename = `character_${characterId}_${i}_${ratio}_${Date.now()}.png`;
          
          // Vercel Blob에 저장
          const blob = await put(filename, paddedImageBuffer, {
            access: 'public',
            contentType: 'image/png'
          });
          
          ratioImages[ratio].push(blob.url);
          console.log(`✅ Saved ${ratio} ratio image: ${blob.url.slice(0, 50)}...`);
          
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
  try {
    // 1. 원본 이미지 다운로드
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // 2. 원본 이미지 메타데이터
    const { width: originalWidth, height: originalHeight } = await Sharp(imageBuffer).metadata();
    
    if (!originalWidth || !originalHeight) {
      throw new Error('Failed to get image dimensions');
    }
    
    // 3. 목표 비율 및 크기
    const targetDimensions = RATIO_DIMENSIONS[targetRatio];
    const targetRatio_num = targetDimensions.width / targetDimensions.height;
    const originalRatio = originalWidth / originalHeight;
    
    console.log(`📏 Processing for ${targetRatio}: Original ${originalWidth}x${originalHeight} (${originalRatio.toFixed(2)}) → Target ${targetDimensions.width}x${targetDimensions.height} (${targetRatio_num.toFixed(2)})`);
    
    // 4. 패딩 계산 (contain 방식)
    let newWidth, newHeight;
    let padTop = 0, padBottom = 0, padLeft = 0, padRight = 0;
    
    if (originalRatio > targetRatio_num) {
      // 원본이 더 넓음 - 너비에 맞추고 상하 패딩
      newWidth = targetDimensions.width;
      newHeight = Math.round(targetDimensions.width / originalRatio);
      padTop = Math.floor((targetDimensions.height - newHeight) / 2);
      padBottom = targetDimensions.height - newHeight - padTop;
    } else {
      // 원본이 더 높거나 같음 - 높이에 맞추고 좌우 패딩  
      newHeight = targetDimensions.height;
      newWidth = Math.round(targetDimensions.height * originalRatio);
      padLeft = Math.floor((targetDimensions.width - newWidth) / 2);
      padRight = targetDimensions.width - newWidth - padLeft;
    }
    
    console.log(`🔧 Padding calculation: resize to ${newWidth}x${newHeight}, pad: top=${padTop}, bottom=${padBottom}, left=${padLeft}, right=${padRight}`);
    
    // 5. Sharp를 사용하여 리사이즈 및 패딩 추가
    const processedImage = await Sharp(imageBuffer)
      .resize(newWidth, newHeight, {
        fit: 'fill', // 정확한 크기로 리사이즈
        background: { r: 255, g: 255, b: 255, alpha: 1 } // 하얀 배경
      })
      .extend({
        top: padTop,
        bottom: padBottom,
        left: padLeft,
        right: padRight,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // 하얀 패딩
      })
      .png() // PNG 포맷으로 출력
      .toBuffer();
    
    console.log(`✅ Successfully processed image to ${targetRatio} ratio`);
    return processedImage;
    
  } catch (error) {
    console.error(`❌ Error processing image for ${targetRatio} ratio:`, error);
    throw error;
  }
}

/**
 * 단일 이미지를 특정 비율로 변환 (테스트용)
 */
export async function processImageToRatio(
  imageUrl: string,
  targetRatio: keyof typeof RATIO_DIMENSIONS
): Promise<Buffer> {
  return addWhitePaddingToRatio(imageUrl, targetRatio);
}

/**
 * 기존 캐릭터의 이미지를 비율별로 재처리 (마이그레이션용)
 */
export async function reprocessExistingCharacterImages(
  characterId: string,
  originalImages: string[]
): Promise<ImageProcessingResult> {
  console.log(`🔄 Reprocessing images for existing character ${characterId}`);
  return processCharacterImages(originalImages, characterId);
}