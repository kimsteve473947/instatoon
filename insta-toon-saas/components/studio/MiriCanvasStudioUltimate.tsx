"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  X,
  Palette,
  ChevronUp,
  ChevronDown,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUBBLE_TEMPLATES, BUBBLE_CATEGORIES } from './BubbleTemplates';
import { BubbleTemplateRenderer } from './BubbleTemplateRenderer';
import { OptimizedImage } from './OptimizedImage';
import { VirtualizedTemplateList } from './VirtualizedTemplateList';
import { CharacterSelector } from './CharacterSelector';
import { AddCharacterModal } from './AddCharacterModal';
import { useDebounce } from '@/hooks/useDebounce';

// 캔버스 크기 정의 (인스타그램 권장 사이즈)
const CANVAS_SIZES = {
  '4:5': { width: 320, height: 400, actualWidth: 1080, actualHeight: 1350, label: '세로형' },
  '1:1': { width: 320, height: 320, actualWidth: 1080, actualHeight: 1080, label: '정사각형' }
};

type CanvasRatio = '4:5' | '1:1';

// 줌 레벨 정의 - 매우 세밀한 2-3% 단위
const ZOOM_LEVELS = [
  25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70,
  73, 76, 79, 82, 85, 88, 91, 94, 97, 100, 103, 106, 109, 112, 
  115, 118, 121, 124, 127, 130, 133, 136, 139, 142, 145, 148, 
  151, 154, 157, 160, 163, 166, 169, 172, 175, 178, 181, 184, 
  187, 190, 193, 196, 200
];

interface CanvasElement {
  id: string;
  type: 'text' | 'bubble';
  content?: string; // 텍스트만 사용, 말풍선은 content 없음
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number; // 텍스트만 사용
  color?: string; // 텍스트만 사용
  bubbleStyle?: 'speech' | 'thought' | 'shout' | 'whisper';
  templateId?: string; // 말풍선 템플릿 ID
  fillColor?: string; // 말풍선 배경색
  strokeColor?: string; // 말풍선 테두리색
  strokeWidth?: number; // 말풍선 테두리 두께
}

interface WebtoonCut {
  id: string;
  prompt: string;
  imageUrl?: string;
  elements: CanvasElement[];
  isGenerating?: boolean;
}

interface MiriCanvasStudioUltimateProps {
  projectId?: string;
  initialData?: any;
  onSave?: (panels: any[], title?: string) => Promise<void>;
}

export function MiriCanvasStudioUltimate({ projectId, initialData, onSave }: MiriCanvasStudioUltimateProps) {
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatio>('4:5');
  const [zoom, setZoom] = useState<number>(100);
  const [cuts, setCuts] = useState<WebtoonCut[]>(() => {
    // 초기 데이터가 있으면 로드, 없으면 기본값
    if (initialData?.workspacesettings?.panels) {
      return initialData.workspacesettings.panels.map((panel: any) => ({
        id: panel.id || Date.now().toString() + Math.random(),
        prompt: panel.prompt || '',
        imageUrl: panel.imageUrl,
        elements: panel.editData?.elements || panel.elements || []
      }));
    }
    return [
      { id: '1', prompt: '', elements: [] },
      { id: '2', prompt: '', elements: [] }
    ];
  });
  const [selectedCutId, setSelectedCutId] = useState<string>('1');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bubble' | 'text' | 'ai-character' | 'ai-script'>('bubble');
  const [bubbleText, setBubbleText] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedBubbleCategory, setSelectedBubbleCategory] = useState<string>('speech');
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const [draggedBubbleId, setDraggedBubbleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 수정 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCutId, setEditingCutId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  
  // 캐릭터 상태
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [addCharacterModalOpen, setAddCharacterModalOpen] = useState(false);
  const [characterRefreshKey, setCharacterRefreshKey] = useState(0);
  
  // 디바운스된 색상 업데이트를 위한 상태
  const [pendingColorUpdates, setPendingColorUpdates] = useState<{
    [key: string]: {
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
    }
  }>({});
  
  const debouncedColorUpdates = useDebounce(pendingColorUpdates, 150);

  // 색상 업데이트 적용
  useEffect(() => {
    Object.entries(debouncedColorUpdates).forEach(([elementId, updates]) => {
      if (Object.keys(updates).length > 0) {
        setCuts(cuts => cuts.map(cut => ({
          ...cut,
          elements: cut.elements.map(el => 
            el.id === elementId 
              ? { ...el, ...updates }
              : el
          )
        })));
      }
    });
    setPendingColorUpdates({});
  }, [debouncedColorUpdates]);

  // 초기 데이터 복원
  useEffect(() => {
    if (initialData?.workspacesettings?.panels?.length > 0) {
      const firstPanel = initialData.workspacesettings.panels[0];
      if (firstPanel?.editData) {
        if (firstPanel.editData.canvasRatio) {
          setCanvasRatio(firstPanel.editData.canvasRatio);
        }
        if (firstPanel.editData.selectedCharacters) {
          setSelectedCharacters(firstPanel.editData.selectedCharacters);
        }
      }
    }
  }, [initialData]);
  
  // 요소 드래그 상태
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [draggedElement, setDraggedElement] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  
  // 리사이즈 상태
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Ctrl+마우스휠 줌 기능 - 작업공간에서만 동작
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 작업공간 영역 체크
      if (!canvasAreaRef.current?.contains(e.target as Node)) {
        return;
      }

      // Ctrl 키가 눌려있는지 확인 (Mac에서는 metaKey도 체크)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // 브라우저 기본 줌 방지
        
        // 휠 방향에 따라 줌 조절 - 더 부드러운 단계
        const delta = e.deltaY > 0 ? -1 : 1;
        const currentIndex = ZOOM_LEVELS.indexOf(zoom);
        let newIndex;
        
        if (currentIndex !== -1) {
          // 정확한 줌 레벨에 있는 경우
          newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + delta));
        } else {
          // 중간값인 경우 가장 가까운 레벨 찾기
          const closestIndex = ZOOM_LEVELS.reduce((prev, curr, index) => 
            Math.abs(curr - zoom) < Math.abs(ZOOM_LEVELS[prev] - zoom) ? index : prev, 0
          );
          newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, closestIndex + delta));
        }
        
        setZoom(ZOOM_LEVELS[newIndex]);
      }
    };

    // 전역 이벤트로 등록
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [zoom]);

  // 줌 관련 함수
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleZoomIn = () => {
    // 더 세밀한 단계로 확대
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    } else {
      // 정확한 레벨에 없는 경우 다음 큰 값으로
      const nextLevel = ZOOM_LEVELS.find(level => level > zoom);
      if (nextLevel) setZoom(nextLevel);
    }
  };

  const handleZoomOut = () => {
    // 더 세밀한 단계로 축소
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    } else {
      // 정확한 레벨에 없는 경우 이전 작은 값으로
      const prevLevel = ZOOM_LEVELS.slice().reverse().find(level => level < zoom);
      if (prevLevel) setZoom(prevLevel);
    }
  };

  const handleFitToScreen = () => {
    setZoom(100);
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
    
    // 새 컷 추가 후 약간의 딸레이를 두고 스크롤 (렌더링 완료 대기)
    setTimeout(() => {
      scrollToCanvas(newCut.id);
    }, 100);
  };

  const deleteCut = (cutId: string) => {
    if (cuts.length <= 1) return; // 최소 1개 컷은 유지
    
    const updatedCuts = cuts.filter(cut => cut.id !== cutId);
    setCuts(updatedCuts);
    
    // 삭제된 컷이 선택되어 있었다면 다른 컷 선택
    if (selectedCutId === cutId) {
      setSelectedCutId(updatedCuts[0]?.id || '');
    }
    setSelectedElementId(null);
  };

  const scrollToCanvas = (cutId: string) => {
    // 약간의 지연을 두어 DOM 업데이트 완료 후 스크롤
    setTimeout(() => {
      const canvasElement = canvasRefs.current[cutId];
      const containerElement = canvasAreaRef.current;
      
      if (canvasElement && containerElement) {
        // 컨테이너와 캔버스의 크기 정보
        const containerHeight = containerElement.clientHeight;
        const canvasHeight = canvasElement.offsetHeight;
        
        // 캔버스의 getBoundingClientRect를 사용하여 정확한 위치 계산
        const containerRect = containerElement.getBoundingClientRect();
        const canvasRect = canvasElement.getBoundingClientRect();
        
        // 현재 스크롤 위치
        const currentScrollTop = containerElement.scrollTop;
        
        // 캔버스의 현재 위치 (컨테이너 기준)
        const canvasTopRelativeToContainer = canvasRect.top - containerRect.top;
        
        // 캔버스를 컨테이너 중앙에 위치시키기 위한 목표 위치
        const idealCanvasTop = (containerHeight - canvasHeight) / 2;
        
        // 필요한 스크롤 거리 계산
        const scrollAdjustment = canvasTopRelativeToContainer - idealCanvasTop;
        const targetScrollTop = currentScrollTop + scrollAdjustment;
        
        containerElement.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const moveCutUp = (cutId: string) => {
    const currentIndex = cuts.findIndex(cut => cut.id === cutId);
    if (currentIndex <= 0) return; // 이미 맨 위에 있음
    
    const newCuts = [...cuts];
    [newCuts[currentIndex], newCuts[currentIndex - 1]] = [newCuts[currentIndex - 1], newCuts[currentIndex]];
    setCuts(newCuts);
    
    // 순서 변경 후 스크롤 위치 조정
    setTimeout(() => scrollToCanvas(cutId), 100);
  };

  const moveCutDown = (cutId: string) => {
    const currentIndex = cuts.findIndex(cut => cut.id === cutId);
    if (currentIndex >= cuts.length - 1) return; // 이미 맨 아래에 있음
    
    const newCuts = [...cuts];
    [newCuts[currentIndex], newCuts[currentIndex + 1]] = [newCuts[currentIndex + 1], newCuts[currentIndex]];
    setCuts(newCuts);
    
    // 순서 변경 후 스크롤 위치 조정
    setTimeout(() => scrollToCanvas(cutId), 100);
  };

  // useCallback으로 함수 메모이제이션
  const updateCutPrompt = useCallback((cutId: string, prompt: string) => {
    setCuts(cuts => cuts.map(cut => 
      cut.id === cutId ? { ...cut, prompt } : cut
    ));
  }, []);

  // 캐릭터 관련 함수
  const handleCharacterToggle = (characterId: string) => {
    setSelectedCharacters(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  const handleAddCharacter = () => {
    setAddCharacterModalOpen(true);
  };

  const handleCharacterAdded = () => {
    // 캐릭터 목록 새로고침
    setCharacterRefreshKey(prev => prev + 1);
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
          style: 'webtoon',
          characterIds: selectedCharacters // 선택된 캐릭터 ID들 추가
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const result = await response.json();
      
      setCuts(cuts.map(c => 
        c.id === cutId 
          ? { ...c, imageUrl: result.imageUrl, isGenerating: false }
          : c
      ));
      
      // 개발 모드에서 로컬 스토리지에 저장
      if (process.env.NODE_ENV === 'development') {
        const savedImages = localStorage.getItem('instatoon_generated_images');
        const images = savedImages ? JSON.parse(savedImages) : [];
        
        const newImage = {
          id: result.generationId || `img-${Date.now()}`,
          imageUrl: result.imageUrl,
          thumbnailUrl: result.thumbnailUrl || result.imageUrl,
          prompt: cut.prompt,
          createdAt: new Date().toISOString(),
        };
        
        images.unshift(newImage);
        localStorage.setItem('instatoon_generated_images', JSON.stringify(images.slice(0, 50))); // 최대 50개 저장
        console.log('Image saved to local storage');
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : '이미지 생성 실패';
      alert(`이미지 생성 오류: ${errorMessage}`);
      setCuts(cuts.map(c => 
        c.id === cutId ? { ...c, isGenerating: false } : c
      ));
    }
  };

  // 이미지 수정 함수
  const editImage = async (cutId: string, editPrompt: string) => {
    const cut = cuts.find(c => c.id === cutId);
    if (!cut || !cut.imageUrl || !editPrompt.trim()) return;

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
          prompt: editPrompt,
          aspectRatio: canvasRatio,
          style: 'webtoon',
          characterIds: selectedCharacters,
          referenceImage: cut.imageUrl, // 기존 이미지를 참조로 사용
          editMode: true // 편집 모드 플래그
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      const result = await response.json();
      
      setCuts(cuts.map(c => 
        c.id === cutId 
          ? { ...c, imageUrl: result.imageUrl, isGenerating: false }
          : c
      ));
    } catch (error) {
      console.error('Image edit failed:', error);
      alert(error instanceof Error ? error.message : "이미지 수정 중 오류가 발생했습니다.");
      setCuts(cuts.map(c => 
        c.id === cutId ? { ...c, isGenerating: false } : c
      ));
    }
  };

  // 수정 모달 핸들러
  const handleEditImage = (cutId: string) => {
    const cut = cuts.find(c => c.id === cutId);
    if (!cut?.imageUrl) return;
    
    setEditingCutId(cutId);
    setEditPrompt("");
    setEditModalOpen(true);
  };

  // 수정 실행
  const handleEditSubmit = async () => {
    if (!editingCutId || !editPrompt.trim()) return;
    
    setEditModalOpen(false);
    await editImage(editingCutId, editPrompt);
    setEditingCutId(null);
    setEditPrompt("");
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

  // useCallback을 사용한 템플릿으로부터 말풍선 추가 함수
  const addBubbleFromTemplate = useCallback((templateId: string) => {
    const template = BUBBLE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const selectedCut = cuts.find(cut => cut.id === selectedCutId);
    if (!selectedCut) return;

    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'bubble',
      // content 제거 - 말풍선은 순수 그래픽 요소
      x: 150 + Math.random() * 50, // 캔버스 중앙 부근에 배치
      y: 150 + Math.random() * 50,
      width: 120,
      height: 80,
      bubbleStyle: template.category as 'speech' | 'thought' | 'shout' | 'whisper',
      templateId: template.id, // 템플릿 정보 저장
      fillColor: '#ffffff', // 기본 배경색
      strokeColor: '#333333', // 기본 테두리색
      strokeWidth: 2 // 기본 테두리 두께
    };

    setCuts(cuts.map(cut => 
      cut.id === selectedCutId 
        ? { ...cut, elements: [...cut.elements, newElement] }
        : cut
    ));
    
    // 새로운 요소를 선택 상태로 만들기
    setSelectedElementId(newElement.id);
  }, [cuts, selectedCutId]);

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    const element = cuts.find(cut => cut.id === selectedCutId)?.elements.find(el => el.id === elementId);
    if (!element) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startX_pos = element.x;
    const startY_pos = element.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // 줌 레벨에 따른 스케일 보정
      const scale = zoom / 100;
      const scaledDeltaX = deltaX / scale;
      const scaledDeltaY = deltaY / scale;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX_pos;
      let newY = startY_pos;
      
      // 핸들 방향에 따른 리사이즈 로직
      switch (handle) {
        case 'se': // 오른쪽 아래
          newWidth = Math.max(30, startWidth + scaledDeltaX);
          newHeight = Math.max(30, startHeight + scaledDeltaY);
          break;
        case 'sw': // 왼쪽 아래
          newWidth = Math.max(30, startWidth - scaledDeltaX);
          newHeight = Math.max(30, startHeight + scaledDeltaY);
          newX = startX_pos + (startWidth - newWidth);
          break;
        case 'ne': // 오른쪽 위
          newWidth = Math.max(30, startWidth + scaledDeltaX);
          newHeight = Math.max(30, startHeight - scaledDeltaY);
          newY = startY_pos + (startHeight - newHeight);
          break;
        case 'nw': // 왼쪽 위
          newWidth = Math.max(30, startWidth - scaledDeltaX);
          newHeight = Math.max(30, startHeight - scaledDeltaY);
          newX = startX_pos + (startWidth - newWidth);
          newY = startY_pos + (startHeight - newHeight);
          break;
        case 'n': // 위
          newHeight = Math.max(30, startHeight - scaledDeltaY);
          newY = startY_pos + (startHeight - newHeight);
          break;
        case 's': // 아래
          newHeight = Math.max(30, startHeight + scaledDeltaY);
          break;
        case 'w': // 왼쪽
          newWidth = Math.max(30, startWidth - scaledDeltaX);
          newX = startX_pos + (startWidth - newWidth);
          break;
        case 'e': // 오른쪽
          newWidth = Math.max(30, startWidth + scaledDeltaX);
          break;
      }
      
      // 캔버스 경계 제한
      const maxX = CANVAS_SIZES[canvasRatio].width - newWidth;
      const maxY = CANVAS_SIZES[canvasRatio].height - newHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      // 요소 업데이트
      setCuts(prevCuts => prevCuts.map(cut => ({
        ...cut,
        elements: cut.elements.map(el => 
          el.id === elementId 
            ? { ...el, width: newWidth, height: newHeight, x: newX, y: newY }
            : el
        )
      })));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  // 프로젝트 저장 함수
  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      const panelsData = cuts.map(cut => ({
        id: cut.id,
        prompt: cut.prompt,
        imageUrl: cut.imageUrl,
        editData: {
          elements: cut.elements,
          canvasRatio: canvasRatio,
          selectedCharacters: selectedCharacters
        }
      }));
      
      await onSave(panelsData, initialData?.title);
      console.log('프로젝트가 저장되었습니다');
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 메모이제이션을 통한 성능 최적화
  const selectedCut = useMemo(() => 
    cuts.find(cut => cut.id === selectedCutId), 
    [cuts, selectedCutId]
  );
  
  const selectedCutIndex = useMemo(() => 
    cuts.findIndex(cut => cut.id === selectedCutId), 
    [cuts, selectedCutId]
  );
  
  const selectedElement = useMemo(() => 
    selectedCut?.elements.find(el => el.id === selectedElementId), 
    [selectedCut?.elements, selectedElementId]
  );

  // useCallback을 사용한 드래그 이벤트 핸들러들
  const handleBubbleTemplateSelect = useCallback((templateId: string) => {
    addBubbleFromTemplate(templateId);
  }, [addBubbleFromTemplate]);

  const handleTemplateDragStart = useCallback((e: React.DragEvent, templateId: string) => {
    setIsDraggingBubble(true);
    setDraggedBubbleId(templateId);
    e.dataTransfer.setData('bubbleId', templateId);
  }, []);

  const handleTemplateDragEnd = useCallback(() => {
    setIsDraggingBubble(false);
    setDraggedBubbleId(null);
  }, []);

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
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-6">
          {/* 인스타툰 로고 - 클릭하면 메인으로 이동 */}
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-1.5">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">인스타툰</span>
          </a>
          
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
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 px-3"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-9 px-4" size="sm">
            <Download className="h-4 w-4 mr-2" />
            다운로드
          </Button>
        </div>
      </header>

      {/* 메인 워크스페이스 - 고정 높이 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 왼쪽 사이드바 - 독립 스크롤 */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-shrink-0">
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-semibold text-slate-900 mb-3">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {/* 선택된 요소 속성 편집 패널 */}
              {selectedElementId && (
                <div className="space-y-4 pb-6 mb-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">속성 편집</h4>
                    <button 
                      onClick={() => setSelectedElementId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {(() => {
                    const element = cuts.find(cut => cut.id === selectedCutId)?.elements.find(el => el.id === selectedElementId);
                    if (!element) return null;
                    
                    return (
                      <>
                        {/* 텍스트 요소만 텍스트 편집 기능 표시 */}
                        {element.type === 'text' && (
                          <>
                            {/* 텍스트 내용 편집 */}
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                텍스트
                              </label>
                              <Textarea 
                                value={element.content || ''}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, content: newValue }
                                        : el
                                    )
                                  })));
                                }}
                                placeholder="텍스트를 입력하세요..."
                                className="min-h-[60px] text-sm resize-none border-slate-200"
                              />
                            </div>

                            {/* 폰트 크기 */}
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                폰트 크기: {element.fontSize || 14}px
                              </label>
                              <Slider
                                value={[element.fontSize || 14]}
                                onValueChange={(value) => {
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, fontSize: value[0] }
                                        : el
                                    )
                                  })));
                                }}
                                max={32}
                                min={8}
                                step={1}
                                className="w-full"
                              />
                            </div>

                            {/* 텍스트 색상 */}
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                텍스트 색상
                              </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={element.color}
                              onChange={(e) => {
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, color: e.target.value }
                                      : el
                                  )
                                })));
                              }}
                              className="w-10 h-8 rounded border border-slate-300 cursor-pointer"
                            />
                            <Input
                              value={element.color}
                              onChange={(e) => {
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, color: e.target.value }
                                      : el
                                  )
                                })));
                              }}
                              className="text-sm font-mono"
                            />
                          </div>
                            </div>
                          </>
                        )}

                        {/* 공통: 위치 및 크기 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                              X 위치
                            </label>
                            <Input
                              type="number"
                              value={Math.round(element.x)}
                              onChange={(e) => {
                                const newX = parseInt(e.target.value) || 0;
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, x: newX }
                                      : el
                                  )
                                })));
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                              Y 위치
                            </label>
                            <Input
                              type="number"
                              value={Math.round(element.y)}
                              onChange={(e) => {
                                const newY = parseInt(e.target.value) || 0;
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, y: newY }
                                      : el
                                  )
                                })));
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                              너비
                            </label>
                            <Input
                              type="number"
                              value={Math.round(element.width)}
                              onChange={(e) => {
                                const newWidth = parseInt(e.target.value) || 0;
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, width: newWidth }
                                      : el
                                  )
                                })));
                              }}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                              높이
                            </label>
                            <Input
                              type="number"
                              value={Math.round(element.height)}
                              onChange={(e) => {
                                const newHeight = parseInt(e.target.value) || 0;
                                setCuts(cuts.map(cut => ({
                                  ...cut,
                                  elements: cut.elements.map(el => 
                                    el.id === selectedElementId 
                                      ? { ...el, height: newHeight }
                                      : el
                                  )
                                })));
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>

                      </>
                    );
                  })()}
                </div>
              )}

              {activeTab === 'bubble' && (
                <div className="space-y-4">
                  {/* 카테고리 선택 */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      말풍선 종류
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {BUBBLE_CATEGORIES.map(category => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedBubbleCategory(category.id)}
                          className={cn(
                            "px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2",
                            selectedBubbleCategory === category.id
                              ? "bg-purple-100 text-purple-700 border border-purple-300"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          <span>{category.emoji}</span>
                          <span className="text-xs">{category.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 말풍선 라이브러리 - 가상화된 리스트 사용 */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      말풍선 선택
                    </label>
                    <VirtualizedTemplateList
                      selectedCategory={selectedBubbleCategory}
                      onTemplateSelect={handleBubbleTemplateSelect}
                      onDragStart={handleTemplateDragStart}
                      onDragEnd={handleTemplateDragEnd}
                      isDraggingBubble={isDraggingBubble}
                      draggedBubbleId={draggedBubbleId}
                    />
                  </div>

                  {/* 선택된 말풍선 색상 편집 */}
                  {selectedElementId && selectedElement?.type === 'bubble' && (
                    <div className="mt-6 space-y-4 pt-4 border-t border-slate-200">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        선택된 말풍선 속성
                      </h4>
                      
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 block">
                          말풍선 색상
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-600 mb-1 block">
                              배경색
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={selectedElement.fillColor || '#ffffff'}
                                onChange={(e) => {
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, fillColor: e.target.value }
                                        : el
                                    )
                                  })));
                                }}
                                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                              />
                              <Input
                                type="text"
                                value={selectedElement.fillColor || '#ffffff'}
                                onChange={(e) => {
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, fillColor: e.target.value }
                                        : el
                                    )
                                  })));
                                }}
                                className="text-xs flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 mb-1 block">
                              테두리색
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={selectedElement.strokeColor || '#333333'}
                                onChange={(e) => {
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, strokeColor: e.target.value }
                                        : el
                                    )
                                  })));
                                }}
                                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                              />
                              <Input
                                type="text"
                                value={selectedElement.strokeColor || '#333333'}
                                onChange={(e) => {
                                  setCuts(cuts.map(cut => ({
                                    ...cut,
                                    elements: cut.elements.map(el => 
                                      el.id === selectedElementId 
                                        ? { ...el, strokeColor: e.target.value }
                                        : el
                                    )
                                  })));
                                }}
                                className="text-xs flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-600 mb-1 block">
                            테두리 두께
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={selectedElement.strokeWidth || 2}
                            onChange={(e) => {
                              setCuts(cuts.map(cut => ({
                                ...cut,
                                elements: cut.elements.map(el => 
                                  el.id === selectedElementId 
                                    ? { ...el, strokeWidth: parseInt(e.target.value) || 2 }
                                    : el
                                )
                              })));
                            }}
                            className="text-sm w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 말풍선은 순수 그래픽 요소 - 텍스트 입력 없음 */}
                  {!selectedElementId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        💡 말풍선과 텍스트는 별도 요소입니다. 텍스트를 추가하려면 "텍스트" 탭을 사용하세요.
                      </p>
                    </div>
                  )}
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
        </aside>
        
        {/* 중앙 캔버스 영역 - 완전 고정 레이아웃 */}
        <section className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* 페이지 정보 바 */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                {selectedCutIndex + 1}컷 / {cuts.length}컷
              </span>
              <div className="text-xs text-slate-500">
                {CANVAS_SIZES[canvasRatio].actualWidth} × {CANVAS_SIZES[canvasRatio].actualHeight}px
              </div>
              <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1">
                Ctrl+휠: 확대/축소
              </div>
            </div>
          </div>

          {/* 캔버스 컨테이너 - 작업공간만 스크롤 */}
          <div 
            ref={canvasAreaRef}
            className="flex-1 overflow-auto bg-slate-50"
            style={{ isolation: 'isolate' }}
          >
            {/* 캔버스 래퍼 - 충분한 패딩으로 캔버스 간격 보장 */}
            <div 
              className="min-h-full flex flex-col items-center py-12"
              style={{
                paddingLeft: '200px',
                paddingRight: '200px',
              }}
            >
              {cuts.map((cut, index) => {
                // 각 캔버스의 실제 크기 계산
                const scaledWidth = CANVAS_SIZES[canvasRatio].width * (zoom / 100);
                const scaledHeight = CANVAS_SIZES[canvasRatio].height * (zoom / 100);
                
                // 마진 계산 - 배율이 커질수록 마진도 증가
                const marginBottom = Math.max(60, 100 * (zoom / 100));
                
                return (
                  <div
                    key={cut.id}
                    ref={(el) => {
                      canvasRefs.current[cut.id] = el;
                    }}
                    className={cn(
                      "relative group transition-all duration-200",
                      selectedCutId === cut.id && "drop-shadow-xl"
                    )}
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                      marginBottom: index < cuts.length - 1 ? `${marginBottom}px` : '0'
                    }}
                  >
                    {/* 컷 번호 */}
                    <div className="absolute -left-12 top-0 flex flex-col items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-sm font-bold rounded">
                        {index + 1}
                      </div>
                    </div>

                    {/* 캠버스 상단 컨트롤 버튼들 - 미리캠버스 스타일 */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
                      {/* 위로 이동 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCutUp(cut.id);
                        }}
                        disabled={index === 0}
                        className="w-7 h-7 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center rounded shadow-sm transition-colors"
                        title="위로 이동"
                      >
                        <ChevronUp className="h-3 w-3 text-slate-600" />
                      </button>
                      
                      {/* 아래로 이동 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCutDown(cut.id);
                        }}
                        disabled={index === cuts.length - 1}
                        className="w-7 h-7 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center rounded shadow-sm transition-colors"
                        title="아래로 이동"
                      >
                        <ChevronDown className="h-3 w-3 text-slate-600" />
                      </button>
                      
                      {/* 삭제 */}
                      {cuts.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCut(cut.id);
                          }}
                          className="w-7 h-7 bg-white border border-red-300 hover:bg-red-50 text-red-600 flex items-center justify-center rounded shadow-sm transition-colors"
                          title="컷 삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* 캔버스 */}
                    <div
                      className={cn(
                        "w-full h-full bg-white shadow-lg overflow-hidden cursor-pointer relative border-2 transition-all",
                        selectedCutId === cut.id ? "border-purple-500" : "border-slate-300 hover:border-slate-400",
                        isDraggingBubble && selectedCutId === cut.id && "border-purple-400 bg-purple-50"
                      )}
                      onClick={() => {
                        setSelectedCutId(cut.id);
                        setSelectedElementId(null);
                        scrollToCanvas(cut.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault(); // 드롭 허용
                        if (isDraggingBubble) {
                          setSelectedCutId(cut.id); // 드래그 중일 때 캔버스 선택
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        if (isDraggingBubble) {
                          setSelectedCutId(cut.id);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        
                        if (!isDraggingBubble || !draggedBubbleId) return;
                        
                        // 드롭 위치 계산 (캔버스 중앙 기준)
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width * CANVAS_SIZES[canvasRatio].width - 60; // 말풍선 크기의 절반
                        const y = (e.clientY - rect.top) / rect.height * CANVAS_SIZES[canvasRatio].height - 40;
                        
                        // 캔버스 경계 내에 배치
                        const constrainedX = Math.max(0, Math.min(x, CANVAS_SIZES[canvasRatio].width - 120));
                        const constrainedY = Math.max(0, Math.min(y, CANVAS_SIZES[canvasRatio].height - 80));
                        
                        // 말풍선 템플릿 찾기
                        const template = BUBBLE_TEMPLATES.find(t => t.id === draggedBubbleId);
                        if (!template) return;
                        
                        // 새 말풍선 요소 생성 (텍스트 내용 없음)
                        const newElement: CanvasElement = {
                          id: Date.now().toString(),
                          type: 'bubble',
                          // content 제거 - 말풍선은 순수 그래픽 요소
                          x: constrainedX,
                          y: constrainedY,
                          width: 120,
                          height: 80,
                          bubbleStyle: template.category as 'speech' | 'thought' | 'shout' | 'whisper',
                          templateId: template.id,
                          fillColor: '#ffffff', // 기본 배경색
                          strokeColor: '#333333', // 기본 테두리색
                          strokeWidth: 2 // 기본 테두리 두께
                        };
                        
                        // 캔버스에 요소 추가
                        setCuts(cuts.map(c => 
                          c.id === cut.id 
                            ? { ...c, elements: [...c.elements, newElement] }
                            : c
                        ));
                        
                        // 새 요소 선택
                        setSelectedElementId(newElement.id);
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

                      {/* 캔버스 요소들 (말풍선, 텍스트) - 스케일 조정 */}
                      {cut.elements.map(element => (
                        <div
                          key={element.id}
                          className={cn(
                            "absolute border-2 cursor-move transition-all select-none",
                            selectedElementId === element.id 
                              ? "border-purple-500 shadow-lg" 
                              : "border-transparent hover:border-purple-300",
                            isDraggingElement && draggedElement?.id === element.id && "z-50"
                          )}
                          style={{
                            left: `${(element.x / CANVAS_SIZES[canvasRatio].width) * 100}%`,
                            top: `${(element.y / CANVAS_SIZES[canvasRatio].height) * 100}%`,
                            width: `${(element.width / CANVAS_SIZES[canvasRatio].width) * 100}%`,
                            height: `${(element.height / CANVAS_SIZES[canvasRatio].height) * 100}%`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedElementId(element.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            
                            // 선택된 요소만 드래그 가능
                            if (selectedElementId !== element.id) {
                              setSelectedElementId(element.id);
                              return;
                            }
                            
                            const rect = e.currentTarget.getBoundingClientRect();
                            const offsetX = e.clientX - rect.left;
                            const offsetY = e.clientY - rect.top;
                            
                            setIsDraggingElement(true);
                            setDraggedElement({ 
                              id: element.id, 
                              offsetX, 
                              offsetY 
                            });
                            
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const canvas = canvasRefs.current[selectedCutId];
                              if (!canvas) return;
                              
                              const canvasRect = canvas.getBoundingClientRect();
                              const scaledWidth = CANVAS_SIZES[canvasRatio].width * (zoom / 100);
                              const scaledHeight = CANVAS_SIZES[canvasRatio].height * (zoom / 100);
                              
                              // 마우스 위치를 캔버스 좌표계로 변환
                              const canvasX = (moveEvent.clientX - canvasRect.left - offsetX) / scaledWidth * CANVAS_SIZES[canvasRatio].width;
                              const canvasY = (moveEvent.clientY - canvasRect.top - offsetY) / scaledHeight * CANVAS_SIZES[canvasRatio].height;
                              
                              // 캔버스 경계 내에서 제한
                              const constrainedX = Math.max(0, Math.min(canvasX, CANVAS_SIZES[canvasRatio].width - element.width));
                              const constrainedY = Math.max(0, Math.min(canvasY, CANVAS_SIZES[canvasRatio].height - element.height));
                              
                              // 요소 위치 업데이트
                              setCuts(prevCuts => prevCuts.map(cut => ({
                                ...cut,
                                elements: cut.elements.map(el => 
                                  el.id === element.id 
                                    ? { ...el, x: constrainedX, y: constrainedY }
                                    : el
                                )
                              })));
                            };
                            
                            const handleMouseUp = () => {
                              setIsDraggingElement(false);
                              setDraggedElement(null);
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        >
                          {element.type === 'text' ? (
                            <div
                              className="w-full h-full flex items-center justify-center p-2 font-medium bg-white bg-opacity-80"
                              style={{
                                fontSize: `${(element.fontSize || 16) * (zoom / 100)}px`,
                                color: element.color
                              }}
                            >
                              {element.content}
                            </div>
                          ) : element.type === 'bubble' ? (
                            <div className="w-full h-full relative">
                              {element.templateId ? (
                                // 템플릿 SVG 사용
                                <BubbleTemplateRenderer
                                  templateId={element.templateId}
                                  fillColor={element.fillColor || '#ffffff'}
                                  strokeColor={element.strokeColor || '#333333'}
                                  strokeWidth={element.strokeWidth || 2}
                                  className="absolute inset-0 w-full h-full"
                                />
                              ) : (
                                // 기본 말풍선 SVG
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
                                    fill={element.fillColor || '#ffffff'}
                                    stroke={element.strokeColor || '#333333'}
                                    strokeWidth={element.strokeWidth || 2}
                                  />
                                  <path
                                    d="M20,56 L25,65 L30,56"
                                    fill={element.fillColor || '#ffffff'}
                                    stroke={element.strokeColor || '#333333'}
                                    strokeWidth={element.strokeWidth || 2}
                                  />
                                </svg>
                              )}
                              {/* 말풍선에는 텍스트 표시 안 함 - 순수 그래픽 요소 */}
                            </div>
                          ) : null}

                          {/* 선택된 요소의 컨트롤 UI */}
                          {selectedElementId === element.id && (
                            <>
                              {/* 상단 툴바 - Canva 스타일 */}
                              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1 z-30">
                                <button
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // 복사 기능 (나중에 구현)
                                  }}
                                  title="복사"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteElement(element.id);
                                  }}
                                  title="삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="w-px h-6 bg-gray-300 mx-1" />
                                <button
                                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600 transition-colors"
                                  title="더 보기"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </div>

                              {/* 리사이즈 핸들들 - 8방향 */}
                              {/* 모서리 핸들 */}
                              <div 
                                className="absolute -top-1 -left-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-nw-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'nw')}
                              />
                              <div 
                                className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-ne-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'ne')}
                              />
                              <div 
                                className="absolute -bottom-1 -left-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-sw-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'sw')}
                              />
                              <div 
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-se-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'se')}
                              />
                              
                              {/* 중간점 핸들 */}
                              <div 
                                className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-n-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'n')}
                              />
                              <div 
                                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-s-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 's')}
                              />
                              <div 
                                className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-w-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'w')}
                              />
                              <div 
                                className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-cyan-500 border border-white rounded-full cursor-e-resize z-25 shadow-sm hover:bg-cyan-600 transition-colors" 
                                onMouseDown={(e) => handleResizeStart(e, element.id, 'e')}
                              />

                              {/* 하단 회전 버튼 */}
                              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-25">
                                <button className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
                                  <RotateCcw className="h-3 w-3 text-gray-600" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* 페이지 추가 버튼 - 캔버스 가로 길이에 정확히 맞춤 */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={addCut}
                  className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 
                           text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 
                           transition-all font-medium rounded-lg bg-white shadow-sm"
                  style={{
                    width: `${CANVAS_SIZES[canvasRatio].width * (zoom / 100)}px`,
                    height: '60px'
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm whitespace-nowrap">페이지 추가</span>
                </button>
              </div>
            </div>
          </div>

          {/* 하단 줌 컨트롤 - 고정 */}
          <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">
                전체 {cuts.length}컷
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
                <span className="text-sm text-slate-600 font-medium mr-2">배율</span>
                <span className="text-xs text-slate-500 w-8">25%</span>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={25}
                  max={200}
                  step={1}
                  className="w-32"
                />
                <span className="text-xs text-slate-500 w-10">200%</span>
                <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded ml-2">
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
          </footer>
        </section>

        {/* 오른쪽 속성 패널 - 독립 스크롤 */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex-shrink-0">
            <h3 className="font-semibold text-slate-900">웹툰 이미지 생성하기</h3>
            {selectedCut && (
              <p className="text-sm text-slate-500 mt-1">
                {selectedCutIndex + 1}컷 편집 중
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedCut && (
              <div className="space-y-4">
                {/* 캐릭터 설정 섹션 */}
                <CharacterSelector
                  selectedCharacters={selectedCharacters}
                  onCharacterToggle={handleCharacterToggle}
                  onAddCharacter={handleAddCharacter}
                  refreshKey={characterRefreshKey}
                />

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
                  onClick={() => {
                    generateImage(selectedCut.id);
                    scrollToCanvas(selectedCut.id); // 이미지 생성 시 해당 캔버스를 상단으로 이동
                  }}
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

                {/* 선택된 텍스트 요소 속성만 표시 */}
                {selectedElement && selectedElement.type === 'text' && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-sm font-medium text-slate-700">
                      텍스트 속성
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
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
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
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        onClick={() => handleEditImage(selectedCut.id)}
                        disabled={selectedCut.isGenerating}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        수정하기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 이미지 수정 모달 */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>이미지 수정하기</DialogTitle>
            <DialogDescription>
              기존 이미지를 참조하여 수정할 내용을 입력하세요. 구체적으로 어떤 부분을 어떻게 바꿀지 설명해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-prompt" className="text-sm font-medium">
                수정 사항
              </label>
              <Textarea
                id="edit-prompt"
                placeholder="예: 캐릭터의 표정을 웃는 얼굴로 바꿔주세요, 배경을 밤 풍경으로 변경해주세요, 캐릭터의 옷 색깔을 파란색으로 바꿔주세요..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
              >
                취소
              </Button>
              <Button 
                onClick={handleEditSubmit}
                disabled={!editPrompt.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                수정하기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 캐릭터 추가 모달 */}
      <AddCharacterModal
        open={addCharacterModalOpen}
        onOpenChange={setAddCharacterModalOpen}
        onCharacterAdded={handleCharacterAdded}
      />
    </div>
  );
}