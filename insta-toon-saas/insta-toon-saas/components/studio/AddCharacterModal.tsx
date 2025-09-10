"use client";

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Upload,
  Sparkles,
  Loader2,
  X,
  ImageIcon,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from '@supabase/ssr';
import { resizeImageToRatio, CANVAS_RATIOS } from '@/lib/utils/image-resize';

interface AddCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCharacterAdded?: () => void;
  canvasRatio?: '4:5' | '1:1' | '16:9'; // 현재 캔버스 비율
}

type CreationMode = 'upload' | 'ai' | null;

export function AddCharacterModal({ 
  open, 
  onOpenChange, 
  onCharacterAdded,
  canvasRatio = '4:5' // 기본값 4:5
}: AddCharacterModalProps) {
  const [mode, setMode] = useState<CreationMode>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 모달 초기화
  const resetModal = () => {
    setMode(null);
    setName('');
    setDescription('');
    setAiPrompt('');
    setUploadedImage(null);
    setPreviewUrl(null);
    setIsCreating(false);
  };

  // 모달 닫기
  const handleClose = () => {
    if (!isCreating) {
      resetModal();
      onOpenChange(false);
    }
  };

  // 파일 업로드 처리 (비율 조정 포함)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    try {
      // 이미지를 캔버스 비율에 맞게 조정 (흰색 배경 추가)
      const targetRatio = canvasRatio === '16:9' ? CANVAS_RATIOS.LANDSCAPE : 
                          canvasRatio === '1:1' ? CANVAS_RATIOS.SQUARE : 
                          CANVAS_RATIOS.PORTRAIT;
      
      const resizedFile = await resizeImageToRatio(file, {
        targetRatio: targetRatio,
        backgroundColor: 'white',
        maxWidth: canvasRatio === '16:9' ? 1920 : 1080,
        quality: 0.9
      });

      setUploadedImage(resizedFile);
      
      // 미리보기 생성 (리사이즈된 이미지)
      const url = URL.createObjectURL(resizedFile);
      setPreviewUrl(url);

      console.log(`이미지 비율 조정 완료 (${canvasRatio}): 원본 ${file.name} → 리사이즈 ${resizedFile.name}`);
    } catch (error) {
      console.error('이미지 리사이즈 실패:', error);
      alert('이미지 처리 중 오류가 발생했습니다. 다른 이미지를 선택해주세요.');
    }
  };

  // 파일명 안전화 함수
  const sanitizeFileName = (fileName: string): string => {
    // 파일 확장자 추출
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    
    // 한글, 특수문자, 공백을 안전한 문자로 변환
    const sanitized = nameWithoutExtension
      .replace(/[가-힣]/g, 'char') // 한글을 'char'로 변환
      .replace(/[^\w\-_.]/g, '_') // 영문, 숫자, 하이픈, 언더스코어, 점만 허용
      .replace(/_{2,}/g, '_') // 연속된 언더스코어를 하나로 축약
      .replace(/^_|_$/g, ''); // 시작/끝 언더스코어 제거
    
    return sanitized + extension;
  };

  // 이미지 업로드 (Supabase Storage)
  const uploadImageToStorage = async (file: File): Promise<string> => {
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileName = `characters/${Date.now()}-${sanitizedFileName}`;
    
    const { data, error } = await supabase.storage
      .from('character-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('character-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // AI 캐릭터 생성
  const generateAiCharacter = async (prompt: string): Promise<string> => {
    const response = await fetch('/api/ai/character/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        style: 'character_reference',
        aspectRatio: canvasRatio // AI 생성 시에도 캔버스 비율 전달
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'AI 캐릭터 생성에 실패했습니다.');
    }

    const result = await response.json();
    return result.imageUrl;
  };

  // 캐릭터 생성/저장
  const handleCreateCharacter = async () => {
    if (!name.trim()) {
      alert('캐릭터 이름을 입력해주세요.');
      return;
    }

    if (!description.trim()) {
      alert('캐릭터 설명을 입력해주세요.');
      return;
    }

    if (mode === 'upload' && !uploadedImage) {
      alert('이미지를 업로드해주세요.');
      return;
    }

    if (mode === 'ai' && !aiPrompt.trim()) {
      alert('AI 생성 프롬프트를 입력해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      
      let imageUrl = '';
      let referenceImages: string[] = [];

      if (mode === 'upload' && uploadedImage) {
        // 이미지 업로드
        imageUrl = await uploadImageToStorage(uploadedImage);
        referenceImages = [imageUrl];
      } else if (mode === 'ai' && aiPrompt.trim()) {
        // AI 캐릭터 생성
        imageUrl = await generateAiCharacter(aiPrompt);
        referenceImages = [imageUrl];
      }

      // 캐릭터 API를 통해 저장 (비율별 이미지 처리 포함)
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          referenceImages: referenceImages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '캐릭터 생성에 실패했습니다.');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '캐릭터 생성에 실패했습니다.');
      }

      // 성공 처리
      onCharacterAdded?.();
      handleClose();
      
    } catch (error) {
      console.error('캐릭터 생성 실패:', error);
      alert(error instanceof Error ? error.message : '캐릭터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            새 캐릭터 추가
          </DialogTitle>
          <DialogDescription>
            캐릭터를 생성하여 웹툰에서 일관된 외모로 활용하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 생성 방식 선택 */}
          {!mode && (
            <div className="space-y-4">
              <Label className="text-base font-medium">생성 방식 선택</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('upload')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <p className="font-medium text-slate-700">이미지 업로드</p>
                    <p className="text-sm text-slate-500">컴퓨터에서 선택</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('ai')}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <Sparkles className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <p className="font-medium text-slate-700">AI 생성</p>
                    <p className="text-sm text-slate-500">설명으로 생성</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 캐릭터 기본 정보 */}
          {mode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">캐릭터 정보</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">캐릭터 이름 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 지민이, 캐릭터A"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">캐릭터 설명 *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="캐릭터의 외모, 성격, 특징을 설명해주세요"
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 이미지 업로드 모드 */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">레퍼런스 이미지</Label>
              
              <div className="space-y-3">
                {!uploadedImage ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer"
                  >
                    <ImageIcon className="h-12 w-12 text-slate-400" />
                    <div className="text-center">
                      <p className="font-medium text-slate-700">이미지 선택</p>
                      <p className="text-sm text-slate-500 mt-1">
                        PNG, JPG 파일 (최대 10MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={previewUrl!}
                      alt="미리보기"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setUploadedImage(null);
                        setPreviewUrl(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* AI 생성 모드 */}
          {mode === 'ai' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">AI 생성 프롬프트</Label>
              
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="원하는 캐릭터의 외모를 상세히 설명해주세요&#10;예: 20대 여성, 긴 검은 머리, 둥근 안경, 대학생 스타일, 밝은 미소"
                className="min-h-[100px]"
              />
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>팁:</strong> 나이, 성별, 헤어스타일, 옷차림, 표정 등을 구체적으로 설명할수록 더 정확한 캐릭터가 생성됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          {mode && (
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setMode(null)}
                disabled={isCreating}
                className="flex-1"
              >
                이전
              </Button>
              
              <Button
                onClick={handleCreateCharacter}
                disabled={isCreating || !name.trim() || !description.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'ai' ? '생성 중...' : '업로드 중...'}
                  </>
                ) : (
                  <>
                    {mode === 'ai' ? (
                      <Sparkles className="h-4 w-4 mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    캐릭터 생성
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}