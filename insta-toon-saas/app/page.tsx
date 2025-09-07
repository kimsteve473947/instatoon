import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            인스타툰
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium hover:text-primary">
              가격
            </Link>
            <Link href="/gallery" className="text-sm font-medium hover:text-primary">
              갤러리
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium hover:text-primary"
            >
              로그인
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              무료로 시작하기
            </Link>
          </nav>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="flex-1 flex items-center justify-center py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-8">
              <Sparkles className="mr-2 h-4 w-4" />
              AI로 웹툰 제작이 쉬워집니다
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              인스타그램 웹툰을
              <br />
              <span className="text-primary">AI로 쉽고 빠르게</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              캐릭터 일관성을 유지하면서 프로 수준의 웹툰을 제작하세요.
              Gemini AI를 활용한 강력한 이미지 생성 기능을 경험해보세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
              >
                무료로 시작하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-base font-medium hover:bg-accent hover:text-accent-foreground"
              >
                작품 둘러보기
              </Link>
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

      {/* CTA 섹션 */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            지금 시작하세요
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            무료로 10개의 토큰을 받고 첫 웹툰을 만들어보세요
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
          >
            무료 회원가입
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
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