'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAttachment(
  boardId: string,
  taskId: string,
  url: string,
  label: string | null,
  kind: 'file' | 'link' = 'link'
) {
  if (!url) return { error: 'URL lampiran wajib diisi' }

  const supabase = await createClient()
  const { error } = await supabase.from('attachments').insert({
    task_id: taskId,
    url,
    label: label || null,
    kind,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}

export async function deleteAttachment(boardId: string, attachmentId: string) {
  const supabase = await createClient()

  // Try to get the attachment first to clean up storage if it's a file
  const { data: attachment } = await supabase
    .from('attachments')
    .select('url, kind')
    .eq('id', attachmentId)
    .single()

  // Delete from database
  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) {
    return { error: error.message }
  }

  // If it was a file attachment, clean up from Supabase Storage
  if (attachment?.kind === 'file' && attachment?.url) {
    try {
      // Extract file path from the public URL
      const url = new URL(attachment.url)
      const pathParts = url.pathname.split('/object/public/attachments/')
      if (pathParts.length === 2) {
        await supabase.storage.from('attachments').remove([pathParts[1]])
      }
    } catch {
      // Non-critical: storage cleanup failure doesn't break UX
      console.warn('Could not delete file from storage:', attachment.url)
    }
  }

  revalidatePath(`/boards/${boardId}`)
  return { success: true }
}
