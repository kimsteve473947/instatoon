'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Palette, 
  User, 
  Settings, 
  CreditCard, 
  LogOut,
  ChevronDown,
  LayoutDashboard,
  FolderOpen,
  Sparkles
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // 사용자 정보 가져오기
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    try {
      // 먼저 로컬 세션 클리어
      await supabase.auth.signOut()
      
      // 모든 쿠키 제거를 위한 추가 처리
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // 홈으로 리다이렉트
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // 사용자 이름 또는 이메일에서 이니셜 추출
  const getUserInitials = () => {
    if (!user) return 'U'
    const name = user.user_metadata?.full_name || user.user_metadata?.name
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user.email?.slice(0, 2).toUpperCase() || 'U'
  }

  // 사용자 표시 이름 가져오기
  const getUserDisplayName = () => {
    if (!user) return ''
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           '사용자'
  }

  // 특정 페이지에서는 헤더를 숨김
  const hideHeader = ['/sign-in', '/sign-up', '/studio'].includes(pathname)
  if (hideHeader) return null

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-1.5">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">인스타툰</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium hover:text-primary transition-colors">
                  템플릿
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/gallery?category=romance">💕 로맨스 웹툰</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gallery?category=fantasy">🔮 판타지 웹툰</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gallery?category=action">⚔️ 액션 웹툰</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gallery?category=comedy">😂 코미디 웹툰</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gallery?category=drama">🎭 드라마 웹툰</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link 
              href="/gallery" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              갤러리
            </Link>

            <Link 
              href="/pricing" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              가격안내
            </Link>
            
            <Link 
              href="/pricing" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              대시보드
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 hover:bg-muted px-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user.user_metadata?.avatar_url || user.user_metadata?.picture} 
                      alt={getUserDisplayName()} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[150px] truncate">
                    {getUserDisplayName()}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      안녕하세요, {getUserDisplayName()}님!
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>대시보드</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/studio" className="cursor-pointer">
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>스튜디오</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/projects" className="cursor-pointer">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <span>내 프로젝트</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>프로필</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>결제 관리</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>설정</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/sign-in">로그인</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full px-6">
                <Link href="/studio">
                  가입하기
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}