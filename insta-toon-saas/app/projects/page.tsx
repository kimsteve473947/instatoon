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
  Users,
  Download,
  ChevronRight
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

interface Character {
  id: string;
  name: string;
  thumbnailUrl?: string;
  referenceImages: string[];
  createdAt: string;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  projectId?: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'webtoon' | 'characters' | 'images'>('all');
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
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // 개발 모드: 로컬 스토리지에서 데이터 로드
        console.log('Development mode: Loading local data');
        
        // 로컬 스토리지에서 프로젝트 데이터 가져오기
        const savedProjects = localStorage.getItem('instatoon_projects');
        const savedCharacters = localStorage.getItem('instatoon_characters');
        const savedImages = localStorage.getItem('instatoon_generated_images');
        
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects));
        }
        if (savedCharacters) {
          setCharacters(JSON.parse(savedCharacters));
        }
        if (savedImages) {
          setGeneratedImages(JSON.parse(savedImages));
        }
        
        setLoading(false);
        return;
      }
      
      // 프로덕션 모드: 실제 데이터베이스에서 로드
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 사용자 데이터 가져오기
      const { data: userData } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .single();

      if (!userData) return;

      // 프로젝트 데이터 로드
      const { data: projectsData } = await supabase
        .from('project')
        .select('*')
        .eq('userId', userData.id)
        .order('lasteditedat', { ascending: false });

      const formattedProjects = projectsData?.map(project => ({
        id: project.id,
        title: project.title || '무제 프로젝트',
        createdAt: project.createdAt,
        updatedAt: project.lasteditedat || project.createdAt,
        panelCount: project.episodecount || 0,
        status: (project.isdraft ? 'draft' : 'completed') as 'draft' | 'completed'
      })) || [];

      // 캐릭터 데이터 로드
      const { data: charactersData } = await supabase
        .from('character')
        .select('*')
        .eq('userId', userData.id)
        .order('createdAt', { ascending: false });

      const formattedCharacters = charactersData?.map(char => ({
        id: char.id,
        name: char.name,
        thumbnailUrl: char.thumbnailUrl,
        referenceImages: char.referenceImages || [],
        createdAt: char.createdAt,
      })) || [];

      // 생성된 이미지들 가져오기
      const { data: generationsData } = await supabase
        .from('generation')
        .select('*')
        .eq('userId', userData.id)
        .not('imageUrl', 'is', null)
        .order('createdAt', { ascending: false })
        .limit(20);

      const formattedImages = generationsData?.map(gen => ({
        id: gen.id,
        imageUrl: gen.imageUrl,
        prompt: gen.prompt || '프롬프트 없음',
        createdAt: gen.createdAt,
        projectId: gen.projectId
      })) || [];

      setProjects(formattedProjects);
      setCharacters(formattedCharacters);
      setGeneratedImages(formattedImages);
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

  const filteredCharacters = characters.filter(character =>
    character.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredImages = generatedImages.filter(image =>
    image.prompt.toLowerCase().includes(searchQuery.toLowerCase())
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
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">내 작업 공간</h1>
              {process.env.NODE_ENV === 'development' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                  개발 모드
                </span>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <FolderOpen className="h-4 w-4 mr-1" />
                <span>{projects.length}개 프로젝트</span>
                <span className="mx-2">•</span>
                <Users className="h-4 w-4 mr-1" />
                <span>{characters.length}개 캐릭터</span>
                <span className="mx-2">•</span>
                <ImageIcon className="h-4 w-4 mr-1" />
                <span>{generatedImages.length}개 이미지</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleNewProject}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                새 웹툰 만들기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 바 */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'all' 
                    ? 'text-purple-600 bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                전체
              </button>
              <button 
                onClick={() => setActiveTab('webtoon')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'webtoon' 
                    ? 'text-purple-600 bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FolderOpen className="h-4 w-4 inline mr-2" />
                웹툰 스페이스
              </button>
              <button 
                onClick={() => setActiveTab('characters')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'characters' 
                    ? 'text-purple-600 bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                내 캐릭터
              </button>
              <button 
                onClick={() => setActiveTab('images')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'images' 
                    ? 'text-purple-600 bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="h-4 w-4 inline mr-2" />
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

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            <Button variant="ghost" size="sm">
              <SortAsc className="h-4 w-4 mr-2" />
              정렬
            </Button>
            <div className="border-l h-6 mx-2"></div>
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

        {/* 전체 탭 - 미리캔버스 스타일 */}
        {activeTab === 'all' && (
          <div className="space-y-12">
            {/* 웹툰 스페이스 섹션 */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FolderOpen className="h-5 w-5 mr-2 text-purple-600" />
                  웹툰 스페이스
                  <span className="ml-2 text-sm font-normal text-gray-500">({projects.length}개)</span>
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 hover:text-purple-600"
                  onClick={() => setActiveTab('webtoon')}
                >
                  전체 보기 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide">
                  {/* 새 프로젝트 생성 카드 */}
                  <div
                    className="flex-shrink-0 w-48 aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer flex flex-col items-center justify-center group"
                    onClick={handleNewProject}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                        <Plus className="h-6 w-6 text-purple-500" />
                      </div>
                      <p className="text-sm font-semibold text-purple-700 mb-1">새 웹툰 만들기</p>
                      <p className="text-xs text-purple-500">AI로 쉽고 빠르게</p>
                    </div>
                  </div>

                  {/* 프로젝트 카드들 */}
                  {projects.slice(0, 8).map((project) => (
                    <Link key={project.id} href={`/studio?projectId=${project.id}`}>
                      <div className="flex-shrink-0 w-48 aspect-[4/5] bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden group">
                        <div className="absolute inset-4 top-4 bottom-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
                          {project.thumbnail ? (
                            <img 
                              src={project.thumbnail} 
                              alt={project.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                              <span className="text-xs text-gray-400">{project.panelCount}개 패널</span>
                            </div>
                          )}
                        </div>

                        <div className="absolute top-3 left-3">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            project.status === 'completed' 
                              ? 'text-green-600 bg-green-100' 
                              : 'text-orange-600 bg-orange-100'
                          }`}>
                            {project.status === 'completed' ? '완성' : '작업중'}
                          </span>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                            {project.title}
                          </h3>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* 내 캐릭터 섹션 */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  내 캐릭터
                  <span className="ml-2 text-sm font-normal text-gray-500">({characters.length}개)</span>
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 hover:text-purple-600"
                  onClick={() => setActiveTab('characters')}
                >
                  전체 보기 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                  {characters.slice(0, 10).map((character) => (
                    <div key={character.id} className="flex-shrink-0 w-32 group bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer relative">
                      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                        {character.thumbnailUrl || (character.referenceImages && character.referenceImages.length > 0) ? (
                          <img 
                            src={character.thumbnailUrl || character.referenceImages[0]} 
                            alt={character.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-8 w-8 text-gray-300" />
                        )}
                      </div>
                      
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{character.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(character.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {characters.length === 0 && (
                    <div className="flex-shrink-0 w-32 aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">캐릭터 없음</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* AI 생성 이미지 섹션 */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  AI 생성 이미지
                  <span className="ml-2 text-sm font-normal text-gray-500">({generatedImages.length}개)</span>
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-600 hover:text-purple-600"
                  onClick={() => setActiveTab('images')}
                >
                  전체 보기 <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                  {generatedImages.slice(0, 12).map((image) => (
                    <div key={image.id} className="flex-shrink-0 w-32 group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer">
                      <img
                        src={image.imageUrl}
                        alt={image.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="secondary" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            보기
                          </Button>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {image.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {generatedImages.length === 0 && (
                    <div className="flex-shrink-0 w-32 aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">이미지 없음</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 웹툰 스페이스 탭 */}
        {activeTab === 'webtoon' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FolderOpen className="h-5 w-5 mr-2 text-purple-600" />
                웹툰 스페이스
                <span className="ml-2 text-sm font-normal text-gray-500">({filteredProjects.length}개)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {/* 새 프로젝트 생성 카드 */}
              <div
                className="aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer flex flex-col items-center justify-center group"
                onClick={handleNewProject}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                    <Plus className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-lg font-semibold text-purple-700 mb-2">새 웹툰 만들기</p>
                  <p className="text-sm text-purple-500">AI로 쉽고 빠르게</p>
                </div>
              </div>

              {/* 프로젝트 카드들 */}
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/studio?projectId=${project.id}`}>
                  <div className="group aspect-[4/5] bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                    {/* 프로젝트 썸네일 */}
                    <div className="absolute inset-4 top-4 bottom-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center">
                      {project.thumbnail ? (
                        <img 
                          src={project.thumbnail} 
                          alt={project.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center">
                          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <span className="text-xs text-gray-400">{project.panelCount}개 패널</span>
                        </div>
                      )}
                    </div>

                    {/* 상태 배지 */}
                    <div className="absolute top-4 left-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        project.status === 'completed' 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-orange-600 bg-orange-100'
                      }`}>
                        {project.status === 'completed' ? '완성' : '작업중'}
                      </span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/90 backdrop-blur">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 프로젝트 정보 */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                        {project.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                        <span className="mx-2">•</span>
                        <span>{project.panelCount}컷</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 내 캐릭터 탭 */}
        {activeTab === 'characters' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                내 캐릭터
                <span className="ml-2 text-sm font-normal text-gray-500">({filteredCharacters.length}개)</span>
              </h2>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                캐릭터 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {filteredCharacters.map((character) => (
                <div key={character.id} className="group bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer relative">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {character.thumbnailUrl || (character.referenceImages && character.referenceImages.length > 0) ? (
                      <img 
                        src={character.thumbnailUrl || character.referenceImages[0]} 
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-12 w-12 text-gray-300" />
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 truncate">{character.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(character.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white/90 backdrop-blur">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI 생성 이미지 탭 */}
        {activeTab === 'images' && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                AI 생성 이미지
                <span className="ml-2 text-sm font-normal text-gray-500">({filteredImages.length}개)</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredImages.map((image) => (
                <div key={image.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer">
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <Button variant="secondary" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        보기
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        다운로드
                      </Button>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                    <p className="text-white text-xs font-medium truncate">
                      {image.prompt}
                    </p>
                    <p className="text-white/70 text-xs mt-1">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 빈 상태 */}
        {((activeTab === 'webtoon' && filteredProjects.length === 0) ||
          (activeTab === 'characters' && filteredCharacters.length === 0) ||
          (activeTab === 'images' && filteredImages.length === 0)) && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              {activeTab === 'webtoon' && <FolderOpen className="h-12 w-12 text-gray-400" />}
              {activeTab === 'characters' && <Users className="h-12 w-12 text-gray-400" />}
              {activeTab === 'images' && <ImageIcon className="h-12 w-12 text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'webtoon' && '아직 웹툰 프로젝트가 없습니다'}
              {activeTab === 'characters' && '등록된 캐릭터가 없습니다'}
              {activeTab === 'images' && '생성된 이미지가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'webtoon' && '첫 번째 웹툰을 만들어보세요'}
              {activeTab === 'characters' && '캐릭터를 추가하여 일관성 있는 웹툰을 만들어보세요'}
              {activeTab === 'images' && '스튜디오에서 AI 이미지를 생성해보세요'}
            </p>
            <Button 
              onClick={handleNewProject}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'webtoon' && '첫 웹툰 만들기'}
              {activeTab === 'characters' && '캐릭터 추가하기'}
              {activeTab === 'images' && '이미지 생성하기'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}