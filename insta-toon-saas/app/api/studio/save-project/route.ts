import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Beacon API 요청 처리 (페이지 이탈 시 자동 저장)
    const contentType = request.headers.get('content-type');
    let body;
    
    if (contentType?.includes('text/plain')) {
      // Beacon API는 text/plain으로 전송됨
      const text = await request.text();
      body = JSON.parse(text);
    } else {
      body = await request.json();
    }
    
    const { projectId, projectName, panels } = body;
    
    // 모든 변경사항을 저장 (빈 프로젝트 체크 제거)
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 정보 조회
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    let project;

    if (projectId) {
      // 기존 프로젝트 업데이트
      const { data: updatedProject, error: updateError } = await supabase
        .from('project')
        .update({
          title: projectName,
          updatedAt: new Date().toISOString(),
          lasteditedat: new Date().toISOString(),
        })
        .eq('id', projectId)
        .eq('userId', userData.id)
        .select()
        .single();

      if (updateError) {
        console.error("프로젝트 업데이트 오류:", updateError);
        throw updateError;
      }

      project = updatedProject;
    } else {
      // 새 프로젝트 생성
      const { data: newProject, error: createError } = await supabase
        .from('project')
        .insert({
          userId: userData.id,
          title: projectName || '무제 프로젝트',
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lasteditedat: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("프로젝트 생성 오류:", createError);
        throw createError;
      }

      project = newProject;
    }

    // 패널 저장 (간단한 삭제 후 재생성)
    if (panels && panels.length > 0) {
      // 기존 패널 모두 삭제 후 새로 생성 (간단하고 빠름)
      await supabase
        .from('panel')
        .delete()
        .eq('projectId', project.id);

      // 새 패널들 일괄 생성
      const panelData = panels.map((panel, index) => ({
        projectId: project.id,
        order: index,
        prompt: panel.prompt || '',
        generationId: panel.generationId || null,
        editData: panel.editData || {
          elements: panel.elements || [],
          content: panel.content || '',
          settings: panel.settings || {},
          metadata: panel.metadata || {},
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await supabase
        .from('panel')
        .insert(panelData);

      // 프로젝트 에피소드 카운트 업데이트
      await supabase
        .from('project')
        .update({
          episodecount: panels.length,
        })
        .eq('id', project.id);
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