'use client'

import { useState } from 'react'
import { createBoard } from '@/lib/actions/board'
import Link from 'next/link'
import { Plus, X, Folder, Calendar, ArrowRight, Paintbrush } from 'lucide-react'

type Board = {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  archived: boolean
}

export default function BoardListClient({ initialBoards }: { initialBoards: Board[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#6366f1')

  const colors = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
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
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Folder className="w-5 h-5 text-indigo-400" />
          Workspace Board
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
        <div className="bg-[#181818] border border-gray-850 rounded-xl p-16 text-center max-w-lg mx-auto my-12">
          <div className="w-16 h-16 bg-[#202020] border border-gray-800 text-indigo-400 rounded-lg flex items-center justify-center mx-auto mb-5 text-2xl">
            📋
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Belum ada Board</h3>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {initialBoards.map((board) => (
            <Link
              href={`/boards/${board.id}`}
              key={board.id}
              className="group block relative bg-[#181818] border border-gray-850 hover:border-gray-700 rounded-xl p-6 transition-all overflow-hidden"
            >
              {/* Colored top border accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: board.color }}
              />

              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center border border-gray-850"
                  style={{ backgroundColor: `${board.color}15` }}
                >
                  <Folder className="w-5 h-5" style={{ color: board.color }} />
                </div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-bold">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(board.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">
                {board.name}
              </h3>
              
              <p className="text-xs text-gray-400 line-clamp-2 min-h-[2.5rem]">
                {board.description || 'Tidak ada deskripsi.'}
              </p>

              <div className="mt-5 pt-4 border-t border-gray-850 flex items-center justify-between text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">
                <span>Buka Board</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal (Flat UI) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md bg-[#181818] border border-gray-800 rounded-xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-850">
              <h3 className="text-sm font-bold text-white">Buat Board Baru</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors cursor-pointer border border-transparent"
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
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Nama Board
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Projek Website Baru"
                  className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Penjelasan singkat tentang projek..."
                  className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500"
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
                        selectedColor === c
                          ? 'border-white scale-105'
                          : 'border-transparent opacity-80 hover:opacity-100'
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
    </div>
  )
}
