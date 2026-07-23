'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTask(
  boardId: string,
  title: string,
  description: string | null,
  statusId: string | null,
  typeId: string | null,
  assigneeId: string | null,
  deadline: string | null
) {
  if (!title) return { error: 'Judul tugas wajib diisi' }

  const supabase = await createClient()

  // Get max position in that status
  let maxPos = 0
  if (statusId) {
    const { data: siblingTasks } = await supabase
      .from('tasks')
      .select('position')
      .eq('board_id', boardId)
      .eq('status_id', statusId)
    
    if (siblingTasks && siblingTasks.length > 0) {
      maxPos = Math.max(...siblingTasks.map(t => t.position))
    }
  }

  const { error } = await supabase.from('tasks').insert({
    board_id: boardId,
    title,
    description: description || null,
    status_id: statusId || null,
    type_id: typeId || null,
    assignee_id: assigneeId || null,
    deadline: deadline || null,
    position: maxPos + 1
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function updateTask(
  boardId: string,
  taskId: string,
  updates: {
    title?: string
    description?: string | null
    status_id?: string | null
    type_id?: string | null
    assignee_id?: string | null
    deadline?: string | null
    position?: number
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function moveTask(
  boardId: string,
  taskId: string,
  statusId: string | null,
  position: number
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({
      status_id: statusId,
      position,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function deleteTask(boardId: string, taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}
