"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, AlertTriangle } from "lucide-react";

export default function BillingErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const errorMessage = searchParams.get("message") || "결제 처리 중 문제가 발생했습니다.";
  const errorCode = searchParams.get("code");

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">결제 실패</CardTitle>
          <CardDescription>
            결제 처리 중 문제가 발생했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
          
          {errorCode && (
            <p className="text-center text-xs text-muted-foreground mb-4">
              에러 코드: {errorCode}
            </p>
          )}
          
          <p className="text-center text-sm text-muted-foreground">
            일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요.
            문제가 계속되면 고객센터로 문의해주세요.
          </p>
          <div className="flex gap-2">
            <Button 
              className="w-full" 
              onClick={() => router.push("/dashboard/billing")}
            >
              다시 시도
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              대시보드로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}