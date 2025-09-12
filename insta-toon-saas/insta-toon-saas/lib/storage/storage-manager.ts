import { createClient } from '@/lib/supabase/server'

// 멤버십별 용량 제한 (바이트 단위)
export const STORAGE_LIMITS = {
  FREE: 1 * 1024 * 1024 * 1024,        // 1GB
  PRO: 10 * 1024 * 1024 * 1024,        // 10GB  
  PREMIUM: 50 * 1024 * 1024 * 1024,    // 50GB
}

// 멤버십 타입
export type MembershipType = 'FREE' | 'PRO' | 'PREMIUM'

// 바이트를 읽기 쉬운 형식으로 변환
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// 용량을 GB로 변환
export function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

// 사용자의 스토리지 정보 가져오기
export async function getUserStorage(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_storage')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code === 'PGRST116') {
    // 레코드가 없으면 생성
    const { data: newStorage, error: createError } = await supabase
      .from('user_storage')
      .insert({
        user_id: userId,
        used_bytes: 0,
        max_bytes: STORAGE_LIMITS.FREE,
        file_count: 0
      })
      .select()
      .single()
    
    if (createError) throw createError
    return newStorage
  }
  
  if (error) throw error
  return data
}

// 멤버십에 따른 최대 용량 업데이트
export async function updateStorageLimit(userId: string, membership: MembershipType) {
  const supabase = await createClient()
  
  const maxBytes = STORAGE_LIMITS[membership]
  
  const { error } = await supabase
    .from('user_storage')
    .upsert({
      user_id: userId,
      max_bytes: maxBytes
    }, {
      onConflict: 'user_id'
    })
  
  if (error) throw error
}

// 파일 업로드 전 용량 체크
export async function canUploadFile(userId: string, fileSize: number): Promise<{
  canUpload: boolean
  usedBytes: number
  maxBytes: number
  remainingBytes: number
  usagePercentage: number
}> {
  const storage = await getUserStorage(userId)
  
  const remainingBytes = storage.max_bytes - storage.used_bytes
  const canUpload = fileSize <= remainingBytes
  const usagePercentage = (storage.used_bytes / storage.max_bytes) * 100
  
  return {
    canUpload,
    usedBytes: storage.used_bytes,
    maxBytes: storage.max_bytes,
    remainingBytes,
    usagePercentage
  }
}

// 파일 업로드 후 용량 업데이트
export async function updateStorageUsage(
  userId: string,
  fileSize: number,
  operation: 'add' | 'remove' = 'add'
) {
  const supabase = await createClient()
  
  const storage = await getUserStorage(userId)
  
  const newUsedBytes = operation === 'add' 
    ? storage.used_bytes + fileSize
    : Math.max(0, storage.used_bytes - fileSize)
  
  const newFileCount = operation === 'add'
    ? storage.file_count + 1
    : Math.max(0, storage.file_count - 1)
  
  const { error } = await supabase
    .from('user_storage')
    .update({
      used_bytes: newUsedBytes,
      file_count: newFileCount
    })
    .eq('user_id', userId)
  
  if (error) throw error
  
  return {
    usedBytes: newUsedBytes,
    fileCount: newFileCount
  }
}

// 파일 메타데이터 저장
export async function saveFileMetadata(
  userId: string,
  projectId: string | null,
  fileName: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  mimeType: string
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('file_metadata')
    .insert({
      user_id: userId,
      project_id: projectId,
      file_name: fileName,
      file_path: filePath,
      file_size: fileSize,
      file_type: fileType,
      mime_type: mimeType
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 파일 삭제 시 메타데이터 소프트 삭제
export async function deleteFileMetadata(fileId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('file_metadata')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 프로젝트의 총 용량 계산
export async function getProjectStorageUsage(projectId: string): Promise<number> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('file_metadata')
    .select('file_size')
    .eq('project_id', projectId)
    .is('deleted_at', null)
  
  if (error) throw error
  
  return data.reduce((total, file) => total + file.file_size, 0)
}

// 사용자의 스토리지 통계
export async function getStorageStats(userId: string) {
  const supabase = await createClient()
  
  // 스토리지 정보
  const storage = await getUserStorage(userId)
  
  // 파일 타입별 통계
  const { data: fileStats, error } = await supabase
    .from('file_metadata')
    .select('file_type, file_size')
    .eq('user_id', userId)
    .is('deleted_at', null)
  
  if (error) throw error
  
  // 파일 타입별 집계
  const typeStats = fileStats.reduce((acc, file) => {
    const type = file.file_type || 'other'
    if (!acc[type]) {
      acc[type] = { count: 0, size: 0 }
    }
    acc[type].count++
    acc[type].size += file.file_size
    return acc
  }, {} as Record<string, { count: number; size: number }>)
  
  return {
    totalUsed: storage.used_bytes,
    totalMax: storage.max_bytes,
    fileCount: storage.file_count,
    usagePercentage: (storage.used_bytes / storage.max_bytes) * 100,
    typeStats
  }
}