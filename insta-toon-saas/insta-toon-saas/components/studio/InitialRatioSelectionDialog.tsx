'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Square, 
  RectangleVertical,
  Sparkles
} from "lucide-react";

type CanvasRatio = '4:5' | '1:1' | '16:9';

const CANVAS_SIZES = {
  '4:5': { label: '세로형', actualWidth: 1024, actualHeight: 1280, description: '인스타그램 피드에 최적화된 세로형 비율' },
  '1:1': { label: '정사각형', actualWidth: 1024, actualHeight: 1024, description: '인스타그램 정사각형 포스트 비율' },
  '16:9': { label: '가로형', actualWidth: 1920, actualHeight: 1080, description: '스토리 및 릴스에 최적화된 가로형 비율' }
};

interface InitialRatioSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedRatio: CanvasRatio) => void;
  onCancel: () => void;
  currentRatio?: CanvasRatio;
}

export function InitialRatioSelectionDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  currentRatio = '4:5'
}: InitialRatioSelectionDialogProps) {
  const [selectedRatio, setSelectedRatio] = useState<CanvasRatio>(currentRatio);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(selectedRatio);
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const getRatioIcon = (ratio: CanvasRatio) => {
    switch (ratio) {
      case '4:5':
        return <RectangleVertical className="h-6 w-6" />;
      case '1:1':
        return <Square className="h-6 w-6" />;
      case '16:9':
        return <Square className="h-6 w-6 rotate-90" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <DialogTitle>캔버스 비율을 선택해주세요</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            웹툰 제작을 시작하기 전에 캔버스 비율을 선택해주세요.<br />
            <strong className="text-purple-600">선택한 비율은 이 작업공간에서 고정되며 변경할 수 없습니다.</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {(Object.keys(CANVAS_SIZES) as CanvasRatio[]).map((ratio) => {
            const ratioData = CANVAS_SIZES[ratio];
            const isSelected = selectedRatio === ratio;
            
            return (
              <div
                key={ratio}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:bg-slate-50 ${
                  isSelected 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedRatio(ratio)}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                    isSelected ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {getRatioIcon(ratio)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${
                        isSelected ? 'text-purple-900' : 'text-slate-900'
                      }`}>
                        {ratioData.label}
                      </h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        isSelected ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {ratioData.actualWidth} × {ratioData.actualHeight}px
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      isSelected ? 'text-purple-700' : 'text-slate-600'
                    }`}>
                      {ratioData.description}
                    </p>
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center justify-center w-6 h-6 bg-purple-500 rounded-full text-white">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex gap-2">
            <div className="text-amber-600 font-semibold">⚠️</div>
            <div>
              <p className="text-sm text-amber-800 font-medium">중요 안내</p>
              <p className="text-sm text-amber-700 mt-1">
                캔버스 비율을 선택하면 <strong>이 작업공간에서는 해당 비율로만</strong> 웹툰을 제작할 수 있습니다. 
                다른 비율로 작업하려면 새로운 프로젝트를 생성해야 합니다.
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                설정 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {CANVAS_SIZES[selectedRatio].label}으로 시작하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}