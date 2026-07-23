'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBoard(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string || null
  const color = formData.get('color') as string || '#6366f1'

  if (!name) {
    return { error: 'Nama board wajib diisi' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('boards').insert({
    name,
    description,
    color,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/boards')
  return { success: true }
}

export async function updateBoard(id: string, name: string, description: string | null, color: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ name, description, color })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/boards')
  revalidatePath(`/boards/${id}`)
  return { success: true }
}

export async function archiveBoard(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ archived: true })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/boards')
  return { success: true }
}
