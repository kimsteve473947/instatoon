"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 5초 후 자동으로 대시보드로 이동
    const timer = setTimeout(() => {
      router.push("/dashboard/billing");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">구독이 완료되었습니다!</CardTitle>
          <CardDescription>
            정기결제가 성공적으로 등록되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            이제 인스타툰 제작을 시작할 수 있습니다.
            매월 자동으로 결제되며, 언제든지 취소할 수 있습니다.
          </p>
          <div className="flex gap-2">
            <Button 
              className="w-full" 
              onClick={() => router.push("/dashboard")}
            >
              대시보드로 이동
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push("/dashboard/billing")}
            >
              구독 관리
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            5초 후 자동으로 구독 관리 페이지로 이동합니다...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}