import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "프로젝트 ID가 필요합니다" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회
    const userData = await prisma.user.findUnique({
      where: { supabaseId: user.id }
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 프로젝트와 패널 정보 조회
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userData.id
      },
      include: {
        panels: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 스튜디오 스토어 형식으로 변환
    const studioData = {
      currentProject: {
        id: project.id,
        name: project.title,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        isAutoSaving: false,
      },
      panels: project.panels.map(panel => ({
        id: panel.id,
        prompt: panel.prompt,
        imageUrl: panel.imageUrl,
        isGenerating: false,
        generatedAt: panel.updatedAt,
      }))
    };

    return NextResponse.json({
      success: true,
      ...studioData
    });

  } catch (error) {
    console.error("Project load error:", error);
    return NextResponse.json(
      { success: false, error: "프로젝트 로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}