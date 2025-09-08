import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, projectName, panels } = body;

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

    let project;

    if (projectId) {
      // 기존 프로젝트 업데이트
      project = await prisma.project.update({
        where: { id: projectId },
        data: {
          title: projectName,
          updatedAt: new Date(),
          lasteditedat: new Date(),
        }
      });
    } else {
      // 새 프로젝트 생성
      project = await prisma.project.create({
        data: {
          userId: userData.id,
          title: projectName || '무제 프로젝트',
          status: 'DRAFT',
          createdAt: new Date(),
          updatedAt: new Date(),
          lasteditedat: new Date(),
        }
      });
    }

    // 패널 저장/업데이트
    if (panels && panels.length > 0) {
      // 기존 패널 삭제 후 재생성
      await prisma.panel.deleteMany({
        where: { projectId: project.id }
      });

      // 새 패널들 생성
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        await prisma.panel.create({
          data: {
            projectId: project.id,
            order: i,
            prompt: panel.prompt || '',
            imageUrl: panel.imageUrl || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });
      }

      // 프로젝트 에피소드 카운트 업데이트
      await prisma.project.update({
        where: { id: project.id },
        data: {
          episodecount: panels.length,
        }
      });
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      message: "프로젝트가 성공적으로 저장되었습니다"
    });

  } catch (error) {
    console.error("Project save error:", error);
    return NextResponse.json(
      { success: false, error: "프로젝트 저장 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}