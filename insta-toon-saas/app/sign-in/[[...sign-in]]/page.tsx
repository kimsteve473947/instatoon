// import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">로그인</h1>
        <p className="text-muted-foreground">Clerk 설정이 필요합니다</p>
      </div>
    </div>
  );
}