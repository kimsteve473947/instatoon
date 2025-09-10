import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { title, canvasRatio, selectedCharacters } = await request.json();

    // Supabase 클라이언트 생성
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
          remove: (name: string, options: any) => cookieStore.set(name, '', options),
        },
      }
    );

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 사용자 정보 가져오기
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 새 프로젝트 생성
    const newProject = {
      userId: userData.id,
      title: title || '새 프로젝트',
      description: '',
      status: 'DRAFT',
      isPublic: false,
      isdraft: true,
      workspacesettings: {
        canvasRatio,
        selectedCharacters: selectedCharacters || [],
        panels: [
          {
            id: '1',
            prompt: '',
            elements: [],
            editData: {
              canvasRatio,
              selectedCharacters: selectedCharacters || []
            }
          },
          {
            id: '2', 
            prompt: '',
            elements: [],
            editData: {
              canvasRatio,
              selectedCharacters: selectedCharacters || []
            }
          }
        ]
      },
      tags: [],
      episodecount: 0,
      viewcount: 0,
      likecount: 0
    };

    const { data: project, error: projectError } = await supabase
      .from('project')
      .insert(newProject)
      .select()
      .single();

    if (projectError) {
      console.error('프로젝트 생성 에러:', projectError);
      return NextResponse.json(
        { error: '프로젝트 생성에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      canvasRatio,
      selectedCharacters
    });

  } catch (error) {
    console.error('새 프로젝트 생성 API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다' },
      { status: 500 }
    );
  }
}