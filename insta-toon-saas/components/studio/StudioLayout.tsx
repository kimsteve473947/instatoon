"use client";

import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Sidebar } from "./Sidebar";
import { WebtoonCanvas } from "./WebtoonCanvas";
import { Toolbar } from "./Toolbar";
import { StatusBar } from "./StatusBar";
import { PromptEditor } from "./PromptEditor";
import { useStudioStore } from "@/lib/stores/studio-store";

export function StudioLayout() {
  const { activePanel, panels, tokenBalance } = useStudioStore();

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* 상단 툴바 */}
      <Toolbar />
      
      {/* 메인 워크스페이스 */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* 왼쪽 사이드바 */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* 중앙 캔버스 영역 */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col">
              <WebtoonCanvas />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* 오른쪽 편집 패널 */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <div className="h-full flex flex-col bg-white border-l">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-sm">편집 패널</h3>
                {activePanel !== null && (
                  <p className="text-xs text-muted-foreground">
                    패널 {activePanel + 1} / {panels.length}
                  </p>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <PromptEditor />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* 하단 상태바 */}
      <StatusBar />
    </div>
  );
}