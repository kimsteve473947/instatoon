"use client";

import { useState } from "react";
import { Panel } from "@/lib/stores/studio-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  ImageIcon, 
  Wand2, 
  Copy, 
  Trash2, 
  MoreHorizontal,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PanelContainerProps {
  panel: Panel;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onGenerate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function PanelContainer({
  panel,
  index,
  isActive,
  onSelect,
  onGenerate,
  onDuplicate,
  onDelete,
}: PanelContainerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative w-80 aspect-square rounded-lg transition-all duration-200 cursor-pointer",
        "border-2 bg-white shadow-sm hover:shadow-md",
        isActive 
          ? "border-blue-500 ring-2 ring-blue-200" 
          : "border-gray-200 hover:border-gray-300"
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 패널 번호 */}
      <div className="absolute -top-2 -left-2 z-10">
        <div className={cn(
          "w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center text-white",
          isActive ? "bg-blue-500" : "bg-gray-500"
        )}>
          {index + 1}
        </div>
      </div>

      {/* 패널 액션 메뉴 */}
      <div className={cn(
        "absolute top-2 right-2 z-10 transition-opacity",
        isHovered || isActive ? "opacity-100" : "opacity-0"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGenerate(); }}>
              <Wand2 className="h-4 w-4 mr-2" />
              {panel.imageUrl ? "재생성" : "생성"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-4 w-4 mr-2" />
              복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 패널 내용 */}
      <div className="w-full h-full rounded-lg overflow-hidden">
        {panel.isGenerating ? (
          // 생성 중 상태
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">이미지 생성 중...</p>
            <p className="text-xs text-gray-500">잠시만 기다려주세요</p>
          </div>
        ) : panel.imageUrl ? (
          // 생성된 이미지
          <div className="relative w-full h-full">
            <img
              src={panel.imageUrl}
              alt={`패널 ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* 이미지 위 오버레이 정보 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  {panel.characters && panel.characters.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="bg-white/20 px-2 py-1 rounded">
                        {panel.characters.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {panel.tokensUsed && (
                    <span className="bg-white/20 px-2 py-1 rounded">
                      {panel.tokensUsed}토큰
                    </span>
                  )}
                  {panel.generatedAt && (
                    <span className="text-white/80">
                      {new Date(panel.generatedAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 빈 패널 상태
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-600 mb-2">
              {panel.prompt ? "생성 준비됨" : "프롬프트를 입력하세요"}
            </p>
            
            {panel.prompt && (
              <Button 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                className="mt-2"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                생성하기
              </Button>
            )}
            
            {!panel.prompt && (
              <p className="text-xs text-gray-500 text-center max-w-48">
                오른쪽 편집 패널에서 프롬프트를 입력한 후 이미지를 생성할 수 있습니다
              </p>
            )}
          </div>
        )}
      </div>

      {/* 프롬프트 미리보기 (하단) */}
      {panel.prompt && (
        <div className="absolute -bottom-8 left-0 right-0">
          <div className="bg-white rounded border px-2 py-1 shadow-sm">
            <p className="text-xs text-gray-600 truncate">
              {panel.prompt}
            </p>
          </div>
        </div>
      )}

      {/* 활성 패널 표시자 */}
      {isActive && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}