'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTaskType(boardId: string, name: string, color: string) {
  if (!name) return { error: 'Nama tipe tugas wajib diisi' }

  const supabase = await createClient()
  const { error } = await supabase.from('task_types').insert({
    name,
    color: color || '#0ea5e9',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function updateTaskType(boardId: string, id: string, name: string, color: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('task_types')
    .update({ name, color })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function deleteTaskType(boardId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('task_types')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}
