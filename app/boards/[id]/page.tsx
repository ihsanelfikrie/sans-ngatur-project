import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BoardDetailsClient from '@/components/board-details-client'

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch current board details
  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single()

  if (!board) {
    notFound()
  }

  // Fetch statuses
  const { data: statuses } = await supabase
    .from('statuses')
    .select('*')
    .order('sort_order', { ascending: true })

  // Fetch task types
  const { data: taskTypes } = await supabase
    .from('task_types')
    .select('*')
    .order('name', { ascending: true })

  // Fetch all members to filter for this board
  const { data: allMembers } = await supabase
    .from('members')
    .select('*')
    .order('name', { ascending: true })

  // Filter members specific to this board and clean up the prefix
  const members = (allMembers || [])
    .filter((m) => m.name.startsWith(`${id}|||`))
    .map((m) => ({
      ...m,
      name: m.name.substring(id.length + 3), // Remove the "boardId|||" prefix
    }))

  // Fetch tasks for this board
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('board_id', id)
    .order('position', { ascending: true })

  // Fetch attachments for this board's tasks
  let attachments: any[] = []
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map((t) => t.id)
    const { data: attachmentsData } = await supabase
      .from('attachments')
      .select('*')
      .in('task_id', taskIds)
    
    if (attachmentsData) {
      attachments = attachmentsData
    }
  }

  return (
    <BoardDetailsClient
      board={board}
      statuses={statuses || []}
      taskTypes={taskTypes || []}
      members={members || []}
      initialTasks={tasks || []}
      initialAttachments={attachments}
    />
  )
}
