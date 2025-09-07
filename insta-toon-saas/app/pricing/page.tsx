"use client";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

const plans = [
  {
    name: "무료",
    price: 0,
    tokens: 30,
    images: 3,
    description: "웹툰 제작을 시작해보세요",
    features: [
      "월 30 토큰 (3이미지)",
      "캐릭터 1개 등록",
      "프로젝트 3개까지",
      "기본 해상도",
      "커뮤니티 지원",
    ],
    limitations: [
      "고해상도 출력",
      "우선 생성 대기열",
      "상업적 이용",
      "1:1 지원",
    ],
    cta: "무료로 시작",
    href: "/sign-up",
    planId: null,
    popular: false,
  },
  {
    name: "개인",
    price: 30000,
    tokens: 6000,
    images: 600,
    description: "개인 창작자를 위한 플랜",
    features: [
      "월 6,000 토큰 (600이미지)",
      "캐릭터 3개 등록",
      "무제한 프로젝트",
      "고해상도 출력",
      "이메일 지원",
      "상업적 이용 가능",
    ],
    limitations: [
      "우선 생성 대기열",
      "1:1 전담 지원",
    ],
    cta: "구독하기",
    planId: "personal",
    popular: true,
  },
  {
    name: "헤비유저",
    price: 100000,
    tokens: 25000,
    images: 2500,
    description: "전문 창작자를 위한 플랜",
    features: [
      "월 25,000 토큰 (2,500이미지)",
      "캐릭터 5개 등록",
      "무제한 프로젝트",
      "최고 해상도 출력",
      "우선 생성 대기열",
      "상업적 이용 가능",
      "1:1 지원",
    ],
    limitations: [
      "API 접근",
    ],
    cta: "구독하기",
    planId: "heavy",
    popular: false,
  },
  {
    name: "기업",
    price: 200000,
    tokens: 60000,
    images: 6000,
    description: "팀과 기업을 위한 플랜",
    features: [
      "월 60,000 토큰 (6,000이미지)",
      "무제한 캐릭터 등록",
      "무제한 프로젝트",
      "최고 해상도 출력",
      "최우선 생성 대기열",
      "상업적 이용 가능",
      "전담 매니저",
      "API 접근",
      "맞춤 기능 개발",
    ],
    limitations: [],
    cta: "문의하기",
    href: "/contact",
    planId: null,
    popular: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId);
      
      // 토스페이먼츠 SDK 로드
      const { loadTossPayments } = await import("@tosspayments/payment-sdk");
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      
      // 빌링키 발급 요청 (로그인된 사용자 정보 자동 사용)
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planId
        }),
      });
      
      const data = await response.json();
      console.log("Full API Response:", JSON.stringify(data, null, 2));
      
      if (!data.success) {
        throw new Error(data.error || "결제 요청 실패");
      }
      
      // 응답 구조 확인
      const billingData = data.billingAuthRequest || data.billingRequest;
      console.log("Billing Data:", JSON.stringify(billingData, null, 2));
      
      if (!billingData) {
        throw new Error("빌링 요청 데이터가 없습니다");
      }
      
      if (!billingData.customerKey) {
        throw new Error("customerKey가 없습니다: " + JSON.stringify(billingData));
      }
      
      // 빌링키 발급 페이지로 이동 (올바른 토스페이먼츠 SDK 형식)
      console.log("Requesting billing auth with:", billingData);
      await tossPayments.requestBillingAuth("카드", {
        customerKey: billingData.customerKey,
        successUrl: billingData.successUrl,
        failUrl: billingData.failUrl,
      });
      
    } catch (error) {
      console.error("Payment error:", error);
      alert(`결제 요청 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          합리적인 가격으로 시작하세요
        </h1>
        <p className="text-xl text-muted-foreground">
          토큰 기반 과금으로 사용한 만큼만 비용을 지불합니다
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular ? "border-primary shadow-lg scale-105" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  인기
                </span>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <span className="text-4xl font-bold">
                  ₩{plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground">/월</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {plan.tokens.toLocaleString()} 토큰/월
                {plan.images && (
                  <span className="block text-xs mt-1">
                    (약 {plan.images.toLocaleString()}이미지 생성 가능)
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
                
                {plan.limitations.map((limitation) => (
                  <div key={limitation} className="flex items-start gap-2">
                    <X className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter>
              {plan.planId ? (
                <Button
                  onClick={() => handleSubscribe(plan.planId as string)}
                  disabled={loading === plan.planId}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {loading === plan.planId ? "처리 중..." : plan.cta}
                </Button>
              ) : (
                <Link href={plan.href || "/"} className="w-full">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">토큰 사용량 안내</h2>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>기본 이미지 생성 (1024x1024)</span>
                  <span className="font-medium">10 토큰</span>
                </div>
                <div className="flex justify-between">
                  <span>복잡한 프롬프트 (500자 이상)</span>
                  <span className="font-medium">+5 토큰</span>
                </div>
                <div className="flex justify-between">
                  <span>레퍼런스 이미지 사용 (개당)</span>
                  <span className="font-medium">+3 토큰</span>
                </div>
                <div className="flex justify-between">
                  <span>고해상도 출력 (2048x2048)</span>
                  <span className="font-medium">+10 토큰</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                <p>토큰 가격: 1토큰 = 약 5원</p>
                <p className="text-xs mt-1">* Google Gemini API 실제 비용 기반 책정</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>모든 플랜은 언제든지 변경하거나 취소할 수 있습니다</p>
        <p>VAT 별도 · 법인카드 결제 가능</p>
      </div>
    </div>
  );
}