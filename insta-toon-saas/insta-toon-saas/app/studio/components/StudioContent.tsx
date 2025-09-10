'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { MiriCanvasStudioUltimate } from "@/components/studio/MiriCanvasStudioUltimate";

export default function StudioContent() {
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
      await createNewProject();
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in?redirectTo=/studio');
        return;
      }

      const { data: userData } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .single();

      if (!userData) {
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
      
      router.replace(`/studio?projectId=${data.id}`);
      setProjectData(data);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async (panels: any[], title?: string) => {
    if (!projectData) {
      console.error('프로젝트 데이터가 없습니다');
      return;
    }

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

      console.log('저장할 데이터:', updateData);

      const { error } = await supabase
        .from('project')
        .update(updateData)
        .eq('id', projectData.id);

      if (error) {
        console.error('Supabase 에러:', error);
        throw error;
      }

      if (panels && panels.length > 0) {
        function isValidUUID(str: string): boolean {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        }

        // 트랜잭션 시작
        const panelJsonData = panels.map((panel, index) => ({
          order: index,
          prompt: panel.prompt || '',
          imageUrl: panel.imageUrl || null,
          editData: panel.editData || null,
          generationId: panel.generationId && isValidUUID(panel.generationId) ? panel.generationId : null
        }));

        console.log('RPC 호출 데이터:', { 
          p_project_id: projectData.id, 
          p_panels: panelJsonData 
        });

        // 직접 삭제-삽입 방식 사용 (더 안정적)
        console.log('직접 삭제-삽입 방식 사용');
        
        // 1. 기존 패널 삭제
        const { error: deleteError } = await supabase
          .from('panel')
          .delete()
          .eq('projectId', projectData.id);

        if (deleteError) {
          console.error('패널 삭제 에러:', deleteError);
          throw deleteError;
        }

        // 2. 새 패널 삽입 (generationId 검증 추가)
        if (panels.length > 0) {
          const validPanelData = [];
          for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            let validGenerationId = null;

            // generationId 유효성 검사 및 존재 여부 확인
            if (panel.generationId && isValidUUID(panel.generationId)) {
              const { data: genExists } = await supabase
                .from('generation')
                .select('id')
                .eq('id', panel.generationId)
                .single();
              
              if (genExists) {
                validGenerationId = panel.generationId;
              }
            }

            validPanelData.push({
              projectId: projectData.id,
              order: i,
              prompt: panel.prompt || '',
              imageUrl: panel.imageUrl || null,
              editData: panel.editData || null,
              generationId: validGenerationId
            });
          }

          console.log('검증된 패널 데이터:', validPanelData);

          const { error: insertError } = await supabase
            .from('panel')
            .insert(validPanelData);

          if (insertError) {
            console.error('패널 삽입 에러:', insertError);
            throw insertError;
          }
        }
      }

      console.log('프로젝트 저장 성공');
    } catch (error) {
      console.error('프로젝트 저장 에러:', error, typeof error === 'object' ? JSON.stringify(error) : error);
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