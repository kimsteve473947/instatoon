'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Zap, Shield, Star, Users, Check, Coins, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "@/components/auth/AuthModal";
import { createBrowserClient } from '@supabase/ssr';

export default function Home() {
  const router = useRouter();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 초기 로그인 상태 체크
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };

    checkUser();

    // 로그인 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleStartClick = () => {
    if (isLoggedIn) {
      // 이미 로그인된 경우 바로 스튜디오로
      router.push('/studio');
    } else {
      // 로그인 모달 띄우기
      setIsAuthModalOpen(true);
    }
  };
  return (
    <div className="flex flex-col min-h-screen">

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
              세상의 모든 디자인은
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                인스타툰으로 완성
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              <strong>웹툰부터 인스타그램 콘텐츠까지</strong> 템플릿으로 쉽고 간편하게 시작해보세요!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 rounded-full"
                onClick={handleStartClick}
                disabled={isLoggedIn === null} // 로딩 중일 때 비활성화
              >
                {isLoggedIn === null ? (
                  "로딩 중..."
                ) : isLoggedIn ? (
                  "스튜디오 열기"
                ) : (
                  "바로 시작하기"
                )}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 rounded-full border-2 hover:bg-muted/50">
                <Link href="/gallery">
                  갤러리 보기
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

      {/* 템플릿 쇼케이스 섹션 */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              다양한 템플릿으로 쉽게 시작하세요
            </h2>
            <p className="text-muted-foreground text-lg">
              전문 디자이너가 제작한 웹툰 템플릿을 자유롭게 커스터마이징하세요
            </p>
          </div>
          
          {/* 템플릿 미리보기 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {/* 템플릿 카드들 */}
            <div className="relative group cursor-pointer">
              <div className="aspect-[3/4] bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg overflow-hidden">
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="text-xs text-purple-600 font-semibold">로맨스 웹툰</div>
                  <div className="space-y-2">
                    <div className="h-2 bg-purple-300 rounded-full w-3/4"></div>
                    <div className="h-2 bg-purple-200 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg" />
            </div>
            
            <div className="relative group cursor-pointer">
              <div className="aspect-[3/4] bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg overflow-hidden">
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="text-xs text-blue-600 font-semibold">액션 웹툰</div>
                  <div className="space-y-2">
                    <div className="h-2 bg-blue-300 rounded-full w-2/3"></div>
                    <div className="h-2 bg-blue-200 rounded-full w-3/4"></div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg" />
            </div>
            
            <div className="relative group cursor-pointer">
              <div className="aspect-[3/4] bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg overflow-hidden">
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="text-xs text-green-600 font-semibold">일상 웹툰</div>
                  <div className="space-y-2">
                    <div className="h-2 bg-green-300 rounded-full w-1/2"></div>
                    <div className="h-2 bg-green-200 rounded-full w-2/3"></div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg" />
            </div>
            
            <div className="relative group cursor-pointer">
              <div className="aspect-[3/4] bg-gradient-to-br from-orange-100 to-yellow-100 rounded-lg overflow-hidden">
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="text-xs text-orange-600 font-semibold">코미디 웹툰</div>
                  <div className="space-y-2">
                    <div className="h-2 bg-orange-300 rounded-full w-3/4"></div>
                    <div className="h-2 bg-orange-200 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-lg" />
            </div>
          </div>
          
          <div className="text-center">
            <Button size="lg" variant="outline" asChild className="text-lg px-8 rounded-full border-2 hover:bg-muted/50">
              <Link href="/gallery">
                더 많은 템플릿 보기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            왜 인스타툰을 선택해야 할까요?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI 캐릭터 일관성</h3>
              <p className="text-muted-foreground">
                한 번 등록한 캐릭터로 여러 편의 웹툰을 제작할 수 있어 스토리 연결성을 유지합니다
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">5분만에 완성</h3>
              <p className="text-muted-foreground">
                템플릿을 선택하고 텍스트만 입력하면 전문가급 웹툰이 자동으로 생성됩니다
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">무료로 시작</h3>
              <p className="text-muted-foreground">
                회원가입만 하면 10개의 무료 토큰으로 바로 웹툰 제작을 시작할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 가격 섹션 */}
      <section className="py-20" id="pricing">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            합리적인 가격으로 시작하세요
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            창작 규모에 맞는 플랜을 선택하세요
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/pricing')}>
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
                <Button 
                  className="w-full mt-6 rounded-full" 
                  variant="outline" 
                  onClick={handleStartClick}
                  disabled={isLoggedIn === null}
                >
                  {isLoggedIn === null ? "로딩 중..." : isLoggedIn ? "스튜디오 열기" : "무료 시작"}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-purple-500 relative cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/pricing')}>
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
                <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full" asChild>
                  <Link href="/sign-in">선택하기</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/pricing')}>
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
                <Button className="w-full mt-6 rounded-full" variant="outline" asChild>
                  <Link href="/sign-in">선택하기</Link>
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
          <Button 
            size="lg" 
            variant="secondary" 
            className="rounded-full px-8"
            onClick={handleStartClick}
            disabled={isLoggedIn === null}
          >
            {isLoggedIn === null ? "로딩 중..." : isLoggedIn ? "스튜디오 열기" : "무료로 시작하기"}
            <ArrowRight className="ml-2 h-5 w-5" />
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

      {/* 로그인 모달 - 로그인 안된 사용자에게만 표시 */}
      {!isLoggedIn && (
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)}
          redirectTo="/studio"
        />
      )}
    </div>
  );
}