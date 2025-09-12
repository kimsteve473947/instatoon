'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { createBrowserClient } from '@supabase/ssr';
import { Check, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const plans = [
    {
      name: "무료",
      description: "취미로 시작하는 분들께",
      price: "₩0",
      features: [
        { text: "10 토큰 제공", included: true },
        { text: "캐릭터 1개 등록", included: true },
        { text: "프로젝트 3개", included: true },
        { text: "기본 템플릿", included: true },
        { text: "워터마크 포함", included: true },
        { text: "무제한 프로젝트", included: false },
        { text: "우선 지원", included: false },
        { text: "프리미엄 템플릿", included: false }
      ],
      buttonText: "무료 시작",
      buttonVariant: "outline" as const,
      popular: false,
      planId: "FREE"
    },
    {
      name: "개인",
      description: "정기적으로 창작하는 분들께",
      price: "₩30,000",
      priceUnit: "/월",
      features: [
        { text: "50만 토큰 제공", included: true },
        { text: "캐릭터 3개 등록", included: true },
        { text: "무제한 프로젝트", included: true },
        { text: "모든 기본 템플릿", included: true },
        { text: "워터마크 제거", included: true },
        { text: "프리미엄 템플릿", included: true },
        { text: "우선 지원", included: false },
        { text: "API 접근", included: false }
      ],
      buttonText: "선택하기",
      buttonVariant: "default" as const,
      popular: true,
      planId: "PERSONAL"
    },
    {
      name: "헤비유저",
      description: "전문 창작자를 위한",
      price: "₩100,000",
      priceUnit: "/월",
      features: [
        { text: "200만 토큰 제공", included: true },
        { text: "캐릭터 5개 등록", included: true },
        { text: "무제한 프로젝트", included: true },
        { text: "모든 템플릿", included: true },
        { text: "워터마크 제거", included: true },
        { text: "프리미엄 템플릿", included: true },
        { text: "우선 지원", included: true },
        { text: "API 접근", included: true }
      ],
      buttonText: "선택하기",
      buttonVariant: "default" as const,
      popular: false,
      planId: "HEAVY"
    }
  ];

  const handlePlanSelection = async (planName: string, planId: string) => {
    if (planName === "무료") {
      router.push('/studio');
      return;
    }

    // 로그인 확인
    if (!user) {
      alert("결제를 진행하려면 먼저 로그인해주세요.");
      router.push('/sign-in');
      return;
    }

    setProcessingPlan(planId);
    
    try {
      console.log('Starting payment process for plan:', planId);
      console.log('User:', user);
      
      // 빌링키 등록 API 호출
      const response = await fetch('/api/payments/billing-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || '고객',
        }),
      });

      console.log('API Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || '결제 요청에 실패했습니다');
      }

      // 토스페이먼츠 SDK 로드
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      );

      console.log('TossPayments SDK loaded, requesting billing auth...');
      console.log('Billing auth data:', data.billingAuthRequest);

      // 빌링키 발급 요청
      await tossPayments.requestBillingAuth('카드', {
        customerKey: data.billingAuthRequest.customerKey,
        successUrl: data.billingAuthRequest.successUrl,
        failUrl: data.billingAuthRequest.failUrl,
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      alert(error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            인스타툰과 함께 시작하세요
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI 기반 웹툰 제작 도구로 여러분의 창작 여정을 시작하세요. 
            언제든 플랜을 변경할 수 있습니다.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden ${
                plan.popular ? 'border-purple-200 shadow-lg scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full flex items-center gap-1">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-medium">인기</span>
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.priceUnit && <span className="text-muted-foreground">{plan.priceUnit}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${!feature.included ? 'text-gray-400' : ''}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${
                    plan.popular ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : ''
                  }`}
                  variant={plan.buttonVariant}
                  disabled={processingPlan === plan.planId}
                  onClick={() => handlePlanSelection(plan.name, plan.planId)}
                >
                  {processingPlan === plan.planId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      처리 중...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enterprise Plan */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">기업 맞춤 플랜</h2>
                <p className="text-muted-foreground">
                  대량 제작이 필요한 기업을 위한 맞춤형 솔루션을 제공합니다
                </p>
              </div>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => window.open('mailto:contact@instatoon.com', '_blank')}
              >
                문의하기
              </Button>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">안전한 결제</h3>
            <p className="text-muted-foreground">
              토스페이먼츠를 통한 안전한 결제 처리 • 언제든 구독 취소 가능 • 30일 환불 보장
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}