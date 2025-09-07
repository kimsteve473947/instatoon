// import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Image, Coins, FolderOpen, Sparkles, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatNumber, formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  // const { userId } = await auth();
  const userId = "temp-user-id"; // 임시 사용자 ID
  
  // if (!userId) {
  //   redirect("/sign-in");
  // }

  // 임시 데이터 (DB 연결 전)
  const user = null;
  /*
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      subscription: true,
      projects: {
        orderBy: { updatedAt: "desc" },
        take: 6,
      },
      characters: true,
      generations: {
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
    },
  });
  */

  // 임시 데이터 사용

  // 임시 통계 데이터
  const stats = {
    tokensUsed: 23,
    tokensTotal: 500000,
    projectsCount: 3,
    projectsLimit: Infinity,
    charactersCount: 2,
    charactersLimit: 5,
    generationsToday: 5,
  };

  const tokenUsagePercentage = (stats.tokensUsed / stats.tokensTotal) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          웹툰 제작을 시작하고 프로젝트를 관리하세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">토큰 사용량</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tokensUsed}/{stats.tokensTotal}
            </div>
            <Progress value={tokenUsagePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.tokensTotal - stats.tokensUsed}개 남음
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">프로젝트</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.projectsCount}/{stats.projectsLimit}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.projectsLimit - stats.projectsCount}개 더 생성 가능
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">캐릭터</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.charactersCount}/{stats.charactersLimit}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.charactersLimit - stats.charactersCount}개 더 생성 가능
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 생성</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.generationsToday}</div>
            <p className="text-xs text-muted-foreground mt-2">이미지 생성됨</p>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 시작 섹션 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>새 프로젝트</CardTitle>
            <CardDescription>
              웹툰 프로젝트를 생성하고 제작을 시작하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/studio/new">
              <Button className="w-full">
                프로젝트 만들기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>캐릭터 관리</CardTitle>
            <CardDescription>
              일관성 있는 캐릭터를 생성하고 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/characters">
              <Button variant="outline" className="w-full">
                캐릭터 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>토큰 충전</CardTitle>
            <CardDescription>
              더 많은 이미지를 생성하려면 토큰을 충전하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/billing">
              <Button variant="outline" className="w-full">
                충전하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 최근 프로젝트 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">최근 프로젝트</h2>
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              모두 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">아직 프로젝트가 없습니다</p>
              <Link href="/studio">
                <Button>
                  첫 프로젝트 만들기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}