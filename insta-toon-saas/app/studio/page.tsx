"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CharacterManager } from "@/components/studio/CharacterManager";
import { Wand2, Download, Save, Coins, Sparkles, Image as ImageIcon } from "lucide-react";
import { Character, Panel } from "@/types";

export default function StudioPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [panels, setPanels] = useState<Panel[]>([
    {
      id: "1",
      projectId: "temp",
      order: 1,
      prompt: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [activePanel, setActivePanel] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenBalance] = useState(500000); // 임시 토큰 잔액

  // 패널 추가
  const addPanel = () => {
    const newPanel: Panel = {
      id: `${panels.length + 1}`,
      projectId: "temp",
      order: panels.length + 1,
      prompt: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPanels([...panels, newPanel]);
  };

  // 패널 프롬프트 업데이트
  const updatePanelPrompt = (index: number, prompt: string) => {
    const updatedPanels = [...panels];
    updatedPanels[index].prompt = prompt;
    setPanels(updatedPanels);
  };

  // 이미지 생성
  const generateImage = async (panelIndex: number) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: panels[panelIndex].prompt,
          characterIds: characters.filter(c => c.isFavorite).map(c => c.id),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedPanels = [...panels];
        updatedPanels[panelIndex].imageUrl = data.imageUrl;
        setPanels(updatedPanels);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 일괄 생성
  const generateAll = async () => {
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].prompt && !panels[i].imageUrl) {
        await generateImage(i);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">웹툰 스튜디오</h1>
            <p className="text-muted-foreground">
              AI로 인스타그램 웹툰을 제작하세요
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{tokenBalance.toLocaleString()} 토큰</span>
            </div>
            <Button variant="outline">
              <Save className="mr-2 h-4 w-4" />
              저장
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="characters" className="space-y-6">
        <TabsList>
          <TabsTrigger value="characters">캐릭터 설정</TabsTrigger>
          <TabsTrigger value="panels">패널 제작</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>

        <TabsContent value="characters">
          <CharacterManager
            characters={characters}
            maxCharacters={5}
            onCharacterAdd={(character) => {
              setCharacters([...characters, { ...character, id: `char-${Date.now()}`, userId: "temp", createdAt: new Date(), updatedAt: new Date() } as Character]);
            }}
            onCharacterRemove={(id) => {
              setCharacters(characters.filter(c => c.id !== id));
            }}
            onCharacterToggleFavorite={(id) => {
              setCharacters(characters.map(c => 
                c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
              ));
            }}
          />
        </TabsContent>

        <TabsContent value="panels">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">패널 제작</h2>
              <div className="flex gap-2">
                <Button onClick={addPanel} variant="outline">
                  패널 추가
                </Button>
                <Button onClick={generateAll} disabled={isGenerating}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  일괄 생성
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 패널 목록 */}
              <div className="space-y-4">
                {panels.map((panel, index) => (
                  <Card
                    key={panel.id}
                    className={`cursor-pointer ${activePanel === index ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setActivePanel(index)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">패널 {panel.order}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`prompt-${index}`}>프롬프트</Label>
                          <Textarea
                            id={`prompt-${index}`}
                            value={panel.prompt}
                            onChange={(e) => updatePanelPrompt(index, e.target.value)}
                            placeholder="이 패널에서 표현하고 싶은 장면을 설명하세요..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        
                        {panel.imageUrl ? (
                          <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={panel.imageUrl}
                              alt={`Panel ${panel.order}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        <Button
                          onClick={() => generateImage(index)}
                          disabled={!panel.prompt || isGenerating}
                          className="w-full"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          {panel.imageUrl ? "재생성" : "생성"} (2 토큰)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 활성 패널 편집 */}
              <div className="sticky top-4">
                <Card>
                  <CardHeader>
                    <CardTitle>패널 {panels[activePanel]?.order} 편집</CardTitle>
                    <CardDescription>
                      선택된 캐릭터가 자동으로 적용됩니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {panels[activePanel]?.imageUrl ? (
                      <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-4">
                        <img
                          src={panels[activePanel].imageUrl}
                          alt={`Panel ${panels[activePanel].order}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center mb-4">
                        <div className="text-center">
                          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">이미지가 여기에 표시됩니다</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div>
                        <Label>선택된 캐릭터</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {characters.filter(c => c.isFavorite).map(char => (
                            <span
                              key={char.id}
                              className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                            >
                              {char.name}
                            </span>
                          ))}
                          {characters.filter(c => c.isFavorite).length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              캐릭터를 선택하세요
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isGenerating && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">생성 중...</p>
                          <Progress value={50} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">미리보기</h2>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Instagram 형식으로 다운로드
              </Button>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="space-y-0 border rounded-lg overflow-hidden">
                {panels.map((panel) => (
                  <div key={panel.id} className="aspect-square bg-gray-100">
                    {panel.imageUrl ? (
                      <img
                        src={panel.imageUrl}
                        alt={`Panel ${panel.order}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-gray-500">패널 {panel.order}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}