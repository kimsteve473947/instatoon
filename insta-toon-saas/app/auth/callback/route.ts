import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  // OAuth 제공자에서 에러가 반환된 경우
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/sign-in?error=oauth_error`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!sessionError) {
        // 로그인 성공 - 대시보드로 리다이렉트
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        console.error('Session exchange error:', sessionError)
        return NextResponse.redirect(`${origin}/sign-in?error=session_error`)
      }
    } catch (err) {
      console.error('Unexpected error during auth callback:', err)
      return NextResponse.redirect(`${origin}/sign-in?error=unexpected_error`)
    }
  }

  // 코드가 없는 경우
  return NextResponse.redirect(`${origin}/sign-in?error=no_code`)
}