'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FcGoogle } from 'react-icons/fc'
import { RiKakaoTalkFill } from 'react-icons/ri'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SignInContent() {
  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'kakao' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // URL 파라미터에서 에러 확인
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'auth_failed': '로그인에 실패했습니다. 다시 시도해주세요.',
        'oauth_error': 'OAuth 인증 중 오류가 발생했습니다.',
        'session_error': '세션 생성에 실패했습니다.',
        'unexpected_error': '예기치 않은 오류가 발생했습니다.',
        'no_code': '인증 코드가 없습니다.',
        'kakao_auth_failed': '카카오 로그인에 실패했습니다.'
      }
      setError(errorMessages[errorParam] || '로그인 중 오류가 발생했습니다.')
    }
  }, [searchParams])

  const handleSocialSignIn = async (provider: 'google' | 'kakao') => {
    setLoading(true)
    setLoadingProvider(provider)
    setError(null)

    try {
      // Supabase OAuth 사용 (카카오도 네이티브 지원)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            prompt: 'select_account', // 구글 계정 선택 화면 강제 표시
            access_type: 'offline'
          } : undefined,
        },
      })

      if (error) throw error
      
      // 성공 애니메이션 표시
      setSuccess(true)
      setTimeout(() => {
        // OAuth 리다이렉트가 자동으로 처리됨
      }, 500)
    } catch (error: any) {
      console.error('OAuth error:', error)
      setError(error.message || '로그인 중 오류가 발생했습니다.')
      setLoading(false)
      setLoadingProvider(null)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:20px_20px]" />
        <motion.div
          className="absolute -left-10 top-20 h-72 w-72 rounded-full bg-purple-300 opacity-20 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-pink-300 opacity-20 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-300 opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* 로그인 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-3xl bg-white/80 p-8 shadow-2xl backdrop-blur-xl">
          {/* 상단 장식 */}
          <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600" />
          
          {/* 로고 및 타이틀 */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mb-4 inline-flex"
            >
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 blur-xl" />
                <div className="relative rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-3">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-900"
            >
              인스타툰
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 text-sm text-gray-600"
            >
              AI로 쉽고 빠르게 웹툰을 제작하세요
            </motion.p>
          </div>

          {/* 에러 메시지 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 rounded-xl bg-red-50 p-3 text-center"
              >
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 성공 메시지 */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-4 rounded-xl bg-green-50 p-3 text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-600">로그인 성공! 리다이렉트 중...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 로그인 버튼들 */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSocialSignIn('google')}
              disabled={loading}
              className={`relative flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
                loadingProvider === 'google' ? 'ring-2 ring-purple-500 ring-offset-2' : ''
              }`}
            >
              {loadingProvider === 'google' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  <span className="text-purple-600">Google 계정 연결 중...</span>
                </>
              ) : (
                <>
                  <FcGoogle className="text-xl" />
                  <span>구글로 시작하기</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSocialSignIn('kakao')}
              disabled={loading}
              className={`relative flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3.5 text-sm font-medium text-[#000000] shadow-sm transition-all hover:bg-[#FDD835] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
                loadingProvider === 'kakao' ? 'ring-2 ring-yellow-600 ring-offset-2' : ''
              }`}
            >
              {loadingProvider === 'kakao' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-700" />
                  <span className="text-yellow-700">카카오 계정 연결 중...</span>
                </>
              ) : (
                <>
                  <RiKakaoTalkFill className="text-xl" />
                  <span>카카오로 시작하기</span>
                </>
              )}
            </motion.button>
          </div>

          {/* 구분선 */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-xs text-gray-500">간편 로그인</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* 추가 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span>🎁</span>
              <span>첫 가입 시 무료 10토큰 제공</span>
            </div>
            
            <p className="text-center text-xs text-gray-400">
              계속 진행하면{' '}
              <Link href="/terms" className="text-purple-600 underline">
                서비스 이용약관
              </Link>{' '}
              및{' '}
              <Link href="/privacy" className="text-purple-600 underline">
                개인정보 처리방침
              </Link>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>

        {/* 하단 링크 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <Link
            href="/"
            className="text-sm text-gray-600 transition-colors hover:text-purple-600"
          >
            ← 메인으로 돌아가기
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}