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
      console.error('❌ No project data available for saving');
      return;
    }

    console.log('💾 Starting project save:', {
      projectId: projectData.id,
      panelCount: panels?.length || 0,
      title: title || 'no title change'
    });

    try {
      // workspacesettings에서 panels 제거 (타임아웃 방지)
      const { panels: _, ...cleanWorkspaceSettings } = projectData.workspacesettings || {};
      const updateData: any = {
        lasteditedat: new Date().toISOString(),
        workspacesettings: cleanWorkspaceSettings
      };

      if (title) {
        updateData.title = title;
      }

      console.log('📤 Updating project table (without panels data):', {
        projectId: projectData.id,
        hasTitle: !!title,
        workspaceSettingsKeys: Object.keys(cleanWorkspaceSettings || {})
      });

      const { error } = await supabase
        .from('project')
        .update(updateData)
        .eq('id', projectData.id);

      if (error) {
        console.error('❌ Project table update failed:', error);
        throw error;
      } else {
        console.log('✅ Project table updated successfully');
      }

      // 패널 데이터 최적화 저장 (UPSERT 방식)
      if (panels && panels.length > 0) {
        console.log('🔄 Optimized panel save for project:', projectData.id, 'panels:', panels.length);
        
        // 기존 패널들을 한번에 가져와서 비교
        const { data: existingPanels } = await supabase
          .from('panel')
          .select('id, order')
          .eq('projectId', projectData.id);

        const panelData = panels.map((panel, index) => ({
          projectId: projectData.id,
          order: index,
          prompt: panel.prompt || '',
          imageUrl: panel.imageUrl || null,
          editData: panel.editData || null
        }));

        // 배치 크기를 제한하여 타임아웃 방지 (한번에 최대 50개씩)
        const batchSize = 50;
        
        try {
          // 더 효율적인 방법: 삭제와 삽입을 단일 트랜잭션으로 처리하되 배치 크기 제한
          console.log('🔄 Using optimized delete-and-insert strategy...');
          
          // 패널 수가 많은 경우 더 작은 배치로 처리
          const actualBatchSize = panelData.length > 100 ? 25 : batchSize;
          
          // 1단계: 기존 패널 정리 (타임아웃 방지를 위해 간단한 DELETE)
          if (existingPanels && existingPanels.length > 0) {
            console.log('🗑️ Removing existing panels...');
            
            let deleteError = null;
            
            try {
              // PostgreSQL 최적화된 삭제 시도
              const result = await supabase.rpc('delete_project_panels', {
                project_id: projectData.id
              });
              deleteError = result.error;
            } catch (rpcError) {
              // RPC 함수가 없는 경우 일반 DELETE 사용
              console.log('🔄 RPC 함수가 없어 일반 DELETE 사용');
              const result = await supabase
                .from('panel')
                .delete()
                .eq('projectId', projectData.id);
              deleteError = result.error;
            }
            
            if (deleteError) {
              console.warn('⚠️ Panel deletion had issues, continuing with insert:', deleteError);
              // 삭제 실패해도 계속 진행 (중복 키 오류는 나중에 처리)
            }
          }

          // 2단계: 새 패널들을 최적화된 배치로 삽입
          console.log(`📥 Inserting ${panelData.length} panels in batches of ${actualBatchSize}...`);
          
          for (let i = 0; i < panelData.length; i += actualBatchSize) {
            const batch = panelData.slice(i, i + actualBatchSize);
            const batchNum = Math.floor(i/actualBatchSize) + 1;
            const totalBatches = Math.ceil(panelData.length/actualBatchSize);
            
            console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} panels)`);
            
            // UPSERT를 사용하여 중복 키 오류 방지
            let retries = 0;
            const maxRetries = 2;
            
            while (retries <= maxRetries) {
              try {
                // UPSERT (INSERT ... ON CONFLICT DO UPDATE) 사용
                const { error: upsertError } = await supabase
                  .from('panel')
                  .upsert(batch, {
                    onConflict: 'projectId,order',
                    ignoreDuplicates: false
                  });
                
                if (upsertError) {
                  if (retries < maxRetries && (upsertError.code === '57014' || upsertError.message?.includes('timeout'))) {
                    retries++;
                    console.log(`⏳ Batch ${batchNum} timed out, retry ${retries}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // 지수 백오프
                    continue;
                  }
                  throw upsertError;
                }
                
                console.log(`✅ Batch ${batchNum} upserted successfully`);
                break;
                
              } catch (batchError) {
                console.error(`❌ Batch ${batchNum} error details:`, {
                  error: batchError,
                  code: batchError?.code,
                  message: batchError?.message,
                  details: batchError?.details,
                  hint: batchError?.hint,
                  batchSize: batch.length,
                  attempt: retries + 1
                });
                
                if (retries < maxRetries) {
                  retries++;
                  console.log(`🔄 Retrying batch ${batchNum} (${retries}/${maxRetries})...`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                } else {
                  console.error(`❌ Batch ${batchNum} failed after ${maxRetries} retries:`, batchError);
                  throw batchError;
                }
              }
            }
          }
          
          console.log('✅ All panels saved successfully with optimized batching');
          
        } catch (panelError) {
          console.error('❌ Optimized panel save failed:', {
            error: panelError,
            message: panelError?.message,
            code: panelError?.code,
            details: panelError?.details,
            hint: panelError?.hint,
            stack: panelError?.stack
          });
          
          // 사용자 친화적인 오류 메시지 제공
          const userMessage = panelError?.message?.includes('timeout') 
            ? '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
            : panelError?.message?.includes('network')
            ? '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.'
            : '패널 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            
          throw new Error(userMessage);
        }
      } else {
        console.log('ℹ️ No panels to save');
      }

      console.log('Project saved successfully');
    } catch (error) {
      console.error('Error saving project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Supabase 에러의 경우 추가 정보 출력
      if (error && typeof error === 'object') {
        console.error('Error code:', (error as any).code);
        console.error('Error status:', (error as any).status);
        console.error('Error details from Supabase:', (error as any).details);
        console.error('Error hint:', (error as any).hint);
      }
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