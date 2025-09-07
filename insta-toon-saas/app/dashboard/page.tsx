import { requireAuth } from "@/lib/supabase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Image, Coins, FolderOpen, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();

  // 사용자 표시 이름 가져오기
  const displayName = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     '사용자';

  // 임시 통계 데이터 (실제로는 DB에서 가져와야 함)
  const stats = {
    tokensUsed: 0,
    tokensTotal: 10,
    projectsCount: 0,
    projectsLimit: 3,
    charactersCount: 0,
    charactersLimit: 1,
    generationsToday: 0,
  };

  const tokenUsagePercentage = (stats.tokensUsed / stats.tokensTotal) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          안녕하세요, <span className="font-semibold text-foreground">{displayName}</span>님! 웹툰 제작을 시작하세요.
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