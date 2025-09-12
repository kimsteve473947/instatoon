import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserStorage, canUploadFile, formatBytes } from '@/lib/storage/storage-manager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // 사용자 ID 가져오기
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', user.id)
      .single()
    
    if (!userData) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 스토리지 정보 가져오기
    const storage = await getUserStorage(userData.id)
    
    return NextResponse.json({
      usedBytes: storage.used_bytes,
      maxBytes: storage.max_bytes,
      remainingBytes: storage.max_bytes - storage.used_bytes,
      usagePercentage: (storage.used_bytes / storage.max_bytes) * 100,
      fileCount: storage.file_count,
      formatted: {
        used: formatBytes(storage.used_bytes),
        max: formatBytes(storage.max_bytes),
        remaining: formatBytes(storage.max_bytes - storage.used_bytes)
      }
    })
  } catch (error) {
    console.error('Storage check error:', error)
    return NextResponse.json(
      { error: '스토리지 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { fileSize } = await request.json()
    
    if (!fileSize || fileSize < 0) {
      return NextResponse.json({ error: '유효하지 않은 파일 크기입니다' }, { status: 400 })
    }
    
    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    
    // 사용자 ID 가져오기
    const { data: userData } = await supabase
      .from('user')
      .select('id')
      .eq('supabaseId', user.id)
      .single()
    
    if (!userData) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 업로드 가능 여부 확인
    const result = await canUploadFile(userData.id, fileSize)
    
    if (!result.canUpload) {
      return NextResponse.json({
        ...result,
        error: '저장 공간이 부족합니다. 멤버십을 업그레이드하거나 파일을 삭제해주세요.',
        formatted: {
          used: formatBytes(result.usedBytes),
          max: formatBytes(result.maxBytes),
          remaining: formatBytes(result.remainingBytes),
          fileSize: formatBytes(fileSize)
        }
      }, { status: 403 })
    }
    
    return NextResponse.json({
      ...result,
      formatted: {
        used: formatBytes(result.usedBytes),
        max: formatBytes(result.maxBytes),
        remaining: formatBytes(result.remainingBytes),
        fileSize: formatBytes(fileSize)
      }
    })
  } catch (error) {
    console.error('Storage check error:', error)
    return NextResponse.json(
      { error: '용량 확인에 실패했습니다' },
      { status: 500 }
    )
  }
}