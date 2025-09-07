import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, Star, Users, Palette, Check, Coins, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-1.5">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">인스타툰</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium hover:text-primary transition-colors">
              가격
            </Link>
            <Link href="/gallery" className="text-sm font-medium hover:text-primary transition-colors">
              갤러리
            </Link>
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
              로그인
            </Link>
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Link href="/sign-up">
                무료로 시작하기
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="relative flex-1 flex items-center justify-center py-20 overflow-hidden">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-50" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-1.5 text-sm font-medium mb-8 border border-purple-200">
              <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">
                Gemini 2.5 Flash로 더 빠르고 정확하게
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              인스타그램 웹툰을
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI로 5분만에 제작
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              <strong>캐릭터 일관성 99% 유지</strong>하면서 프로 수준의 웹툰을 제작하세요.
              한국 웹툰 시장에 최적화된 AI 툴로 창작의 자유를 경험하세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8">
                <Link href="/sign-up">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link href="/studio">
                  체험해보기
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9/5 평점</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>10,000+ 창작자</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4" />
                <span>무료 10토큰 제공</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            왜 인스타툰인가요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">캐릭터 일관성</h3>
              <p className="text-muted-foreground">
                한 번 생성한 캐릭터를 계속 사용할 수 있어 일관된 스토리텔링이 가능합니다
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">빠른 제작</h3>
              <p className="text-muted-foreground">
                AI가 즉시 이미지를 생성하므로 몇 분 만에 웹툰을 완성할 수 있습니다
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">합리적인 가격</h3>
              <p className="text-muted-foreground">
                토큰 기반 시스템으로 사용한 만큼만 비용을 지불합니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 가격 섹션 */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            합리적인 가격으로 시작하세요
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            창작 규모에 맞는 플랜을 선택하세요
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>무료</CardTitle>
                <CardDescription>취미로 시작하는 분들께</CardDescription>
                <div className="text-3xl font-bold mt-4">₩0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">10 토큰 제공</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">캐릭터 1개 등록</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">프로젝트 3개</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="/sign-up">무료 시작</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1 rounded-full">
                인기
              </div>
              <CardHeader>
                <CardTitle>개인</CardTitle>
                <CardDescription>정기적으로 창작하는 분들께</CardDescription>
                <div className="text-3xl font-bold mt-4">₩30,000<span className="text-base font-normal">/월</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">50만 토큰 제공</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">캐릭터 3개 등록</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">무제한 프로젝트</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" asChild>
                  <Link href="/sign-up">선택하기</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>헤비유저</CardTitle>
                <CardDescription>전문 창작자를 위한</CardDescription>
                <div className="text-3xl font-bold mt-4">₩100,000<span className="text-base font-normal">/월</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">200만 토큰 제공</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">캐릭터 5개 등록</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">우선 지원</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline" asChild>
                  <Link href="/sign-up">선택하기</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA 섹션 */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            지금 바로 창작을 시작하세요
          </h2>
          <p className="text-xl text-white/90 mb-8">
            10개의 무료 토큰으로 첫 웹툰을 만들어보세요
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">
              무료로 시작하기
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 인스타툰. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                이용약관
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}