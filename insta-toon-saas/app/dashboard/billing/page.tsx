"use client";

import { useState, useEffect } from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Check, AlertCircle, Sparkles, Zap, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 구독 플랜 정보
const PLANS = {
  PERSONAL: {
    id: "PERSONAL",
    name: "개인",
    price: 30000,
    tokens: 6000,
    characters: 3,
    features: [
      "월 600장 이미지 생성",
      "캐릭터 3개 등록",
      "무제한 프로젝트",
      "이메일 지원",
    ],
    icon: Sparkles,
    color: "bg-blue-500",
  },
  HEAVY: {
    id: "HEAVY",
    name: "헤비유저",
    price: 100000,
    tokens: 25000,
    characters: 5,
    features: [
      "월 2,500장 이미지 생성",
      "캐릭터 5개 등록",
      "무제한 프로젝트",
      "우선 지원",
      "고해상도 출력",
    ],
    icon: Zap,
    color: "bg-purple-500",
    popular: true,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "기업",
    price: 200000,
    tokens: 60000,
    characters: Infinity,
    features: [
      "월 6,000장 이미지 생성",
      "무제한 캐릭터 등록",
      "무제한 프로젝트",
      "전담 지원",
      "고해상도 출력",
      "API 액세스",
    ],
    icon: Building2,
    color: "bg-gradient-to-r from-purple-500 to-blue-500",
  },
};

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionData();
    fetchPaymentHistory();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch("/api/payments/history");
      const data = await res.json();
      setPaymentHistory(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      // 빌링키 등록 요청
      const res = await fetch("/api/payments/billing-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "결제 요청 실패");
      }

      // 토스페이먼츠 결제창 열기
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      );

      // v2 API 발급 요청 데이터
      const { billingAuthRequest } = data;
      
      await tossPayments.requestBillingAuth("카드", {
        customerKey: billingAuthRequest.customerKey,
        successUrl: billingAuthRequest.successUrl,
        failUrl: billingAuthRequest.failUrl,
        customerEmail: billingAuthRequest.customerEmail,
        customerName: billingAuthRequest.customerName,
      });
    } catch (error) {
      console.error("Payment error:", error);
      alert("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("정말 구독을 취소하시겠습니까? 현재 결제 기간까지는 서비스를 이용할 수 있습니다.")) {
      return;
    }

    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
      });

      if (res.ok) {
        alert("구독이 취소되었습니다. 현재 결제 기간까지 서비스를 이용할 수 있습니다.");
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Cancel subscription error:", error);
      alert("구독 취소 중 오류가 발생했습니다.");
    }
  };

  const usagePercentage = usage ? (usage.used / usage.total) * 100 : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">구독 및 결제</h1>
        <p className="text-muted-foreground">
          플랜을 선택하고 AI 웹툰 제작을 시작하세요
        </p>
      </div>

      {/* 현재 구독 상태 */}
      {subscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>현재 구독 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">현재 플랜</p>
                <p className="text-2xl font-bold">
                  {PLANS[subscription.plan as keyof typeof PLANS]?.name || "없음"}
                </p>
              </div>
              <Badge variant={subscription.cancelAtPeriodEnd ? "destructive" : "default"}>
                {subscription.cancelAtPeriodEnd ? "취소 예정" : "활성"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>토큰 사용량</span>
                <span>{usage?.used || 0} / {usage?.total || 0}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                약 {usage?.estimatedImagesRemaining || 0}장의 이미지를 더 생성할 수 있습니다
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">결제일</p>
                <p className="font-medium">
                  {subscription.currentPeriodStart &&
                    format(new Date(subscription.currentPeriodStart), "PPP", { locale: ko })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">다음 결제일</p>
                <p className="font-medium">
                  {subscription.currentPeriodEnd &&
                    format(new Date(subscription.currentPeriodEnd), "PPP", { locale: ko })}
                </p>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  구독이 {format(new Date(subscription.currentPeriodEnd), "PPP", { locale: ko })}에 종료됩니다.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          {!subscription.cancelAtPeriodEnd && subscription.plan !== "FREE" && (
            <CardFooter>
              <Button variant="outline" onClick={handleCancelSubscription}>
                구독 취소
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* 플랜 선택 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">플랜 선택</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription?.plan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "border-purple-500 shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    인기
                  </Badge>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-8 w-8 text-purple-500" />
                    {isCurrentPlan && (
                      <Badge variant="secondary">현재 플랜</Badge>
                    )}
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold">
                      ₩{plan.price.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">/월</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || loading}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {loading && selectedPlan === plan.id
                      ? "처리 중..."
                      : isCurrentPlan
                      ? "현재 플랜"
                      : "선택하기"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 결제 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-2">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payment.createdAt), "PPP", { locale: ko })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {payment.amount > 0 ? "+" : ""}₩{Math.abs(payment.amount).toLocaleString()}
                    </p>
                    <Badge variant={payment.status === "COMPLETED" ? "default" : "secondary"}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              결제 내역이 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}