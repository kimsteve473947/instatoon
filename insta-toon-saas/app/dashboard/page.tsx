'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Grid3x3, 
  List, 
  MoreVertical,
  Clock,
  FolderOpen,
  Image as ImageIcon,
  Eye,
  Sparkles,
  Filter,
  SortAsc,
  FileImage,
  User,
  Users,
  Palette
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  panelCount: number;
  status: 'draft' | 'completed';
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  projectId?: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  createdAt: string;
  isActive: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 사용자 데이터 가져오기
      const { data: userData } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .single();

      if (!userData) return;

      // 최근 프로젝트 가져오기
      const { data: projectsData } = await supabase
        .from('project')
        .select('*')
        .eq('userId', userData.id)
        .order('lasteditedat', { ascending: false })
        .limit(12);

      // 프로젝트 데이터 변환
      const formattedProjects = projectsData?.map(project => ({
        id: project.id,
        title: project.title || '무제 프로젝트',
        createdAt: project.createdat,
        updatedAt: project.lasteditedat || project.createdat,
        panelCount: project.episodecount || 0,
        status: project.isdraft ? 'draft' : 'completed'
      })) || [];

      // 생성된 이미지들 가져오기 (패널에서)
      const { data: panelsData } = await supabase
        .from('panel')
        .select('*, project:projectId(userId)')
        .not('imageUrl', 'is', null)
        .eq('project.userId', userData.id)
        .order('createdat', { ascending: false })
        .limit(20);

      // 이미지 데이터 변환
      const formattedImages = panelsData?.map(panel => ({
        id: panel.id,
        imageUrl: panel.imageUrl,
        prompt: panel.prompt || '프롬프트 없음',
        createdAt: panel.createdat,
        projectId: panel.projectId
      })) || [];

      // 캐릭터 데이터 가져오기
      const { data: charactersData } = await supabase
        .from('character')
        .select('*')
        .eq('userId', userData.id)
        .order('createdAt', { ascending: false })
        .limit(12);

      // 캐릭터 데이터 변환
      const formattedCharacters = charactersData?.map(character => ({
        id: character.id,
        name: character.name,
        description: character.description,
        thumbnailUrl: character.thumbnailUrl || '',
        createdAt: character.createdAt,
        isActive: false
      })) || [];

      setProjects(formattedProjects);
      setGeneratedImages(formattedImages);
      setCharacters(formattedCharacters);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    router.push('/studio');
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 왼쪽: 타이틀과 정보 */}
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">내 드라이브</h1>
              <div className="flex items-center text-sm text-gray-500">
                <FolderOpen className="h-4 w-4 mr-1" />
                <span>{projects.length}개 프로젝트</span>
              </div>
            </div>

            {/* 오른쪽: 액션 버튼들 */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleNewProject}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                새 디자인 만들기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 바 */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* 왼쪽: 탭과 검색 */}
          <div className="flex items-center space-x-6">
            <div className="flex space-x-1">
              <button className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg">
                전체
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                웹툰 스페이스
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                등록된 캐릭터
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                AI 생성 이미지
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>

          {/* 오른쪽: 뷰 옵션 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-gray-100' : ''}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-gray-100' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 웹툰 스페이스 섹션 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">웹툰 스페이스</h2>
            <Button variant="ghost" size="sm" className="text-gray-600">
              전체 보기 <span className="ml-1">›</span>
            </Button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* 빈 프로젝트 카드들 (미리캔버스 스타일) */}
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="group relative aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
                  onClick={handleNewProject}
                >
                  <div className="absolute top-3 left-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-100 rounded">
                      추천
                    </span>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 mb-3 rounded-lg bg-white border-2 border-gray-200 flex items-center justify-center">
                      <FolderOpen className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 text-center px-3">
                      웹툰 프로젝트
                    </p>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">무제 프로젝트</h3>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>방금 전</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/studio?projectId=${project.id}`}>
                  <div className="group relative aspect-[4/5] bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer">
                    <div className="absolute top-3 left-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium text-yellow-600 bg-yellow-100 rounded">
                        추천
                      </span>
                    </div>
                    
                    {/* 프로젝트 썸네일 */}
                    <div className="absolute inset-4 top-8 bottom-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                      {project.thumbnail ? (
                        <img 
                          src={project.thumbnail} 
                          alt={project.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white border-2 border-gray-200 flex items-center justify-center">
                          <FolderOpen className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* 프로젝트 정보 */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">
                        {project.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 호버 시 나타나는 액션 버튼 */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}

              {/* 새 프로젝트 추가 카드 */}
              <div
                className="aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer flex items-center justify-center"
                onClick={handleNewProject}
              >
                <div className="text-center">
                  <Plus className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-purple-600">새 프로젝트</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 등록된 캐릭터 섹션 */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">등록된 캐릭터</h2>
            <Button variant="ghost" size="sm" className="text-gray-600">
              전체 보기 <span className="ml-1">›</span>
            </Button>
          </div>

          {characters.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* 빈 캐릭터 카드들 */}
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="group relative aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 mb-3 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 text-center px-3">
                      캐릭터 생성
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {characters.map((character) => (
                <div key={character.id} className="group relative aspect-square">
                  <div className="w-full h-full bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer overflow-hidden">
                    {/* 캐릭터 이미지 */}
                    <div className="w-full h-3/4 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      {character.thumbnailUrl ? (
                        <img 
                          src={character.thumbnailUrl} 
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    
                    {/* 캐릭터 정보 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white p-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {character.name}
                      </h3>
                    </div>

                    {/* 호버 시 나타나는 액션 버튼 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* 새 캐릭터 추가 카드 */}
              <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-100 hover:to-indigo-100 transition-all cursor-pointer flex items-center justify-center">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-600">새 캐릭터</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI 생성 이미지 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">AI 생성 이미지</h2>
            <Button variant="ghost" size="sm" className="text-gray-600">
              전체 보기 <span className="ml-1">›</span>
            </Button>
          </div>

          {generatedImages.length === 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {/* 빈 이미지 카드들 */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center"
                >
                  <div className="text-center">
                    <FileImage className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">요소 생성</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {generatedImages.map((image) => (
                <div key={image.id} className="group relative aspect-square">
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-purple-300 transition-all"
                  />
                  
                  {/* 호버 시 오버레이 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        보기
                      </Button>
                    </div>
                  </div>

                  {/* 작은 아이콘 오버레이 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}