'use client'

import { useState } from 'react'
import { createBoard } from '@/lib/actions/board'
import { moveTask, updateTask, deleteTask } from '@/lib/actions/task'
import { createAttachment, deleteAttachment } from '@/lib/actions/attachment'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Folder, Calendar, ArrowRight, Paintbrush, Layers, Clock, Paperclip, User, Trash2 } from 'lucide-react'
import MultiViewWorkspace, {
  Board,
  Status,
  TaskType,
  Member,
  Task,
  Attachment,
} from './multi-view-workspace'

export default function BoardListClient({
  initialBoards,
  allTasks,
  statuses,
  taskTypes,
  members,
  attachments,
}: {
  initialBoards: Board[]
  allTasks: Task[]
  statuses: Status[]
  taskTypes: TaskType[]
  members: Member[]
  attachments: Attachment[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#6366f1')

  // Selected task modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const colors = [
    '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6',
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsPending(true)

    const formData = new FormData(event.currentTarget)
    formData.append('color', selectedColor)

    const result = await createBoard(formData)
    setIsPending(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
      event.currentTarget.reset()
      router.refresh()
    }
  }

  async function handleMoveTask(taskId: string, targetStatusId: string | null) {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    const siblingTasks = targetStatusId
      ? allTasks.filter((t) => t.status_id === targetStatusId)
      : allTasks.filter((t) => !t.status_id)

    const newPos = siblingTasks.length > 0 ? Math.max(...siblingTasks.map((t) => t.position)) + 1 : 1

    await moveTask(task.board_id, taskId, targetStatusId, newPos)
    router.refresh()
  }

  return (
    <div className="space-y-10">
      {/* ── 1. BOARDS GRID SECTION ── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-indigo-400" />
            Daftar Board Projects ({initialBoards.length})
          </h2>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer border border-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Buat Board Baru
          </button>
        </div>

        {initialBoards.length === 0 ? (
          <div className="bg-[#181818] border border-gray-850 rounded-xl p-12 text-center max-w-lg mx-auto my-6">
            <div className="w-14 h-14 bg-[#202020] border border-gray-800 text-indigo-400 rounded-lg flex items-center justify-center mx-auto mb-4 text-xl">
              📋
            </div>
            <h3 className="text-base font-bold text-white mb-2">Belum ada Board</h3>
            <p className="text-xs text-gray-400 mb-6">
              Buat board baru untuk mulai mengelola tugas dan anggota projek Anda.
            </p>
            <button
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all cursor-pointer border border-indigo-700 text-xs"
            >
              <Plus className="w-4 h-4" /> Buat Board Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {initialBoards.map((board) => {
              const boardTasksCount = allTasks.filter((t) => t.board_id === board.id).length

              return (
                <Link
                  href={`/boards/${board.id}`}
                  key={board.id}
                  className="group block relative bg-[#181818] border border-gray-850 hover:border-gray-700 rounded-xl p-5 transition-all overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: board.color }}
                  />

                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded flex items-center justify-center border border-gray-850"
                      style={{ backgroundColor: `${board.color}15` }}
                    >
                      <Folder className="w-4 h-4" style={{ color: board.color }} />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold bg-[#222222] px-2 py-0.5 rounded border border-gray-800">
                      {boardTasksCount} Tugas
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1.5">
                    {board.name}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-2 min-h-[2.25rem]">
                    {board.description || 'Tidak ada deskripsi.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-850 flex items-center justify-between text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">
                    <span>Buka Workspace Board</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 2. DASHBOARD ALL TASKS MULTI-VIEW WORKSPACE ── */}
      <div className="pt-4 border-t border-gray-800">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Semua Tugas Lintas Project
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Melihat seluruh gambaran tugas dari seluruh board dalam bentuk Kanban, List, Kalender, dan Tabel.
          </p>
        </div>

        <MultiViewWorkspace
          tasks={allTasks}
          statuses={statuses}
          taskTypes={taskTypes}
          members={members}
          boards={initialBoards}
          attachments={attachments}
          currentBoardId={null}
          onMoveTask={handleMoveTask}
          onTaskClick={(task) => {
            setSelectedTask(task)
            setIsTaskModalOpen(true)
          }}
          onAddTask={() => {
            if (initialBoards.length > 0) {
              router.push(`/boards/${initialBoards[0].id}`)
            }
          }}
        />
      </div>

      {/* ── MODAL CREATE BOARD ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md bg-[#181818] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-850">
              <h3 className="text-sm font-bold text-white">Buat Board Baru</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Nama Board</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Projek Dekorasi"
                  className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Deskripsi</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Penjelasan singkat tentang projek..."
                  className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                  <Paintbrush className="w-4 h-4 text-indigo-400" />
                  Warna Tema Board
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full border transition-all cursor-pointer ${
                        selectedColor === c ? 'border-white scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-400 hover:text-white font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 border border-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Buat Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL MODAL ── */}
      {isTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsTaskModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#181818] border border-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-800">
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Detail Tugas</span>
                <h3 className="text-base font-bold text-white mt-1">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-gray-400 mb-1">Deskripsi</h4>
                <p className="text-gray-300 bg-[#121212] p-3 rounded border border-gray-850">
                  {selectedTask.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/boards/${selectedTask.board_id}`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                >
                  Buka Board Projek
                </Link>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
