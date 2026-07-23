'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createMember(boardId: string, name: string, color: string) {
  if (!name) return { error: 'Nama anggota wajib diisi' }

  const supabase = await createClient()
  const formattedName = `${boardId}|||${name}`

  const { error } = await supabase.from('members').insert({
    name: formattedName,
    color: color || '#6366f1',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function updateMember(boardId: string, id: string, name: string, color: string) {
  const supabase = await createClient()
  const formattedName = `${boardId}|||${name}`

  const { error } = await supabase
    .from('members')
    .update({ name: formattedName, color })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function deleteMember(boardId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}
