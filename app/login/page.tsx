'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, undefined)

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#121212] text-gray-200 p-4">
      <div className="w-full max-w-md bg-[#181818] border border-gray-800 p-8 rounded-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Sans Ngatur
          </h1>
          <p className="text-xs text-gray-400">
            Masuk ke akun Anda untuk melanjutkan
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs text-center font-bold">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-gray-300 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-gray-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[#202020] border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-indigo-700 text-xs"
          >
            {isPending ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  )
}
