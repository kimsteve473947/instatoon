"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Wand2, 
  MessageSquare, 
  Type, 
  UserPlus,
  FileText,
  Image,
  Sparkles,
  Users,
  Layers,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MenuTab = 'ai-webtoon' | 'bubble' | 'text' | 'ai-character' | 'ai-script';

interface MenuItem {
  id: MenuTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'ai-webtoon',
    label: 'AI 웹툰 생성',
    icon: Wand2,
    description: 'AI로 웹툰 패널 생성'
  },
  {
    id: 'bubble',
    label: '말풍선',
    icon: MessageSquare,
    description: '다양한 말풍선 추가'
  },
  {
    id: 'text',
    label: '텍스트',
    icon: Type,
    description: '텍스트 삽입'
  },
  {
    id: 'ai-character',
    label: 'AI 캐릭터 생성',
    icon: UserPlus,
    description: '일관된 캐릭터 생성'
  },
  {
    id: 'ai-script',
    label: 'AI 대본 작성',
    icon: FileText,
    description: 'AI로 스토리 작성'
  }
];

export function MiriCanvasSidebar() {
  const [activeTab, setActiveTab] = useState<MenuTab>('ai-webtoon');

  const renderContent = () => {
    switch (activeTab) {
      case 'ai-webtoon':
        return <AIWebtoonPanel />;
      case 'bubble':
        return <BubblePanel />;
      case 'text':
        return <TextPanel />;
      case 'ai-character':
        return <AICharacterPanel />;
      case 'ai-script':
        return <AIScriptPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="w-72 bg-white border-r flex">
      {/* 메뉴 탭 */}
      <div className="w-16 bg-gray-50 border-r">
        <div className="py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full px-2 py-3 flex flex-col items-center gap-1 transition-colors hover:bg-gray-100",
                  activeTab === item.id && "bg-white border-l-2 border-blue-500"
                )}
                title={item.description}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  activeTab === item.id ? "text-blue-600" : "text-gray-600"
                )} />
                <span className={cn(
                  "text-[10px] text-center",
                  activeTab === item.id ? "text-blue-600 font-medium" : "text-gray-600"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 컨텐츠 패널 */}
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">
            {menuItems.find(item => item.id === activeTab)?.label}
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3">
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// AI 웹툰 생성 패널
function AIWebtoonPanel() {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          장면 설명
        </label>
        <Textarea 
          placeholder="생성하고 싶은 장면을 설명해주세요"
          className="min-h-[100px] text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          스타일
        </label>
        <select className="w-full border rounded-md px-3 py-2 text-sm">
          <option>한국 웹툰</option>
          <option>일본 만화</option>
          <option>미국 코믹스</option>
          <option>수채화</option>
        </select>
      </div>

      <Button className="w-full" size="sm">
        <Wand2 className="h-4 w-4 mr-2" />
        생성하기
      </Button>

      <div className="pt-2">
        <p className="text-xs text-gray-500 mb-2">최근 생성</p>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// 말풍선 패널
function BubblePanel() {
  const bubbleTypes = [
    { id: 'speech', label: '일반', preview: '💬' },
    { id: 'thought', label: '생각', preview: '💭' },
    { id: 'shout', label: '외침', preview: '💥' },
    { id: 'whisper', label: '속삭임', preview: '🔉' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">말풍선 유형</p>
        <div className="grid grid-cols-2 gap-2">
          {bubbleTypes.map(type => (
            <button
              key={type.id}
              className="p-3 border rounded-lg hover:bg-gray-50 flex flex-col items-center gap-1"
            >
              <span className="text-2xl">{type.preview}</span>
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">말풍선 템플릿</p>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg border hover:border-blue-500 cursor-pointer" />
          ))}
        </div>
      </div>
    </div>
  );
}

// 텍스트 패널
function TextPanel() {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          텍스트 입력
        </label>
        <Textarea 
          placeholder="텍스트를 입력하세요"
          className="min-h-[80px] text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          폰트
        </label>
        <select className="w-full border rounded-md px-3 py-2 text-sm">
          <option>나눔고딕</option>
          <option>나눔명조</option>
          <option>배민 주아체</option>
          <option>카페24 써라운드</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <span className="font-bold">B</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <span className="italic">I</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <span className="underline">U</span>
        </Button>
      </div>

      <Button className="w-full" size="sm">
        <Type className="h-4 w-4 mr-2" />
        텍스트 추가
      </Button>
    </div>
  );
}

// AI 캐릭터 생성 패널
function AICharacterPanel() {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          캐릭터 이름
        </label>
        <Input placeholder="예: 김철수" className="text-sm" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          캐릭터 설명
        </label>
        <Textarea 
          placeholder="캐릭터의 외모와 특징을 설명해주세요"
          className="min-h-[80px] text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          레퍼런스 이미지
        </label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-xs text-gray-500">클릭하여 업로드</p>
        </div>
      </div>

      <Button className="w-full" size="sm">
        <UserPlus className="h-4 w-4 mr-2" />
        캐릭터 생성
      </Button>

      <div className="pt-2">
        <p className="text-xs text-gray-500 mb-2">저장된 캐릭터</p>
        <div className="space-y-2">
          {['주인공', '친구', '선생님'].map(name => (
            <div key={name} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI 대본 작성 패널
function AIScriptPanel() {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          장르
        </label>
        <select className="w-full border rounded-md px-3 py-2 text-sm">
          <option>로맨스</option>
          <option>액션</option>
          <option>코미디</option>
          <option>일상</option>
          <option>판타지</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          줄거리
        </label>
        <Textarea 
          placeholder="간단한 줄거리를 입력하세요"
          className="min-h-[100px] text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          컷 수
        </label>
        <select className="w-full border rounded-md px-3 py-2 text-sm">
          <option>4컷</option>
          <option>6컷</option>
          <option>8컷</option>
          <option>10컷</option>
        </select>
      </div>

      <Button className="w-full" size="sm">
        <FileText className="h-4 w-4 mr-2" />
        대본 생성
      </Button>

      <div className="pt-2">
        <p className="text-xs text-gray-500 mb-2">생성된 대본</p>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 leading-relaxed">
            대본이 여기에 표시됩니다...
          </p>
        </div>
      </div>
    </div>
  );
}