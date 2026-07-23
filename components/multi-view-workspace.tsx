'use client'

import { useState, useMemo, useRef, useCallback, memo } from 'react'
import {
  DndContext,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Table as TableIcon,
  Clock,
  Paperclip,
  User,
  Filter,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
} from 'lucide-react'

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export type Board = {
  id: string
  name: string
  description: string | null
  color: string
}

export type Status = {
  id: string
  name: string
  color: string
  sort_order: number
  is_final: boolean
}

export type TaskType = {
  id: string
  name: string
  color: string
}

export type Member = {
  id: string
  name: string
  color: string
}

export type Task = {
  id: string
  board_id: string
  title: string
  description: string | null
  status_id: string | null
  type_id: string | null
  assignee_id: string | null
  deadline: string | null
  position: number
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: string
  task_id: string
  kind: string
  url: string
  label: string | null
}

function getH5Status(deadlineStr: string | null) {
  if (!deadlineStr) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(deadlineStr)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { level: 'overdue', text: `Lewat ${Math.abs(diffDays)} Hari`, days: diffDays }
  }
  if (diffDays === 0) {
    return { level: 'today', text: 'Hari Ini!', days: 0 }
  }
  if (diffDays <= 5) {
    return { level: 'urgent', text: `H-${diffDays}`, days: diffDays }
  }
  return null
}

// ─────────────────────────────────────────
// Component: MultiViewWorkspace (Highly Optimized)
// ─────────────────────────────────────────
export default function MultiViewWorkspace({
  tasks,
  statuses,
  taskTypes,
  members,
  boards,
  attachments,
  currentBoardId = null,
  onMoveTask,
  onTaskClick,
  onAddTask,
}: {
  tasks: Task[]
  statuses: Status[]
  taskTypes: TaskType[]
  members: Member[]
  boards: Board[]
  attachments: Attachment[]
  currentBoardId?: string | null
  onMoveTask: (taskId: string, targetStatusId: string | null) => void
  onTaskClick: (task: Task) => void
  onAddTask: (statusId: string | null) => void
}) {
  const [activeView, setActiveView] = useState<'kanban' | 'list' | 'calendar' | 'table'>('kanban')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<Date>(new Date())

  // Active column tab for mobile quick switching
  const [activeMobileColumnId, setActiveMobileColumnId] = useState<string | 'unassigned'>(
    statuses[0]?.id || 'unassigned'
  )

  const kanbanContainerRef = useRef<HTMLDivElement>(null)

  // DND State
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  )

  // Filter tasks with memoization
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = t.title.toLowerCase().includes(query)
        const matchDesc = t.description?.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc) return false
      }
      if (selectedTypeId && t.type_id !== selectedTypeId) {
        return false
      }
      if (startDateFilter && t.deadline) {
        const tDate = t.deadline.split('T')[0]
        if (tDate < startDateFilter) return false
      }
      if (endDateFilter && t.deadline) {
        const tDate = t.deadline.split('T')[0]
        if (tDate > endDateFilter) return false
      }
      return true
    })
  }, [tasks, searchQuery, selectedTypeId, startDateFilter, endDateFilter])

  // Sort: closest deadline first!
  const sortedTasksByDeadline = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  }, [filteredTasks])

  // H-5 Urgent tasks
  const urgentTasks = useMemo(() => {
    return sortedTasksByDeadline.filter((t) => {
      const h5 = getH5Status(t.deadline)
      return h5 !== null && (h5.level === 'urgent' || h5.level === 'today' || h5.level === 'overdue')
    })
  }, [sortedTasksByDeadline])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveDragTask(task)
  }, [tasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragTask(null)
    if (!over) return

    const taskId = active.id as string
    const targetStatusId = over.id === 'unassigned' ? null : (over.id as string)

    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status_id !== targetStatusId) {
      onMoveTask(taskId, targetStatusId)
    }
  }, [tasks, onMoveTask])

  const scrollToColumn = useCallback((colId: string) => {
    setActiveMobileColumnId(colId)
    const el = document.getElementById(`kanban-col-${colId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [])

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* ── 🚨 H-5 DEADLINE ALERT WIDGET ── */}
      {urgentTasks.length > 0 && (
        <div className="bg-var-card border border-amber-500/40 rounded-xl p-3.5 sm:p-4 content-visibility-auto">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-var-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
              <h3 className="text-xs font-bold text-var-primary uppercase tracking-wider">
                Tugas Mendesak (≤ 5 Hari) — {urgentTasks.length}
              </h3>
            </div>
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Segera Dikerjakan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {urgentTasks.slice(0, 6).map((task) => {
              const h5 = getH5Status(task.deadline)
              const member = members.find((m) => m.id === task.assignee_id)
              const taskType = taskTypes.find((t) => t.id === task.type_id)
              const board = boards.find((b) => b.id === task.board_id)

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="bg-var-card-subtle border border-var-border hover:border-amber-500/40 p-2.5 rounded-lg cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-var-primary break-words flex-1 leading-snug">
                      {task.title}
                    </span>
                    {h5 && (
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                          h5.level === 'overdue'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : h5.level === 'today'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {h5.text}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-var-secondary pt-1 border-t border-var-border">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {board && !currentBoardId && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white"
                          style={{ backgroundColor: `${board.color}40`, border: `1px solid ${board.color}60` }}
                        >
                          {board.name}
                        </span>
                      )}
                      {taskType && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: `${taskType.color}20`, color: taskType.color }}
                        >
                          {taskType.name}
                        </span>
                      )}
                    </div>
                    {member && (
                      <span className="font-bold text-indigo-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />
                        {member.name}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className="bg-var-card border border-var-border p-3.5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Switcher Tabs */}
          <div className="flex items-center gap-1 bg-var-primary p-1 rounded-lg border border-var-border overflow-x-auto max-w-full no-scrollbar">
            <button
              onClick={() => setActiveView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
                activeView === 'kanban'
                  ? 'bg-indigo-600 text-white'
                  : 'text-var-secondary hover:text-var-primary hover:bg-var-card-subtle'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
                activeView === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-var-secondary hover:text-var-primary hover:bg-var-card-subtle'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Daftar
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
                activeView === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'text-var-secondary hover:text-var-primary hover:bg-var-card-subtle'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Kalender
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
                activeView === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'text-var-secondary hover:text-var-primary hover:bg-var-card-subtle'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabel
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-var-input border border-var-border rounded-lg text-xs text-var-primary placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-var-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-var-border text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-var-secondary font-bold flex items-center gap-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Tipe:
            </span>
            <button
              onClick={() => setSelectedTypeId(null)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex-shrink-0 ${
                selectedTypeId === null
                  ? 'bg-indigo-600 border-indigo-700 text-white'
                  : 'bg-var-input border-var-border text-var-secondary hover:text-var-primary'
              }`}
            >
              Semua
            </button>
            {taskTypes.map((tt) => (
              <button
                key={tt.id}
                onClick={() => setSelectedTypeId(selectedTypeId === tt.id ? null : tt.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex-shrink-0 ${
                  selectedTypeId === tt.id ? 'border-white text-white scale-105' : 'border-transparent opacity-80'
                }`}
                style={{
                  backgroundColor: `${tt.color}25`,
                  color: tt.color,
                  borderColor: selectedTypeId === tt.id ? tt.color : 'transparent',
                }}
              >
                {tt.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-var-secondary flex-shrink-0">Rentang:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="px-2 py-1 bg-var-input border border-var-border rounded text-[11px] text-var-primary"
            />
            <span className="text-gray-600">-</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="px-2 py-1 bg-var-input border border-var-border rounded text-[11px] text-var-primary"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setStartDateFilter('')
                  setEndDateFilter('')
                }}
                className="text-[11px] text-indigo-400 hover:underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── VIEWS RENDER ── */}

      {/* 1. KANBAN VIEW */}
      {activeView === 'kanban' && (
        <div className="space-y-3">
          {/* Mobile Status Column Quick Switcher Pills */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-var-border">
            <span className="text-[10px] font-bold text-var-secondary uppercase tracking-wider flex-shrink-0">
              Geser Kolom:
            </span>
            {statuses.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToColumn(s.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 transition-all cursor-pointer ${
                  activeMobileColumnId === s.id
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                    : 'bg-var-card border-var-border text-var-secondary'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: s.color }} />
                {s.name}
              </button>
            ))}
          </div>

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div
              ref={kanbanContainerRef}
              className="flex gap-3.5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-800 snap-x snap-mandatory touch-pan-x"
            >
              <DroppableColumn
                id="unassigned"
                title="Belum Ditugaskan"
                color="#6b7280"
                tasks={sortedTasksByDeadline.filter((t) => !t.status_id)}
                members={members}
                taskTypes={taskTypes}
                boards={boards}
                currentBoardId={currentBoardId}
                attachments={attachments}
                onTaskClick={onTaskClick}
                onAddTask={() => onAddTask(null)}
              />

              {statuses.map((status) => (
                <DroppableColumn
                  key={status.id}
                  id={status.id}
                  title={status.name}
                  color={status.color}
                  tasks={sortedTasksByDeadline.filter((t) => t.status_id === status.id)}
                  members={members}
                  taskTypes={taskTypes}
                  boards={boards}
                  currentBoardId={currentBoardId}
                  attachments={attachments}
                  onTaskClick={onTaskClick}
                  onAddTask={() => onAddTask(status.id)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDragTask ? (
                <div className="bg-var-card border border-indigo-500 rounded-lg p-3 opacity-90 shadow-2xl scale-105 gpu-accelerated">
                  <span className="text-xs font-bold text-var-primary break-words">{activeDragTask.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* 2. LIST VIEW */}
      {activeView === 'list' && (
        <div className="bg-var-card border border-var-border rounded-xl p-3.5 sm:p-5 space-y-3 content-visibility-auto">
          <div className="flex items-center justify-between pb-3 border-b border-var-border text-xs font-bold text-var-secondary">
            <span>Daftar Tugas (Urut Deadline Terdekat)</span>
            <span>Total: {sortedTasksByDeadline.length}</span>
          </div>

          {sortedTasksByDeadline.length === 0 ? (
            <p className="text-center text-xs text-var-secondary py-8">Tidak ada tugas.</p>
          ) : (
            <div className="space-y-2.5">
              {sortedTasksByDeadline.map((task) => {
                const member = members.find((m) => m.id === task.assignee_id)
                const taskType = taskTypes.find((t) => t.id === task.type_id)
                const status = statuses.find((s) => s.id === task.status_id)
                const board = boards.find((b) => b.id === task.board_id)
                const h5 = getH5Status(task.deadline)

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 bg-var-card-subtle hover:border-gray-600 border border-var-border rounded-lg transition-colors cursor-pointer content-visibility-auto"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: status?.color || '#6b7280' }}
                        title={status?.name || 'Belum Ditugaskan'}
                      />
                      <div className="space-y-1.5 w-full min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {board && !currentBoardId && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white"
                              style={{ backgroundColor: `${board.color}30`, border: `1px solid ${board.color}50` }}
                            >
                              {board.name}
                            </span>
                          )}
                          {taskType && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                              style={{ backgroundColor: `${taskType.color}20`, color: taskType.color }}
                            >
                              {taskType.name}
                            </span>
                          )}
                          {status && (
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-bold"
                              style={{ backgroundColor: `${status.color}15`, color: status.color }}
                            >
                              {status.name}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-var-primary break-words leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-var-secondary break-words whitespace-pre-wrap leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-var-border flex-shrink-0">
                      {task.deadline ? (
                        <div className="flex items-center gap-1 font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          <span className={h5 ? 'text-amber-400' : 'text-var-primary'}>
                            {new Date(task.deadline).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          {h5 && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                h5.level === 'overdue'
                                  ? 'bg-red-500/20 text-red-400'
                                  : h5.level === 'today'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-yellow-500/15 text-yellow-400'
                              }`}
                            >
                              {h5.text}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-var-secondary text-[10px]">Tanpa Deadline</span>
                      )}

                      {member ? (
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-bold"
                          style={{
                            backgroundColor: `${member.color}15`,
                            color: member.color,
                            borderColor: `${member.color}30`,
                          }}
                        >
                          <User className="w-3 h-3" />
                          <span>{member.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-var-secondary italic">Belum diassign</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. CALENDAR VIEW */}
      {activeView === 'calendar' && (
        <CalendarGrid
          tasks={sortedTasksByDeadline}
          selectedMonth={selectedCalendarMonth}
          onChangeMonth={setSelectedCalendarMonth}
          onTaskClick={onTaskClick}
          taskTypes={taskTypes}
          statuses={statuses}
          members={members}
        />
      )}

      {/* 4. TABLE VIEW */}
      {activeView === 'table' && (
        <div className="bg-var-card border border-var-border rounded-xl overflow-x-auto content-visibility-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-var-card-subtle border-b border-var-border text-var-secondary font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Judul Tugas</th>
                {!currentBoardId && <th className="p-3">Board</th>}
                <th className="p-3">Status</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Assignee (Ditugaskan Ke)</th>
                <th className="p-3">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-var-border">
              {sortedTasksByDeadline.map((task) => {
                const member = members.find((m) => m.id === task.assignee_id)
                const taskType = taskTypes.find((t) => t.id === task.type_id)
                const status = statuses.find((s) => s.id === task.status_id)
                const board = boards.find((b) => b.id === task.board_id)
                const h5 = getH5Status(task.deadline)

                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="hover:bg-var-card-subtle cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-var-primary break-words max-w-xs">{task.title}</td>
                    {!currentBoardId && (
                      <td className="p-3 text-var-secondary font-medium">{board?.name || '-'}</td>
                    )}
                    <td className="p-3">
                      {status ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${status.color}20`, color: status.color }}
                        >
                          {status.name}
                        </span>
                      ) : (
                        <span className="text-var-secondary">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {taskType ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: `${taskType.color}20`, color: taskType.color }}
                        >
                          {taskType.name}
                        </span>
                      ) : (
                        <span className="text-var-secondary">-</span>
                      )}
                    </td>
                    <td className="p-3 font-bold">
                      {member ? (
                        <span className="text-indigo-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }} />
                          {member.name}
                        </span>
                      ) : (
                        <span className="text-var-secondary italic">-</span>
                      )}
                    </td>
                    <td className="p-3 font-bold">
                      {task.deadline ? (
                        <span className={h5 ? 'text-amber-400' : 'text-var-primary'}>
                          {new Date(task.deadline).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      ) : (
                        <span className="text-var-secondary">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sortedTasksByDeadline.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-var-secondary">
                    Tidak ada tugas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// Droppable Column (Memoized)
// ─────────────────────────────────────────
const DroppableColumn = memo(function DroppableColumn({
  id,
  title,
  color,
  tasks,
  members,
  taskTypes,
  boards,
  currentBoardId,
  attachments,
  onTaskClick,
  onAddTask,
}: {
  id: string
  title: string
  color: string
  tasks: Task[]
  members: Member[]
  taskTypes: TaskType[]
  boards: Board[]
  currentBoardId: string | null
  attachments: Attachment[]
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      id={`kanban-col-${id}`}
      ref={setNodeRef}
      className={`w-[85vw] max-w-[320px] sm:w-72 flex-shrink-0 snap-center bg-var-card border rounded-xl flex flex-col max-h-[calc(100vh-180px)] overflow-hidden transition-colors ${
        isOver ? 'border-indigo-500 bg-var-card-subtle' : 'border-var-border'
      }`}
    >
      <div className="px-3.5 py-3 border-b border-var-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <h3 className="font-bold text-var-primary text-xs truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="px-2 py-0.5 bg-var-card-subtle border border-var-border text-[10px] font-bold rounded-full text-var-secondary">
            {tasks.length}
          </span>
          <button
            onClick={onAddTask}
            className="p-1 hover:bg-var-card-subtle rounded text-var-secondary hover:text-var-primary transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 touch-pan-y">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            members={members}
            taskTypes={taskTypes}
            boards={boards}
            currentBoardId={currentBoardId}
            attachmentsCount={attachments.filter((a) => a.task_id === task.id).length}
            onClick={() => onTaskClick(task)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="border border-dashed border-var-border rounded-lg p-5 text-center text-[11px] text-var-secondary">
            Tahan & geser tugas ke sini.
          </div>
        )}
      </div>
    </div>
  )
})

// ─────────────────────────────────────────
// Draggable Task Card (Memoized + GPU accelerated)
// ─────────────────────────────────────────
const DraggableTaskCard = memo(function DraggableTaskCard({
  task,
  members,
  taskTypes,
  boards,
  currentBoardId,
  attachmentsCount,
  onClick,
}: {
  task: Task
  members: Member[]
  taskTypes: TaskType[]
  boards: Board[]
  currentBoardId: string | null
  attachmentsCount: number
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const member = members.find((m) => m.id === task.assignee_id)
  const taskType = taskTypes.find((t) => t.id === task.type_id)
  const board = boards.find((b) => b.id === task.board_id)
  const h5 = getH5Status(task.deadline)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative bg-var-card-subtle border border-var-border hover:border-gray-600 rounded-lg p-3 flex flex-col gap-2 transition-colors cursor-pointer touch-manipulation gpu-accelerated content-visibility-auto ${
        isDragging ? 'opacity-30 border-indigo-500' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        {board && !currentBoardId && (
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white truncate max-w-[120px]"
            style={{ backgroundColor: `${board.color}30`, border: `1px solid ${board.color}50` }}
          >
            {board.name}
          </span>
        )}

        {taskType && (
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${taskType.color}15`,
              color: taskType.color,
              border: `1px solid ${taskType.color}30`,
            }}
          >
            {taskType.name}
          </span>
        )}
      </div>

      <h4 className="text-xs font-bold text-var-primary group-hover:text-indigo-400 transition-colors break-words leading-snug">
        {task.title}
      </h4>

      {task.description && (
        <p className="text-[11px] text-var-secondary break-words leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-var-border text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.deadline && (
            <span
              className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border ${
                h5?.level === 'overdue'
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : h5?.level === 'today'
                  ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                  : h5?.level === 'urgent'
                  ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                  : 'text-var-secondary bg-var-primary border-var-border'
              }`}
            >
              <Clock className="w-2.5 h-2.5 text-indigo-400" />
              {new Date(task.deadline).toLocaleDateString('id-ID', {
                month: 'short',
                day: 'numeric',
              })}
              {h5 && <span className="ml-0.5">({h5.text})</span>}
            </span>
          )}

          {attachmentsCount > 0 && (
            <span className="flex items-center gap-0.5 text-var-secondary bg-var-primary px-1.5 py-0.5 rounded border border-var-border">
              <Paperclip className="w-2.5 h-2.5" />
              {attachmentsCount}
            </span>
          )}
        </div>

        {member ? (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold"
            style={{
              backgroundColor: `${member.color}20`,
              color: member.color,
              borderColor: `${member.color}35`,
            }}
          >
            <User className="w-2.5 h-2.5" />
            <span className="truncate max-w-[80px]">{member.name}</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded bg-var-primary flex items-center justify-center text-var-secondary border border-var-border">
            <User className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  )
})

// ─────────────────────────────────────────
// Subcomponent: CalendarGrid (Memoized)
// ─────────────────────────────────────────
const CalendarGrid = memo(function CalendarGrid({
  tasks,
  selectedMonth,
  onChangeMonth,
  onTaskClick,
  taskTypes,
  statuses,
  members,
}: {
  tasks: Task[]
  selectedMonth: Date
  onChangeMonth: (d: Date) => void
  onTaskClick: (task: Task) => void
  taskTypes: TaskType[]
  statuses: Status[]
  members: Member[]
}) {
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = firstDayOfMonth.getDay()

  const daysArray = []
  for (let i = 0; i < startDay; i++) {
    daysArray.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(new Date(year, month, day))
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  return (
    <div className="bg-var-card border border-var-border rounded-xl p-3 sm:p-4 space-y-3 content-visibility-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-var-primary flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChangeMonth(new Date(year, month - 1, 1))}
            className="p-1 bg-var-card-subtle hover:bg-var-border border border-var-border rounded text-var-primary cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeMonth(new Date())}
            className="px-2.5 py-1 bg-var-card-subtle hover:bg-var-border border border-var-border rounded text-[11px] font-bold text-indigo-400 cursor-pointer"
          >
            Bulan Ini
          </button>
          <button
            onClick={() => onChangeMonth(new Date(year, month + 1, 1))}
            className="p-1 bg-var-card-subtle hover:bg-var-border border border-var-border rounded text-var-primary cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-var-secondary border-b border-var-border pb-1.5">
        <span>Min</span>
        <span>Sen</span>
        <span>Sel</span>
        <span>Rab</span>
        <span>Kam</span>
        <span>Jum</span>
        <span>Sab</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((dateObj, idx) => {
          if (!dateObj) {
            return <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-var-primary/50 rounded" />
          }

          const dateStr = dateObj.toISOString().split('T')[0]
          const dayTasks = tasks.filter((t) => t.deadline && t.deadline.startsWith(dateStr))
          const isToday = new Date().toISOString().split('T')[0] === dateStr

          return (
            <div
              key={dateStr}
              className={`h-16 sm:h-24 bg-var-card-subtle border p-1 rounded flex flex-col justify-between overflow-hidden ${
                isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-var-border'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={isToday ? 'text-indigo-400 font-extrabold' : 'text-var-secondary'}>
                  {dateObj.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[8px] bg-indigo-600 text-white px-1 rounded-full font-bold">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 overflow-y-auto scrollbar-none flex-1 mt-0.5">
                {dayTasks.map((t) => {
                  const status = statuses.find((s) => s.id === t.status_id)
                  const member = members.find((m) => m.id === t.assignee_id)
                  return (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className="px-1 py-0.5 rounded text-[8px] font-bold break-words cursor-pointer hover:opacity-80 leading-tight"
                      style={{
                        backgroundColor: status?.color ? `${status.color}35` : '#6366f135',
                        color: status?.color || '#a5b4fc',
                      }}
                      title={`${t.title} ${member ? `(${member.name})` : ''}`}
                    >
                      {t.title} {member && <span className="opacity-75">({member.name})</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
