/* AI Character Tab UI Fix - MiriCanvasStudioUltimate.tsx에서 교체할 코드 */

// 현재 line 2428-2445 구간을 다음 코드로 교체:

{activeTab === 'ai-character' && (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        캐릭터 설명 <span className="text-red-500">*</span>
      </label>
      <Textarea 
        value={characterDescription}
        onChange={(e) => setCharacterDescription(e.target.value.substring(0, 300))}
        placeholder="캐릭터의 외모와 특징을 설명해주세요..."
        className="min-h-[100px] text-sm resize-none border-slate-200"
        maxLength={300}
      />
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>자세히 입력할수록 좋은 캐릭터가 생성돼요!</span>
        <span>{characterDescription.length}/300</span>
      </div>
    </div>

    {/* 가로 세로 비율 (1:1 고정 표시) */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        가로 세로 비율
      </label>
      <div className="p-3 border-2 border-green-300 bg-green-50 rounded-lg text-center">
        <div className="text-lg font-medium text-green-700">1:1</div>
      </div>
    </div>

    {/* 캐릭터 생성 버튼 */}
    <Button 
      onClick={handleGenerateCharacter}
      disabled={isGeneratingCharacter || !characterDescription.trim()}
      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
      size="sm"
    >
      {isGeneratingCharacter ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          캐릭터 생성
        </>
      )}
    </Button>

    {/* 생성된 캐릭터 이미지 표시 */}
    {generatedCharacterUrl && (
      <div className="space-y-3">
        <div className="relative">
          <img
            src={generatedCharacterUrl}
            alt="생성된 캐릭터"
            className="w-full rounded-lg border border-slate-200"
          />
        </div>
        
        {/* 캐릭터 추가 버튼 */}
        <Button
          onClick={handleAddCharacterToDB}
          disabled={isAddingCharacterToDB}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          size="sm"
        >
          {isAddingCharacterToDB ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              캐릭터 추가 중...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              캐릭터 추가하기
            </>
          )}
        </Button>
      </div>
    )}
  </div>
)}