import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import BoardListClient from '@/components/board-list-client'
import ThemeToggle from '@/components/theme-toggle'
import { LogOut } from 'lucide-react'

export default async function BoardsPage() {
  const supabase = await createClient()
  const { data: userResponse } = await supabase.auth.getUser()
  const user = userResponse?.user

  // Fetch boards
  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('archived', false)
    .order('sort_order', { ascending: true })

  // Fetch all tasks for dashboard multi-view
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false })

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

  // Fetch members
  const { data: members } = await supabase
    .from('members')
    .select('*')

  // Fetch attachments
  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')

  return (
    <div className="min-h-screen bg-var-primary text-var-primary p-4 md:p-8 transition-colors">
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-var-border">
        <div>
          <h1 className="text-2xl font-bold text-var-primary tracking-tight">
            Sans Ngatur
          </h1>
          <p className="text-xs text-var-secondary mt-1">
            Selamat datang kembali,{' '}
            <span className="text-indigo-400 font-semibold">{user?.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 px-3 py-1.5 bg-var-card hover:bg-var-card-subtle border border-var-border text-xs font-semibold rounded-lg text-var-secondary hover:text-var-primary transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        <BoardListClient
          initialBoards={boards || []}
          allTasks={tasks || []}
          statuses={statuses || []}
          taskTypes={taskTypes || []}
          members={members || []}
          attachments={attachments || []}
        />
      </main>
    </div>
  )
}
