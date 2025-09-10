import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { imageStorage } from "@/lib/storage/image-storage";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }
    
    const usage = await imageStorage.getUserStorageUsage(user.id);
    
    // 바이트를 MB로 변환
    const formatSize = (bytes: number) => {
      if (bytes === 0) return "0 MB";
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    };
    
    return NextResponse.json({
      success: true,
      usage: {
        totalSize: usage.totalSize,
        totalSizeFormatted: formatSize(usage.totalSize),
        imageCount: usage.imageCount,
        buckets: Object.entries(usage.buckets).reduce((acc, [key, value]) => {
          acc[key] = {
            size: value.size,
            sizeFormatted: formatSize(value.size),
            count: value.count,
          };
          return acc;
        }, {} as Record<string, any>),
      },
      limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFileSizeFormatted: "10 MB",
        maxTotalStorage: 5 * 1024 * 1024 * 1024, // 5GB
        maxTotalStorageFormatted: "5 GB",
      },
    });
  } catch (error) {
    console.error("Storage usage API error:", error);
    return NextResponse.json(
      { success: false, error: "스토리지 사용량 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}