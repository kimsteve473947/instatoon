import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imageGenerationService, characterConsistencyManager } from "@/lib/ai/gemini-client";
import { tokenManager } from "@/lib/subscription/token-manager";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { prompt, characterIds, projectId, panelId, settings } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "프롬프트가 필요합니다" },
        { status: 400 }
      );
    }

    // 토큰 잔액 확인
    const balance = await tokenManager.getBalance(userId);
    const estimatedTokens = imageGenerationService.estimateTokens(prompt, !!characterIds?.length);
    
    if (balance < estimatedTokens) {
      return NextResponse.json(
        { success: false, error: "토큰이 부족합니다", required: estimatedTokens, balance },
        { status: 402 }
      );
    }

    // 캐릭터 설명 가져오기
    let characterDescriptions;
    if (characterIds && characterIds.length > 0) {
      const characters = await prisma.character.findMany({
        where: {
          id: { in: characterIds },
          userId,
        },
      });
      
      characterDescriptions = new Map();
      characters.forEach(char => {
        characterDescriptions.set(char.id, char.description);
        characterConsistencyManager.registerCharacter(char.id, char.description);
      });
    }

    // 프롬프트 개선
    const improvedPrompt = await imageGenerationService.improvePrompt(prompt);

    // 이미지 생성
    const result = await imageGenerationService.generateFromText(
      improvedPrompt,
      characterDescriptions
    );

    // 토큰 차감
    const tokenUsed = await tokenManager.useTokens(userId, result.tokensUsed);
    
    if (!tokenUsed) {
      return NextResponse.json(
        { success: false, error: "토큰 차감 실패" },
        { status: 500 }
      );
    }

    // 생성 기록 저장
    const generation = await prisma.generation.create({
      data: {
        userId,
        projectId: projectId || null,
        panelId: panelId || null,
        characterId: characterIds?.[0] || null,
        prompt: improvedPrompt,
        imageUrl: result.imageUrl,
        tokensUsed: result.tokensUsed,
        model: "gemini-pro",
      },
    });

    // 패널 업데이트 (있는 경우)
    if (panelId) {
      await prisma.panel.update({
        where: { id: panelId },
        data: {
          imageUrl: result.imageUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      tokensUsed: result.tokensUsed,
      generationId: generation.id,
      remainingTokens: balance - result.tokensUsed,
    });

  } catch (error) {
    console.error("Generation API error:", error);
    return NextResponse.json(
      { success: false, error: "이미지 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 생성 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "10");

    const generations = await prisma.generation.findMany({
      where: {
        userId,
        ...(projectId && { projectId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        character: true,
        project: true,
      },
    });

    return NextResponse.json({
      success: true,
      generations,
    });

  } catch (error) {
    console.error("Get generations error:", error);
    return NextResponse.json(
      { success: false, error: "생성 기록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}