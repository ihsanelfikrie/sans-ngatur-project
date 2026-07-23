'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import {
  createTask,
  updateTask,
  deleteTask,
  moveTask,
} from '@/lib/actions/task'
import { createStatus, deleteStatus } from '@/lib/actions/status'
import { createMember, deleteMember } from '@/lib/actions/member'
import { createTaskType, deleteTaskType } from '@/lib/actions/task-type'
import { createAttachment, deleteAttachment } from '@/lib/actions/attachment'
import {
  Plus,
  X,
  Paperclip,
  Trash2,
  Settings,
  Users,
  Layers,
  ArrowLeft,
  Clock,
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Pencil,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import MultiViewWorkspace, {
  Board,
  Status,
  TaskType,
  Member,
  Task,
  Attachment,
} from './multi-view-workspace'

export default function BoardDetailsClient({
  board,
  statuses,
  taskTypes,
  members,
  initialTasks,
  initialAttachments,
}: {
  board: Board
  statuses: Status[]
  taskTypes: TaskType[]
  members: Member[]
  initialTasks: Task[]
  initialAttachments: Attachment[]
}) {
  const router = useRouter()

  // Selected task & settings drawer states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Modal creation states
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
  const [newTaskStatusId, setNewTaskStatusId] = useState<string | null>(null)
  const [isNewStatusOpen, setIsNewStatusOpen] = useState(false)
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false)
  const [isNewTaskTypeOpen, setIsNewTaskTypeOpen] = useState(false)

  // Per-form pending states
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isCreatingStatus, setIsCreatingStatus] = useState(false)
  const [isCreatingMember, setIsCreatingMember] = useState(false)
  const [isCreatingTaskType, setIsCreatingTaskType] = useState(false)

  // Form errors
  const [taskError, setTaskError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [taskTypeError, setTaskTypeError] = useState<string | null>(null)

  // Attachment states
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentLabel, setAttachmentLabel] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(initialAttachments)

  // Inline edits
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [editDescriptionValue, setEditDescriptionValue] = useState('')

  const selectedTaskAttachments = selectedTask
    ? localAttachments.filter((a) => a.task_id === selectedTask.id)
    : []

  // ─────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────
  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTaskError(null)
    setIsCreatingTask(true)
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const typeId = (formData.get('type_id') as string) || null
    const assigneeId = (formData.get('assignee_id') as string) || null
    const deadline = (formData.get('deadline') as string) || null

    const res = await createTask(
      board.id,
      title,
      description,
      newTaskStatusId,
      typeId,
      assigneeId,
      deadline
    )
    setIsCreatingTask(false)

    if (res?.error) {
      setTaskError(res.error)
    } else {
      setIsNewTaskOpen(false)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  async function handleMoveTask(taskId: string, targetStatusId: string | null) {
    const siblingTasks = targetStatusId
      ? initialTasks.filter((t) => t.status_id === targetStatusId)
      : initialTasks.filter((t) => !t.status_id)

    const newPosition =
      siblingTasks.length > 0
        ? Math.max(...siblingTasks.map((t) => t.position)) + 1
        : 1

    await moveTask(board.id, taskId, targetStatusId, newPosition)
    router.refresh()
  }

  async function handleUpdateTaskField(taskId: string, updates: Partial<Task>) {
    await updateTask(board.id, taskId, updates)
    router.refresh()
  }

  async function handleDeleteTask(taskId: string) {
    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      const res = await deleteTask(board.id, taskId)
      if (!res?.error) {
        setIsTaskModalOpen(false)
        setSelectedTask(null)
        router.refresh()
      }
    }
  }

  async function handleSaveTitle() {
    if (!selectedTask || !editTitleValue.trim()) return
    const updated = { ...selectedTask, title: editTitleValue.trim() }
    setSelectedTask(updated)
    setEditingTitle(false)
    await handleUpdateTaskField(selectedTask.id, { title: editTitleValue.trim() })
  }

  async function handleSaveDescription() {
    if (!selectedTask) return
    const val = editDescriptionValue.trim() || null
    const updated = { ...selectedTask, description: val }
    setSelectedTask(updated)
    setEditingDescription(false)
    await handleUpdateTaskField(selectedTask.id, { description: val })
  }

  async function handleCreateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatusError(null)
    setIsCreatingStatus(true)
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string
    const isFinal = formData.get('is_final') === 'true'

    const res = await createStatus(board.id, name, color, isFinal)
    setIsCreatingStatus(false)
    if (res?.error) {
      setStatusError(res.error)
    } else {
      setIsNewStatusOpen(false)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  async function handleCreateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMemberError(null)
    setIsCreatingMember(true)
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    const res = await createMember(board.id, name, color)
    setIsCreatingMember(false)
    if (res?.error) {
      setMemberError(res.error)
    } else {
      setIsNewMemberOpen(false)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  async function handleCreateTaskType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTaskTypeError(null)
    setIsCreatingTaskType(true)
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const color = formData.get('color') as string

    const res = await createTaskType(board.id, name, color)
    setIsCreatingTaskType(false)
    if (res?.error) {
      setTaskTypeError(res.error)
    } else {
      setIsNewTaskTypeOpen(false)
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  async function handleAddLinkAttachment() {
    if (!selectedTask || !attachmentUrl.trim()) return
    setIsAddingLink(true)
    const res = await createAttachment(
      board.id,
      selectedTask.id,
      attachmentUrl.trim(),
      attachmentLabel.trim() || 'Tautan Web',
      'link'
    )
    setIsAddingLink(false)
    if (!res?.error) {
      const newAttachment: Attachment = {
        id: `temp-${Date.now()}`,
        task_id: selectedTask.id,
        kind: 'link',
        url: attachmentUrl.trim(),
        label: attachmentLabel.trim() || 'Tautan Web',
      }
      setLocalAttachments((prev) => [...prev, newAttachment])
      setAttachmentUrl('')
      setAttachmentLabel('')
      router.refresh()
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedTask) return

    setUploadError(null)
    const maxLimit = 10 * 1024 * 1024
    if (file.size > maxLimit) {
      setUploadError(`Ukuran file (${(file.size / 1024 / 1024).toFixed(1)} MB) melebihi batas maksimal 10 MB!`)
      e.target.value = ''
      return
    }

    setIsUploading(true)
    try {
      const supabase = createBrowserClient()
      const fileExt = file.name.split('.').pop() || 'bin'
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `tasks/${selectedTask.id}/${Date.now()}-${safeFileName}`

      const { error: uploadErr } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadErr) {
        throw new Error(uploadErr.message)
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(filePath)

      const res = await createAttachment(board.id, selectedTask.id, publicUrl, file.name, 'file')
      if (res?.error) {
        throw new Error(res.error)
      }

      const newAttachment: Attachment = {
        id: `temp-${Date.now()}`,
        task_id: selectedTask.id,
        kind: 'file',
        url: publicUrl,
        label: file.name,
      }
      setLocalAttachments((prev) => [...prev, newAttachment])
      e.target.value = ''
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah file.'
      setUploadError(msg)
      e.target.value = ''
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteAttachment(id: string) {
    setLocalAttachments((prev) => prev.filter((a) => a.id !== id))
    const res = await deleteAttachment(board.id, id)
    if (res?.error) {
      setLocalAttachments(initialAttachments)
    } else {
      router.refresh()
    }
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200">
      {/* ── Board Header ── */}
      <header className="px-4 md:px-6 py-4 border-b border-gray-800 bg-[#181818] sticky top-0 z-40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/boards"
            className="p-2 hover:bg-[#252525] border border-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: board.color }}
              />
              <h1 className="text-base font-bold text-white leading-tight">{board.name}</h1>
            </div>
            {board.description && (
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{board.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isSettingsOpen
                ? 'bg-indigo-600 border-indigo-700 text-white'
                : 'bg-[#202020] border-gray-800 hover:bg-[#252525] hover:text-white text-gray-300'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Master Data
          </button>

          <button
            onClick={() => {
              setNewTaskStatusId(statuses[0]?.id || null)
              setTaskError(null)
              setIsNewTaskOpen(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border border-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Tugas Baru
          </button>
        </div>
      </header>

      {/* ── Main Workspace Content ── */}
      <div className="flex relative overflow-hidden">
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <MultiViewWorkspace
            tasks={initialTasks}
            statuses={statuses}
            taskTypes={taskTypes}
            members={members}
            boards={[board]}
            attachments={localAttachments}
            currentBoardId={board.id}
            onMoveTask={handleMoveTask}
            onTaskClick={(task) => {
              setSelectedTask(task)
              setIsTaskModalOpen(true)
              setUploadError(null)
            }}
            onAddTask={(statusId) => {
              setNewTaskStatusId(statusId)
              setTaskError(null)
              setIsNewTaskOpen(true)
            }}
          />
        </main>

        {/* Master Data Settings Sidebar Drawer */}
        {isSettingsOpen && (
          <aside className="w-72 md:w-80 bg-[#161616] border-l border-gray-800 p-5 overflow-y-auto flex flex-col h-[calc(100vh-65px)] flex-shrink-0">
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-800">
              <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                Master Data Projek
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Members Section */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Anggota ({members.length})
                </h3>
                <button
                  onClick={() => {
                    setMemberError(null)
                    setIsNewMemberOpen(true)
                  }}
                  className="p-1 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#202020] border border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          backgroundColor: `${m.color}20`,
                          color: m.color,
                        }}
                      >
                        {getInitials(m.name)}
                      </div>
                      <span className="text-xs font-medium text-gray-200 truncate max-w-[140px]">
                        {m.name}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`Hapus anggota "${m.name}" dari projek ini?`)) {
                          await deleteMember(board.id, m.id)
                          router.refresh()
                        }
                      }}
                      className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-[11px] text-gray-600 italic">Belum ada anggota di projek ini.</p>
                )}
              </div>
            </div>

            {/* Task Types Section */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Tipe Tugas ({taskTypes.length})
                </h3>
                <button
                  onClick={() => {
                    setTaskTypeError(null)
                    setIsNewTaskTypeOpen(true)
                  }}
                  className="p-1 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {taskTypes.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#202020] border border-gray-800 rounded-lg"
                  >
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: `${t.color}15`,
                        color: t.color,
                        border: `1px solid ${t.color}30`,
                      }}
                    >
                      {t.name}
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm(`Hapus tipe tugas "${t.name}"?`)) {
                          await deleteTaskType(board.id, t.id)
                          router.refresh()
                        }
                      }}
                      className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {taskTypes.length === 0 && (
                  <p className="text-[11px] text-gray-600 italic">Belum ada tipe tugas.</p>
                )}
              </div>
            </div>

            {/* Status Columns Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                  Kolom Status ({statuses.length})
                </h3>
                <button
                  onClick={() => {
                    setStatusError(null)
                    setIsNewStatusOpen(true)
                  }}
                  className="p-1 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {statuses.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#202020] border border-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-xs font-medium text-gray-200 truncate max-w-[150px]">
                        {s.name}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`Hapus kolom "${s.name}"? Tugas di dalamnya akan menjadi unassigned.`)) {
                          await deleteStatus(board.id, s.id)
                          router.refresh()
                        }
                      }}
                      className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {statuses.length === 0 && (
                  <p className="text-[11px] text-gray-600 italic">Belum ada kolom.</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── MODALS (Task, Status, Member, TaskType, Detail) ── */}
      {isNewTaskOpen && (
        <Modal onClose={() => setIsNewTaskOpen(false)}>
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white">Buat Tugas Baru</h3>
            <button onClick={() => setIsNewTaskOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {taskError && <ErrorAlert message={taskError} />}

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Judul Tugas <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Judul/Nama tugas..."
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Deskripsi</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Detail tugas..."
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Tipe Tugas</label>
                <select
                  name="type_id"
                  className="w-full px-3 py-2 bg-[#202020] border border-gray-700 rounded-lg text-gray-200 text-xs"
                >
                  <option value="">-- Tipe --</option>
                  {taskTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Assignee</label>
                <select
                  name="assignee_id"
                  className="w-full px-3 py-2 bg-[#202020] border border-gray-700 rounded-lg text-gray-200 text-xs"
                >
                  <option value="">-- Anggota --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Deadline</label>
              <input
                type="date"
                name="deadline"
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsNewTaskOpen(false)}
                className="text-xs text-gray-400 hover:text-white cursor-pointer font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingTask}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer border border-indigo-700 disabled:opacity-50"
              >
                {isCreatingTask ? 'Menyimpan...' : 'Simpan Tugas'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Status Modal */}
      {isNewStatusOpen && (
        <Modal onClose={() => setIsNewStatusOpen(false)} maxWidth="max-w-sm">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-gray-800">
            Tambah Kolom Baru
          </h3>
          {statusError && <ErrorAlert message={statusError} />}
          <form onSubmit={handleCreateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nama Kolom</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Review"
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Warna Label</label>
              <input
                type="color"
                name="color"
                defaultValue="#6366f1"
                className="w-full h-10 bg-transparent cursor-pointer rounded-lg border border-gray-700"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewStatusOpen(false)}
                className="text-xs text-gray-400 hover:text-white cursor-pointer font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingStatus}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold border border-indigo-700 disabled:opacity-50"
              >
                {isCreatingStatus ? 'Memproses...' : 'Tambah'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Member Modal */}
      {isNewMemberOpen && (
        <Modal onClose={() => setIsNewMemberOpen(false)} maxWidth="max-w-sm">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-gray-800">
            Tambah Anggota Projek
          </h3>
          {memberError && <ErrorAlert message={memberError} />}
          <form onSubmit={handleCreateMember} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Nama anggota..."
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Warna Avatar</label>
              <input
                type="color"
                name="color"
                defaultValue="#10b981"
                className="w-full h-10 bg-transparent cursor-pointer rounded-lg border border-gray-700"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewMemberOpen(false)}
                className="text-xs text-gray-400 hover:text-white font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingMember}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold border border-indigo-700 disabled:opacity-50"
              >
                {isCreatingMember ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Type Modal */}
      {isNewTaskTypeOpen && (
        <Modal onClose={() => setIsNewTaskTypeOpen(false)} maxWidth="max-w-sm">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-gray-800">
            Tambah Tipe Tugas
          </h3>
          {taskTypeError && <ErrorAlert message={taskTypeError} />}
          <form onSubmit={handleCreateTaskType} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nama Tipe</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Desain Grafis"
                className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Warna Label</label>
              <input
                type="color"
                name="color"
                defaultValue="#0ea5e9"
                className="w-full h-10 bg-transparent cursor-pointer rounded-lg border border-gray-700"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewTaskTypeOpen(false)}
                className="text-xs text-gray-400 hover:text-white font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingTaskType}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold border border-indigo-700 disabled:opacity-50"
              >
                {isCreatingTaskType ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Details Modal */}
      {isTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              setIsTaskModalOpen(false)
              setSelectedTask(null)
              setUploadError(null)
              setEditingTitle(false)
              setEditingDescription(false)
            }}
          />

          <div className="relative w-full max-w-2xl bg-[#181818] border border-gray-800 rounded-xl overflow-y-auto max-h-[94vh] flex flex-col">
            <div className="flex items-start justify-between p-5 md:p-6 pb-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex-1 pr-4 min-w-0">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  Detail Tugas
                </span>
                {editingTitle ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      autoFocus
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle()
                        if (e.key === 'Escape') setEditingTitle(false)
                      }}
                      className="flex-1 bg-[#202020] border border-indigo-500 rounded px-2 py-1 text-sm font-bold text-white"
                    />
                    <button onClick={handleSaveTitle} className="p-1.5 bg-indigo-600 text-white rounded cursor-pointer">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingTitle(false)} className="p-1.5 bg-[#252525] text-gray-400 rounded cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/title">
                    <h3 className="text-base font-bold text-white mt-1 leading-snug">
                      {selectedTask.title}
                    </h3>
                    <button
                      onClick={() => {
                        setEditTitleValue(selectedTask.title)
                        setEditingTitle(true)
                      }}
                      className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-500 hover:text-gray-300 transition-opacity mt-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setIsTaskModalOpen(false)
                    setSelectedTask(null)
                    setUploadError(null)
                    setEditingTitle(false)
                    setEditingDescription(false)
                  }}
                  className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto">
              <div className="md:col-span-2 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-300">Deskripsi</h4>
                    {!editingDescription && (
                      <button
                        onClick={() => {
                          setEditDescriptionValue(selectedTask.description || '')
                          setEditingDescription(true)
                        }}
                        className="text-[10px] text-gray-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-2.5 h-2.5" /> Edit
                      </button>
                    )}
                  </div>
                  {editingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        rows={4}
                        value={editDescriptionValue}
                        onChange={(e) => setEditDescriptionValue(e.target.value)}
                        className="w-full px-3 py-2 bg-[#202020] border border-indigo-500 rounded-lg text-xs text-gray-200 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDescription}
                          className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded cursor-pointer border border-indigo-700"
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => setEditingDescription(false)}
                          className="px-4 py-1.5 bg-[#252525] text-gray-400 text-xs font-bold rounded cursor-pointer border border-gray-700"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditDescriptionValue(selectedTask.description || '')
                        setEditingDescription(true)
                      }}
                      className="text-xs text-gray-400 bg-[#121212] p-4 rounded-lg border border-gray-800 whitespace-pre-wrap cursor-text min-h-[60px]"
                    >
                      {selectedTask.description || (
                        <span className="text-gray-600 italic">Klik untuk menambah deskripsi...</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3 text-indigo-400" />
                    Lampiran ({selectedTaskAttachments.length})
                  </h4>

                  <div className="space-y-1.5 mb-3">
                    {selectedTaskAttachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 bg-[#121212] border border-gray-800 rounded-lg"
                      >
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-medium min-w-0"
                        >
                          {a.kind === 'file' ? <Upload className="w-3 h-3 flex-shrink-0" /> : <LinkIcon className="w-3 h-3 flex-shrink-0" />}
                          <span className="truncate">{a.label || a.url}</span>
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(a.id)}
                          className="text-gray-600 hover:text-red-400 cursor-pointer p-1 rounded flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {selectedTaskAttachments.length === 0 && (
                      <p className="text-xs text-gray-600 italic">Belum ada lampiran.</p>
                    )}
                  </div>

                  <div className="space-y-3 p-3 bg-[#121212] border border-gray-800 rounded-lg">
                    {uploadError && (
                      <div className="text-[11px] text-red-400 bg-red-500/10 p-2 border border-red-500/20 rounded flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {uploadError}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase">
                        Unggah Berkas (Maks. 10 MB)
                      </label>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-700 file:bg-[#202020] file:text-gray-300 hover:file:bg-[#252525] file:text-[11px] file:font-bold file:cursor-pointer cursor-pointer"
                      />
                      {isUploading && (
                        <span className="text-[11px] text-indigo-400 mt-1 block">Mengunggah...</span>
                      )}
                    </div>

                    <div className="h-px bg-gray-800" />

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase">
                        Tambah Link URL
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Label (misal: Figma, Drive)"
                          value={attachmentLabel}
                          onChange={(e) => setAttachmentLabel(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                        />
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                          />
                          <button
                            onClick={handleAddLinkAttachment}
                            disabled={isAddingLink || !attachmentUrl.trim()}
                            className="px-4 py-1.5 bg-[#202020] hover:bg-[#252525] border border-gray-700 text-gray-200 font-bold rounded text-xs cursor-pointer"
                          >
                            {isAddingLink ? '...' : 'Tambah'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Attributes Sidebar */}
              <div className="space-y-4 bg-[#121212] p-4 rounded-lg border border-gray-800 self-start">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Atribut</h4>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Status / Kolom</label>
                  <select
                    value={selectedTask.status_id || ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setSelectedTask({ ...selectedTask, status_id: val })
                      handleUpdateTaskField(selectedTask.id, { status_id: val })
                    }}
                    className="w-full px-2.5 py-2 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                  >
                    <option value="">Belum Ditugaskan</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Assignee</label>
                  <select
                    value={selectedTask.assignee_id || ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setSelectedTask({ ...selectedTask, assignee_id: val })
                      handleUpdateTaskField(selectedTask.id, { assignee_id: val })
                    }}
                    className="w-full px-2.5 py-2 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                  >
                    <option value="">Tidak Ada</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Tipe Tugas</label>
                  <select
                    value={selectedTask.type_id || ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setSelectedTask({ ...selectedTask, type_id: val })
                      handleUpdateTaskField(selectedTask.id, { type_id: val })
                    }}
                    className="w-full px-2.5 py-2 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                  >
                    <option value="">Tidak Ada</option>
                    {taskTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={selectedTask.deadline ? selectedTask.deadline.split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value || null
                      setSelectedTask({ ...selectedTask, deadline: val })
                      handleUpdateTaskField(selectedTask.id, { deadline: val })
                    }}
                    className="w-full px-2.5 py-2 bg-[#202020] border border-gray-700 rounded text-xs text-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Modal({ children, onClose, maxWidth = 'max-w-md' }: { children: React.ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} bg-[#181818] border border-gray-800 rounded-xl p-5 md:p-6`}>
        {children}
      </div>
    </div>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs flex items-start gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      {message}
    </div>
  )
}
