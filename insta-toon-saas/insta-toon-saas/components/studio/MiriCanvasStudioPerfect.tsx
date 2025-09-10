"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Square, 
  RectangleVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Share2,
  Undo,
  Redo,
  Plus,
  Trash2,
  MessageSquare,
  Type,
  UserPlus,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Move,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

// 캔버스 크기 정의 (인스타그램 권장 사이즈)
const CANVAS_SIZES = {
  '4:5': { width: 320, height: 400, actualWidth: 1080, actualHeight: 1350, label: '세로형' },
  '1:1': { width: 320, height: 320, actualWidth: 1080, actualHeight: 1080, label: '정사각형' }
};

type CanvasRatio = '4:5' | '1:1';

interface CanvasElement {
  id: string;
  type: 'text' | 'bubble';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bubbleStyle?: 'speech' | 'thought' | 'shout' | 'whisper';
}

interface WebtoonCut {
  id: string;
  prompt: string;
  imageUrl?: string;
  elements: CanvasElement[];
  isGenerating?: boolean;
}

export function MiriCanvasStudioPerfect() {
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatio>('4:5');
  const [zoom, setZoom] = useState<number>(100);
  const [cuts, setCuts] = useState<WebtoonCut[]>([
    { id: '1', prompt: '', elements: [] },
    { id: '2', prompt: '', elements: [] }
  ]);
  const [selectedCutId, setSelectedCutId] = useState<string>('1');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bubble' | 'text' | 'ai-character' | 'ai-script'>('bubble');
  const [bubbleText, setBubbleText] = useState('');
  const [textContent, setTextContent] = useState('');
  
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasViewport, setCanvasViewport] = useState({ width: 0, height: 0 });

  // 뷰포트 크기 감지
  useEffect(() => {
    const updateViewport = () => {
      if (canvasContainerRef.current) {
        setCanvasViewport({
          width: canvasContainerRef.current.clientWidth,
          height: canvasContainerRef.current.clientHeight
        });
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // 배율에 따른 캔버스 위치 계산 (수학적 접근)
  const calculateCanvasLayout = () => {
    const baseCanvasSize = CANVAS_SIZES[canvasRatio];
    const scale = zoom / 100;
    
    // 실제 캔버스 크기 (배율 적용)
    const scaledWidth = baseCanvasSize.width * scale;
    const scaledHeight = baseCanvasSize.height * scale;
    
    // 최소 간격 보장 (배율과 관계없이 일정한 시각적 간격 유지)
    const MIN_VISUAL_GAP = 40; // 시각적 최소 간격 (픽셀)
    const baseGap = 60; // 기본 간격
    
    // 배율이 커질수록 실제 간격도 비례해서 증가
    // 하지만 최소 간격은 보장
    const actualGap = Math.max(MIN_VISUAL_GAP, baseGap * scale);
    
    // 전체 캔버스들의 총 높이 계산
    const totalHeight = cuts.length * scaledHeight + (cuts.length - 1) * actualGap;
    
    // 중앙 정렬을 위한 시작 Y 위치
    const startY = Math.max(40, (canvasViewport.height - totalHeight) / 2);
    
    // 각 캔버스의 위치 계산
    const positions = cuts.map((cut, index) => ({
      id: cut.id,
      x: (canvasViewport.width - scaledWidth) / 2, // 수평 중앙 정렬
      y: startY + index * (scaledHeight + actualGap),
      width: scaledWidth,
      height: scaledHeight
    }));
    
    return { positions, gap: actualGap };
  };

  const layout = calculateCanvasLayout();

  // 줌 관련 함수
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(200, zoom + 25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(25, zoom - 25));
  };

  const handleFitToScreen = () => {
    // 화면에 모든 캔버스가 보이도록 최적 배율 계산
    const baseCanvasSize = CANVAS_SIZES[canvasRatio];
    const totalCuts = cuts.length;
    const baseGap = 60;
    
    const totalHeight = totalCuts * baseCanvasSize.height + (totalCuts - 1) * baseGap;
    const availableHeight = canvasViewport.height - 80; // 여백 고려
    
    const optimalZoom = Math.floor((availableHeight / totalHeight) * 100);
    setZoom(Math.max(25, Math.min(100, optimalZoom)));
  };

  // 컷 관련 함수
  const addCut = () => {
    const newCut: WebtoonCut = {
      id: Date.now().toString(),
      prompt: '',
      elements: []
    };
    setCuts([...cuts, newCut]);
    setSelectedCutId(newCut.id);
  };

  const updateCutPrompt = (cutId: string, prompt: string) => {
    setCuts(cuts.map(cut => 
      cut.id === cutId ? { ...cut, prompt } : cut
    ));
  };

  // AI 이미지 생성 함수
  const generateImage = async (cutId: string) => {
    const cut = cuts.find(c => c.id === cutId);
    if (!cut || !cut.prompt.trim()) return;

    setCuts(cuts.map(c => 
      c.id === cutId ? { ...c, isGenerating: true } : c
    ));

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: cut.prompt,
          aspectRatio: canvasRatio,
          style: 'webtoon'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const result = await response.json();
      
      setCuts(cuts.map(c => 
        c.id === cutId 
          ? { ...c, imageUrl: result.imageUrl, isGenerating: false }
          : c
      ));
    } catch (error) {
      console.error('Image generation failed:', error);
      setCuts(cuts.map(c => 
        c.id === cutId ? { ...c, isGenerating: false } : c
      ));
    }
  };

  // 요소 추가 함수
  const addTextElement = () => {
    if (!textContent.trim()) return;
    
    const selectedCut = cuts.find(cut => cut.id === selectedCutId);
    if (!selectedCut) return;

    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'text',
      content: textContent,
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      width: 150,
      height: 40,
      fontSize: 16,
      color: '#000000'
    };

    setCuts(cuts.map(cut => 
      cut.id === selectedCutId 
        ? { ...cut, elements: [...cut.elements, newElement] }
        : cut
    ));
    
    setTextContent('');
    setSelectedElementId(newElement.id);
  };

  const addBubbleElement = (style: 'speech' | 'thought' | 'shout' | 'whisper' = 'speech') => {
    if (!bubbleText.trim()) return;
    
    const selectedCut = cuts.find(cut => cut.id === selectedCutId);
    if (!selectedCut) return;

    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'bubble',
      content: bubbleText,
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      width: 120,
      height: 60,
      fontSize: 14,
      color: '#000000',
      bubbleStyle: style
    };

    setCuts(cuts.map(cut => 
      cut.id === selectedCutId 
        ? { ...cut, elements: [...cut.elements, newElement] }
        : cut
    ));
    
    setBubbleText('');
    setSelectedElementId(newElement.id);
  };

  const deleteElement = (elementId: string) => {
    setCuts(cuts.map(cut => {
      if (cut.id !== selectedCutId) return cut;
      return {
        ...cut,
        elements: cut.elements.filter(el => el.id !== elementId)
      };
    }));
    setSelectedElementId(null);
  };

  const updateElementContent = (elementId: string, content: string) => {
    setCuts(cuts.map(cut => {
      if (cut.id !== selectedCutId) return cut;
      return {
        ...cut,
        elements: cut.elements.map(el => 
          el.id === elementId ? { ...el, content } : el
        )
      };
    }));
  };

  const selectedCut = cuts.find(cut => cut.id === selectedCutId);
  const selectedCutIndex = cuts.findIndex(cut => cut.id === selectedCutId);
  const selectedElement = selectedCut?.elements.find(el => el.id === selectedElementId);

  const menuItems = [
    { id: 'bubble', label: '말풍선', icon: MessageSquare },
    { id: 'text', label: '텍스트', icon: Type },
    { id: 'ai-character', label: 'AI 캐릭터', icon: UserPlus },
    { id: 'ai-script', label: 'AI 대본', icon: FileText }
  ];

  const quickDialogues = ['안녕?', '뭐야!', '정말?', '좋아!', '싫어', '어?', '와!', '헉!'];

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
      {/* 상단 헤더 - 고정 */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              웹툰 메이커 스튜디오
            </h1>
          </div>
          
          {/* 캔버스 크기 선택 */}
          <div className="flex items-center bg-slate-100">
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 transition-all text-sm font-medium",
                canvasRatio === '4:5' 
                  ? "bg-white shadow-sm text-purple-600 border border-purple-200" 
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setCanvasRatio('4:5')}
            >
              <RectangleVertical className="h-4 w-4" />
              <span>{CANVAS_SIZES['4:5'].label}</span>
              <span className="text-xs text-slate-400">{CANVAS_SIZES['4:5'].actualWidth}×{CANVAS_SIZES['4:5'].actualHeight}</span>
            </button>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2 transition-all text-sm font-medium",
                canvasRatio === '1:1' 
                  ? "bg-white shadow-sm text-purple-600 border border-purple-200" 
                  : "text-slate-600 hover:text-slate-900"
              )}
              onClick={() => setCanvasRatio('1:1')}
            >
              <Square className="h-4 w-4" />
              <span>{CANVAS_SIZES['1:1'].label}</span>
              <span className="text-xs text-slate-400">{CANVAS_SIZES['1:1'].actualWidth}×{CANVAS_SIZES['1:1'].actualHeight}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <Button variant="ghost" size="sm" className="h-9 px-3">
            <Share2 className="h-4 w-4 mr-2" />
            공유
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-9 px-4" size="sm">
            <Download className="h-4 w-4 mr-2" />
            다운로드
          </Button>
        </div>
      </div>

      {/* 메인 워크스페이스 - 완전 고정, 스크롤 없음 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 사이드바 - 독립 스크롤 */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-shrink-0">
          {/* 메뉴 탭 */}
          <div className="w-20 bg-slate-50 border-r border-slate-200 flex-shrink-0">
            <div className="py-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={cn(
                      "w-full px-3 py-4 flex flex-col items-center gap-2 transition-all hover:bg-white",
                      activeTab === item.id && "bg-white border-r-2 border-purple-500 text-purple-600"
                    )}
                  >
                    <Icon className={cn(
                      "h-6 w-6",
                      activeTab === item.id ? "text-purple-600" : "text-slate-500"
                    )} />
                    <span className={cn(
                      "text-xs font-medium text-center leading-tight",
                      activeTab === item.id ? "text-purple-600" : "text-slate-500"
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 컨텐츠 패널 - 독립 스크롤 */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 mb-3">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'bubble' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      대사 입력
                    </label>
                    <Textarea 
                      value={bubbleText}
                      onChange={(e) => setBubbleText(e.target.value)}
                      placeholder="말풍선에 들어갈 대사를 입력하세요..."
                      className="min-h-[80px] text-sm resize-none border-slate-200"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'speech', label: '일반', emoji: '💬' },
                      { id: 'thought', label: '생각', emoji: '💭' },
                      { id: 'shout', label: '외침', emoji: '💥' },
                      { id: 'whisper', label: '속삭임', emoji: '🔉' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => addBubbleElement(style.id as any)}
                        className="p-3 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 
                                 transition-all flex flex-col items-center gap-1"
                      >
                        <span className="text-2xl">{style.emoji}</span>
                        <span className="text-xs">{style.label}</span>
                      </button>
                    ))}
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    size="sm"
                    onClick={() => addBubbleElement('speech')}
                    disabled={!bubbleText.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    말풍선 추가
                  </Button>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">빠른 대사</p>
                    <div className="flex flex-wrap gap-2">
                      {quickDialogues.map(text => (
                        <button
                          key={text}
                          onClick={() => {
                            setBubbleText(text);
                            addBubbleElement('speech');
                          }}
                          className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 
                                   hover:bg-purple-100 hover:text-purple-700 transition-colors"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      텍스트 입력
                    </label>
                    <Textarea 
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="추가할 텍스트를 입력하세요..."
                      className="min-h-[80px] text-sm resize-none border-slate-200"
                    />
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    size="sm"
                    onClick={addTextElement}
                    disabled={!textContent.trim()}
                  >
                    <Type className="h-4 w-4 mr-2" />
                    텍스트 추가
                  </Button>
                </div>
              )}

              {(activeTab === 'ai-character' || activeTab === 'ai-script') && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      {activeTab === 'ai-character' ? '캐릭터 설명' : '줄거리 입력'}
                    </label>
                    <Textarea 
                      placeholder={
                        activeTab === 'ai-character' 
                          ? '캐릭터의 외모와 특징을 설명해주세요...'
                          : '간단한 줄거리를 입력하세요...'
                      }
                      className="min-h-[100px] text-sm resize-none border-slate-200"
                    />
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {activeTab === 'ai-character' ? '캐릭터 생성' : '대본 생성'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 중앙 캔버스 영역 - 완전 고정 뷰포트 */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* 페이지 정보 바 */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                {selectedCutIndex + 1}컷 / {cuts.length}컷
              </span>
              <div className="text-xs text-slate-500">
                {CANVAS_SIZES[canvasRatio].actualWidth} × {CANVAS_SIZES[canvasRatio].actualHeight}px
              </div>
            </div>
          </div>

          {/* 캔버스 컨테이너 - 절대 위치 기반, 스크롤 없음 */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 relative overflow-hidden bg-slate-50"
          >
            {/* 모든 캔버스를 절대 위치로 배치 */}
            {layout.positions.map((pos, index) => {
              const cut = cuts[index];
              if (!cut) return null;
              
              return (
                <div
                  key={cut.id}
                  className={cn(
                    "absolute transition-all duration-200",
                    selectedCutId === cut.id && "z-10"
                  )}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${pos.width}px`,
                    height: `${pos.height}px`
                  }}
                >
                  {/* 컷 번호 */}
                  <div className="absolute -left-12 top-0 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* 캔버스 */}
                  <div
                    className={cn(
                      "w-full h-full bg-white shadow-lg overflow-hidden cursor-pointer relative border-2",
                      selectedCutId === cut.id ? "border-purple-500" : "border-slate-300 hover:border-slate-400"
                    )}
                    onClick={() => {
                      setSelectedCutId(cut.id);
                      setSelectedElementId(null);
                    }}
                  >
                    {/* 배경 이미지 */}
                    {cut.imageUrl ? (
                      <img 
                        src={cut.imageUrl} 
                        alt={`${index + 1}컷`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="h-16 w-16 mb-3 opacity-30" />
                        <p className="text-sm font-medium opacity-60">AI 이미지를 생성하세요</p>
                      </div>
                    )}

                    {/* 로딩 오버레이 */}
                    {cut.isGenerating && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <p className="text-sm">이미지 생성 중...</p>
                        </div>
                      </div>
                    )}

                    {/* 캔버스 요소들 (말풍선, 텍스트) */}
                    {cut.elements.map(element => (
                      <div
                        key={element.id}
                        className={cn(
                          "absolute border-2 cursor-move transition-all",
                          selectedElementId === element.id 
                            ? "border-purple-500 shadow-lg" 
                            : "border-transparent hover:border-purple-300"
                        )}
                        style={{
                          left: `${(element.x / 320) * 100}%`,
                          top: `${(element.y / CANVAS_SIZES[canvasRatio].height) * 100}%`,
                          width: `${(element.width / 320) * 100}%`,
                          height: `${(element.height / CANVAS_SIZES[canvasRatio].height) * 100}%`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(element.id);
                        }}
                      >
                        {element.type === 'text' ? (
                          <div
                            className="w-full h-full flex items-center justify-center p-2 font-medium bg-white bg-opacity-80"
                            style={{
                              fontSize: `${element.fontSize * (zoom / 100)}px`,
                              color: element.color
                            }}
                          >
                            {element.content}
                          </div>
                        ) : element.type === 'bubble' ? (
                          <div className="w-full h-full relative">
                            <svg
                              className="absolute inset-0 w-full h-full"
                              viewBox="0 0 120 60"
                              preserveAspectRatio="none"
                            >
                              <rect
                                x="2"
                                y="2"
                                width="116"
                                height="56"
                                rx={element.bubbleStyle === 'thought' ? "15" : "8"}
                                fill="white"
                                stroke="#333"
                                strokeWidth="2"
                              />
                              <path
                                d="M20,56 L25,65 L30,56"
                                fill="white"
                                stroke="#333"
                                strokeWidth="2"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center p-3">
                              <span 
                                className="text-center font-medium"
                                style={{ 
                                  fontSize: `${element.fontSize * (zoom / 100)}px`,
                                  color: element.color
                                }}
                              >
                                {element.content}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* 삭제 버튼 */}
                        {selectedElementId === element.id && (
                          <>
                            <button
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white flex items-center justify-center hover:bg-red-600 text-xs z-20"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement(element.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute -top-2 -left-2 w-5 h-5 bg-purple-500 text-white flex items-center justify-center text-xs cursor-move z-20">
                              <Move className="h-3 w-3" />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* 페이지 추가 버튼 - 마지막 캔버스 아래 */}
            {layout.positions.length > 0 && (
              <button
                onClick={addCut}
                className="absolute border-2 border-dashed border-slate-300
                         flex items-center justify-center gap-3 text-slate-500 hover:border-purple-400 
                         hover:text-purple-600 hover:bg-purple-50 transition-all font-medium"
                style={{
                  left: `${layout.positions[0].x}px`,
                  top: `${layout.positions[layout.positions.length - 1].y + layout.positions[0].height + layout.gap}px`,
                  width: `${layout.positions[0].width}px`,
                  height: '80px'
                }}
              >
                <Plus className="h-5 w-5" />
                <span>페이지 추가</span>
              </button>
            )}
          </div>

          {/* 하단 줌 컨트롤 - 고정 */}
          <div className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                전체 {cuts.length}컷
              </span>
              <span className="text-xs text-slate-500">
                간격: {layout.gap.toFixed(0)}px
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-8">25%</span>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={25}
                  max={200}
                  step={25}
                  className="w-24"
                />
                <span className="text-xs text-slate-500 w-10">200%</span>
                <span className="text-xs font-medium text-slate-700 w-10 text-center">
                  {zoom}%
                </span>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3"
                onClick={handleFitToScreen}
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                <span className="text-xs">맞춤</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 오른쪽 속성 패널 - 독립 스크롤 */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-200 flex-shrink-0">
            <h3 className="font-semibold text-slate-900">속성 편집</h3>
            {selectedCut && (
              <p className="text-sm text-slate-500 mt-1">
                {selectedCutIndex + 1}컷 편집 중
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCut && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    AI 프롬프트
                  </label>
                  <Textarea
                    value={selectedCut.prompt}
                    onChange={(e) => updateCutPrompt(selectedCut.id, e.target.value)}
                    placeholder="AI가 생성할 장면을 자세히 설명하세요...&#10;예: 햇살이 비치는 카페에서 커피를 마시며 미소짓는 20대 여성, 창가 자리, 따뜻한 조명, 부드러운 웹툰 스타일"
                    className="min-h-[120px] text-sm resize-none border-slate-200"
                  />
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                  size="sm"
                  onClick={() => generateImage(selectedCut.id)}
                  disabled={!selectedCut.prompt.trim() || selectedCut.isGenerating}
                >
                  {selectedCut.isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      이미지 생성
                    </>
                  )}
                </Button>

                {/* 선택된 요소 속성 */}
                {selectedElement && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-sm font-medium text-slate-700">
                      {selectedElement.type === 'text' ? '텍스트' : '말풍선'} 속성
                    </h4>
                    
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">내용</label>
                      <Textarea
                        value={selectedElement.content}
                        onChange={(e) => updateElementContent(selectedElement.id, e.target.value)}
                        className="min-h-[60px] text-sm resize-none border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">크기</label>
                        <Input
                          type="number"
                          value={selectedElement.fontSize}
                          onChange={(e) => {
                            const newSize = parseInt(e.target.value) || 12;
                            setCuts(cuts.map(cut => {
                              if (cut.id !== selectedCutId) return cut;
                              return {
                                ...cut,
                                elements: cut.elements.map(el =>
                                  el.id === selectedElement.id ? { ...el, fontSize: newSize } : el
                                )
                              };
                            }));
                          }}
                          className="text-sm border-slate-200"
                          min="8"
                          max="48"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-600 mb-1 block">색상</label>
                        <Input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) => {
                            setCuts(cuts.map(cut => {
                              if (cut.id !== selectedCutId) return cut;
                              return {
                                ...cut,
                                elements: cut.elements.map(el =>
                                  el.id === selectedElement.id ? { ...el, color: e.target.value } : el
                                )
                              };
                            }));
                          }}
                          className="h-8 border-slate-200"
                        />
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => deleteElement(selectedElement.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </Button>
                  </div>
                )}

                {selectedCut.imageUrl && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-700">생성된 이미지</p>
                    <div className="aspect-square bg-slate-100 overflow-hidden">
                      <img 
                        src={selectedCut.imageUrl} 
                        alt="생성된 이미지"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => generateImage(selectedCut.id)}
                      disabled={selectedCut.isGenerating}
                    >
                      {selectedCut.isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          재생성 중...
                        </>
                      ) : (
                        '재생성'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}