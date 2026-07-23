'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createStatus(boardId: string, name: string, color: string, isFinal: boolean = false) {
  if (!name) return { error: 'Nama status/kolom wajib diisi' }

  const supabase = await createClient()
  
  // Get max sort_order
  const { data: currentStatuses } = await supabase
    .from('statuses')
    .select('sort_order')
  
  const maxOrder = currentStatuses && currentStatuses.length > 0 
    ? Math.max(...currentStatuses.map(s => s.sort_order)) 
    : 0

  const { error } = await supabase.from('statuses').insert({
    name,
    color: color || '#6366f1',
    sort_order: maxOrder + 1,
    is_final: isFinal
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function updateStatus(boardId: string, id: string, name: string, color: string, isFinal: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('statuses')
    .update({ name, color, is_final: isFinal })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function deleteStatus(boardId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}
