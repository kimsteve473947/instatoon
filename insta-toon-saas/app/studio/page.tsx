'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { MiriCanvasStudioUltimate } from "@/components/studio/MiriCanvasStudioUltimate";

export default function StudioPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (projectId) {
      loadProject();
    } else {
      // 프로젝트 ID가 없으면 새 프로젝트 생성
      createNewProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectData(data);
    } catch (error) {
      console.error('Error loading project:', error);
      // 프로젝트 로드 실패시 새 프로젝트로
      await createNewProject();
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
        router.push('/sign-in?redirectTo=/studio');
        return;
      }

      const { data: userData } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .single();

      if (!userData) {
        // 유저 데이터 생성
        const { data: newUser, error: createError } = await supabase
          .from('user')
          .insert({ 
            supabaseId: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          })
          .select()
          .single();
        
        if (createError || !newUser) {
          console.error('Error creating user:', createError);
          setLoading(false);
          return;
        }
        
        // 새로 생성된 유저 데이터 사용
        const newProject = {
          userId: newUser.id,
          title: '무제 프로젝트',
          description: '',
          status: 'DRAFT',
          isPublic: false,
          isdraft: true,
          workspacesettings: {},
          tags: [],
          episodecount: 0,
          viewcount: 0,
          likecount: 0
        };

        const { data, error } = await supabase
          .from('project')
          .insert(newProject)
          .select()
          .single();

        if (error) throw error;
        
        router.replace(`/studio?projectId=${data.id}`);
        setProjectData(data);
        setLoading(false);
        return;
      }

      const newProject = {
        userId: userData.id,
        title: '무제 프로젝트',
        description: '',
        status: 'DRAFT',
        isPublic: false,
        isdraft: true,
        workspacesettings: {},
        tags: [],
        episodecount: 0,
        viewcount: 0,
        likecount: 0
      };

      const { data, error } = await supabase
        .from('project')
        .insert(newProject)
        .select()
        .single();

      if (error) throw error;
      
      // URL을 프로젝트 ID로 업데이트
      router.replace(`/studio?projectId=${data.id}`);
      setProjectData(data);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async (panels: any[], title?: string) => {
    if (!projectData) return;

    try {

      const updateData: any = {
        lasteditedat: new Date().toISOString(),
        workspacesettings: {
          ...projectData.workspacesettings,
          panels
        }
      };

      if (title) {
        updateData.title = title;
      }

      const { error } = await supabase
        .from('project')
        .update(updateData)
        .eq('id', projectData.id);

      if (error) throw error;

      // 패널 데이터도 저장
      if (panels && panels.length > 0) {
        // 기존 패널 삭제
        await supabase
          .from('panel')
          .delete()
          .eq('projectId', projectData.id);

        // 새 패널 저장
        const panelData = panels.map((panel, index) => ({
          projectId: projectData.id,
          order: index,
          prompt: panel.prompt || '',
          imageUrl: panel.imageUrl || null,
          editData: panel.editData || null
        }));

        await supabase
          .from('panel')
          .insert(panelData);
      }

      console.log('Project saved successfully');
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <MiriCanvasStudioUltimate 
      projectId={projectData?.id}
      initialData={projectData}
      onSave={saveProject}
    />
  );
}