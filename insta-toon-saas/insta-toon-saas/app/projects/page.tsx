'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronRight,
  Trash2,
  AlertCircle,
  Settings,
  Archive,
  RotateCcw,
  HardDrive,
  Crown,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { AddCharacterModal } from '@/components/studio/AddCharacterModal';
import { ActionMenu } from '@/components/ui/action-menu';

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  panelCount: number;
  status: 'draft' | 'completed';
  isEmpty?: boolean; // 빈 프로젝트 여부
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

interface StorageInfo {
  usedBytes: number;
  maxBytes: number;
  usagePercentage: number;
  formatted: {
    used: string;
    max: string;
  };
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
  const [showEmptyProjects, setShowEmptyProjects] = useState(false); // 빈 프로젝트 표시 여부
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showStorageDropdown, setShowStorageDropdown] = useState(false);
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false);
  const storageDropdownRef = useRef<HTMLDivElement>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadDashboardData();
    loadStorageInfo();
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storageDropdownRef.current && !storageDropdownRef.current.contains(event.target as Node)) {
        setShowStorageDropdown(false);
      }
    };

    if (showStorageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStorageDropdown]);

  const loadStorageInfo = async () => {
    try {
      const response = await fetch('/api/storage/check');
      if (response.ok) {
        const data = await response.json();
        setStorageInfo(data);
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      // 정상적인 인증 플로우 사용 (개발/프로덕션 모두)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 인증되지 않은 경우 로그인 페이지로 리다이렉트
        router.push('/sign-in?redirectTo=/projects');
        return;
      }

      // 사용자 데이터 가져오기
      const { data: userData } = await supabase
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .single();

      if (!userData) {
        console.log('No user data found');
        return;
      }

      // 프로젝트와 패널을 한 번의 쿼리로 조인해서 가져오기
      const { data: projectsData, error: projectsError } = await supabase
        .from('project')
        .select(`
          id,
          title,
          createdAt,
          lasteditedat,
          isdraft,
          episodecount,
          panels:panel(
            id,
            order,
            prompt,
            generationId,
            imageUrl,
            editData,
            generation:generationId(imageUrl)
          )
        `)
        .eq('userId', userData.id)
        .is('deletedAt', null)
        .order('lasteditedat', { ascending: false });

      if (projectsError) {
        console.error('Projects query error:', projectsError);
        setLoading(false);
        return;
      }

      // 프로젝트 데이터 변환 (패널 정보 포함)
      const projectsWithThumbnails = (projectsData || []).map((project) => {
        const panels = project.panels || [];
        const firstPanel = panels.length > 0 ? panels.sort((a, b) => a.order - b.order)[0] : null;
        const panelCount = panels.length;
        
        // 실제 작업이 있는지 확인
        const hasImage = firstPanel?.generation?.imageUrl || firstPanel?.imageUrl;
        const hasElements = firstPanel?.editData?.elements && firstPanel.editData.elements.length > 0;
        const hasPrompt = firstPanel?.prompt && firstPanel.prompt.trim().length > 0;
        const hasContent = panelCount > 0 && (hasImage || hasElements || hasPrompt);
        
        return {
          id: project.id,
          title: project.title || '무제 프로젝트',
          createdAt: project.createdAt,
          updatedAt: project.lasteditedat || project.createdAt,
          panelCount: project.episodecount || panelCount,
          status: (project.isdraft ? 'draft' : 'completed') as 'draft' | 'completed',
          thumbnail: firstPanel?.generation?.imageUrl || firstPanel?.imageUrl || null,
          isEmpty: !hasContent
        };
      });

      const formattedProjects = projectsWithThumbnails;

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

  const handleMoveToTrash = async (projectId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault(); // Link 클릭 방지
      e.stopPropagation();
    }
    
    try {
      // Supabase에서 프로젝트를 휴지통으로 이동 (soft delete)
      const { error } = await supabase
        .from('project')
        .update({ deletedAt: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;

      // UI에서 즉시 제거
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // 토스트 메시지 표시 (나중에 추가 가능)
      console.log('Project moved to trash:', projectId);
    } catch (error) {
      console.error('Error moving project to trash:', error);
    }
  };

  const handleMoveCharacterToTrash = async (characterId: string) => {
    try {
      // 캐릭터를 휴지통으로 이동 (API 또는 Supabase 직접 업데이트)
      const { error } = await supabase
        .from('character')
        .update({ deletedAt: new Date().toISOString() })
        .eq('id', characterId);

      if (error) throw error;

      // UI에서 즉시 제거
      setCharacters(prev => prev.filter(c => c.id !== characterId));
      
      console.log('Character moved to trash:', characterId);
    } catch (error) {
      console.error('Error moving character to trash:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    // 검색어 필터
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 프로젝트 표시 조건
    if (showEmptyProjects) {
      // 빈 프로젝트 보기 모드: 모든 프로젝트 표시 (빈 프로젝트 포함)
      return matchesSearch;
    } else {
      // 기본 모드: 빈 프로젝트가 아닌 것들만 표시
      return matchesSearch && !project.isEmpty;
    }
  });


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
              <h1 className="text-2xl font-bold text-gray-900">작업내역</h1>
              <div className="flex items-center text-sm text-gray-500">
                <FolderOpen className="h-4 w-4 mr-1" />
                <span>{projects.length}개 프로젝트</span>
                <span className="mx-2">•</span>
                <Users className="h-4 w-4 mr-1" />
                <span>{characters.length}개 캐릭터</span>
                <span className="mx-2">•</span>
                <ImageIcon className="h-4 w-4 mr-1" />
                <span>{generatedImages.length}개 이미지</span>
                <span className="mx-2">•</span>
                
                {/* 용량 표시 - 클릭 가능 */}
                <div className="relative" ref={storageDropdownRef}>
                  <button
                    onClick={() => setShowStorageDropdown(!showStorageDropdown)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-purple-50 transition-colors group"
                  >
                    <HardDrive className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-600">
                      {storageInfo ? storageInfo.formatted.used : '0.01GB'}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">{storageInfo ? storageInfo.formatted.max : '1GB'}</span>
                    <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${showStorageDropdown ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {/* 드롭다운 패널 */}
                  {showStorageDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-top-2">
                      {/* 헤더 */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-purple-600" />
                            업로드 정보
                          </h3>
                          <button
                            onClick={() => setShowStorageDropdown(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* 메인 컨텐츠 */}
                      <div className="p-4 space-y-4">
                        {/* 사용량 표시 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {storageInfo ? `${storageInfo.usagePercentage.toFixed(1)}%` : '1.0%'} 사용중
                            </span>
                            <span className="text-sm">
                              <span className="font-semibold text-purple-600">
                                {storageInfo ? storageInfo.formatted.used : '0.01GB'}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-700">
                                {storageInfo ? storageInfo.formatted.max : '1GB'}
                              </span>
                            </span>
                          </div>
                          
                          {/* 프로그레스 바 */}
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: storageInfo ? `${Math.min(storageInfo.usagePercentage, 100)}%` : '1%' }}
                            />
                          </div>
                        </div>
                        
                        {/* 파일 타입 안내 */}
                        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                          <div className="font-semibold mb-1.5">업로드 가능 파일</div>
                          <div className="space-y-0.5">
                            <div>• 이미지 : JPG, PNG, SVG</div>
                            <div>• 동영상 : GIF, MP4, MOV</div>
                            <div>• 음악 : MP3, M4A</div>
                          </div>
                        </div>
                        
                        {/* 업그레이드 배너 */}
                        {(!storageInfo || storageInfo.maxBytes === 1024 * 1024 * 1024) && (
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                            <div className="flex items-start gap-3">
                              <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-sm mb-1">
                                  10GB의 저장 공간 사용하기
                                </h4>
                                <p className="text-xs text-gray-600 mb-3">
                                  Pro 요금제로 업그레이드하면 10GB의<br />
                                  개인 저장 공간을 사용할 수 있어요.
                                </p>
                                <Link href="/pricing" onClick={() => setShowStorageDropdown(false)}>
                                  <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium">
                                    1개월간 무료로 사용하기
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* 휴지통 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/trash')}
                className="bg-gray-50 hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                휴지통
              </Button>
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
                  <span className="ml-2 text-sm font-normal text-gray-500">({filteredProjects.length}개)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showEmptyProjects ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => setShowEmptyProjects(!showEmptyProjects)}
                    className={showEmptyProjects ? "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" : "text-gray-600 hover:text-gray-900"}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    빈 프로젝트 {showEmptyProjects ? '숨기기' : '보기'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-600 hover:text-purple-600"
                    onClick={() => setActiveTab('webtoon')}
                  >
                    전체 보기 <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
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
                  {filteredProjects.slice(0, 8).map((project) => (
                    <div key={project.id} className="flex-shrink-0 w-48 relative group">
                      <Link href={`/studio?projectId=${project.id}`}>
                        <div className="aspect-[4/5] bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
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

                      {/* 액션 드롭다운 메뉴 */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-white/90 backdrop-blur">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>프로젝트 관리</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/studio?projectId=${project.id}`}>
                                <Settings className="h-4 w-4 mr-2" />
                                편집하기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleMoveToTrash(project.id, e)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              휴지통으로 이동
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
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

                      {/* 액션 메뉴 */}
                      <ActionMenu
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        items={[]}
                        deleteAction={{
                          onConfirm: () => handleMoveCharacterToTrash(character.id),
                          title: "캐릭터를 쓰레기통으로 이동하시겠습니까?",
                          description: "이 캐릭터가 쓰레기통으로 이동됩니다. 쓰레기통에서 복원하거나 완전히 삭제할 수 있습니다.",
                          confirmText: "쓰레기통으로 이동"
                        }}
                        buttonClassName="h-6 w-6"
                      />
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
              <div className="flex items-center gap-3">
                {/* 빈 프로젝트 표시 토글 */}
                <Button
                  variant={showEmptyProjects ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => setShowEmptyProjects(!showEmptyProjects)}
                  className={showEmptyProjects ? "bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100" : "text-gray-600 hover:text-gray-900"}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  빈 프로젝트 {showEmptyProjects ? '숨기기' : '보기'}
                </Button>
                <Button
                  onClick={handleNewProject}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  새 웹툰 만들기
                </Button>
              </div>
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
                <div key={project.id} className="relative group">
                  <Link href={`/studio?projectId=${project.id}`}>
                    <div className={`aspect-[4/5] bg-white rounded-xl border ${project.isEmpty ? 'border-orange-200 bg-orange-50' : 'border-gray-200'} hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden`}>
                      {/* 프로젝트 썸네일 */}
                      <div className="absolute inset-4 top-4 bottom-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden">
                        {project.thumbnail ? (
                          <img 
                            src={project.thumbnail} 
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              {project.isEmpty ? (
                                <>
                                  <AlertCircle className="h-12 w-12 text-orange-300 mx-auto mb-2" />
                                  <span className="text-xs text-orange-500">
                                    빈 프로젝트
                                  </span>
                                </>
                              ) : (
                                <>
                                  <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                  <span className="text-xs text-gray-400">
                                    {project.panelCount > 0 ? `${project.panelCount}개 패널` : '썸네일 없음'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 상태 배지 */}
                      <div className="absolute top-4 left-4">
                        {project.isEmpty ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-orange-500 text-white">
                            빈 프로젝트
                          </span>
                        ) : (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            project.status === 'completed' 
                              ? 'text-green-600 bg-green-100' 
                              : 'text-orange-600 bg-orange-100'
                          }`}>
                            {project.status === 'completed' ? '완성' : '작업중'}
                          </span>
                        )}
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
                          <span>{project.panelCount > 0 ? `${project.panelCount}컷` : '0컷'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* 액션 드롭다운 메뉴 */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/90 backdrop-blur">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>프로젝트 관리</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/studio?projectId=${project.id}`}>
                            <Settings className="h-4 w-4 mr-2" />
                            편집하기
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleMoveToTrash(project.id, e)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          휴지통으로 이동
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
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
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setShowAddCharacterModal(true)}
              >
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

                  {/* 액션 메뉴 */}
                  <ActionMenu
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    items={[]}
                    deleteAction={{
                      onConfirm: () => handleMoveCharacterToTrash(character.id),
                      title: "캐릭터를 쓰레기통으로 이동하시겠습니까?",
                      description: "이 캐릭터가 쓰레기통으로 이동됩니다. 쓰레기통에서 복원하거나 완전히 삭제할 수 있습니다.",
                      confirmText: "쓰레기통으로 이동"
                    }}
                    buttonClassName="h-6 w-6"
                  />
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

      {/* AddCharacterModal */}
      <AddCharacterModal
        open={showAddCharacterModal}
        onOpenChange={setShowAddCharacterModal}
        onCharacterAdded={() => {
          // 캐릭터 추가 후 데이터 다시 로드
          loadDashboardData();
        }}
        canvasRatio="4:5" // 기본 비율
      />
    </div>
  );
}