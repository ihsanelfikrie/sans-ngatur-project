# AGENTS.md — Sans Ngatur Project

**Sans Ngatur Project** (slug: `sans-ngatur-project`) — aplikasi manajemen tugas pribadi & tim berbasis Kanban, List, Calendar, dan Table.

Dokumen ini adalah panduan kerja untuk siapa pun (manusia atau AI coding agent) yang mengembangkan aplikasi ini. Tujuannya: menjaga project tetap **simpel, konsisten, dan mudah di-maintain** oleh satu orang.

---

## 0. Identitas Project

| Item | Nilai |
|---|---|
| Nama aplikasi | **Sans Ngatur Project** |
| Slug / repo name | `sans-ngatur-project` |
| Package name (`package.json`) | `sans-ngatur-project` |
| Nama project Supabase | `sans-ngatur-project` |
| Nama project Vercel | `sans-ngatur-project` (URL default: `sans-ngatur-project.vercel.app`, bisa custom domain nanti) |
| Tagline (opsional, buat halaman login) | *"Santai ngerjain, tetep rapi ngaturnya."* |

---

## 1. Ringkasan Project

Aplikasi manajemen tugas pribadi & tim berbasis **Kanban** (view utama), dengan tambahan **List**, **Calendar**, dan **Table** view. Semua orang yang punya akses (1 akun/password bersama) bisa membuat tugas, menentukan tipe tugas, deskripsi, penanggung jawab ("ditugaskan ke"), tenggat waktu, dan lampiran (file atau link).

**Multi-board:** dalam 1 project bisa ada beberapa **Board** (kanban) terpisah — misal "Konten Sosmed", "Akademik", "Organisasi" — masing-masing punya kolom/kartu sendiri. Selain itu ada view **"Semua Tugas"** yang menggabungkan tugas dari seluruh board jadi satu tampilan (kanban gabungan / list / calendar / table lintas board), untuk melihat gambaran besar.

**Mobile-friendly:** seluruh UI (kanban, list, calendar, table, form) harus nyaman dipakai di layar HP — bukan sekadar "bisa dibuka", tapi didesain responsive dari awal (lihat Section 6.7).

Status tugas defaultnya:
1. `iDEA` — ide/usulan awal
2. `On Going` — sedang dikerjakan
3. `Done (Belum Diupload)` — selesai dikerjakan, belum publish
4. `Done (Sudah Diupload)` — selesai & sudah publish
5. `Gagal / Batal` — dibatalkan atau tidak lanjut

Status ini **harus bisa di-custom** (tambah, edit nama, ubah warna, ubah urutan) lewat UI, bukan hardcode.

---

## 2. Tech Stack (sengaja disederhanakan)

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG, deploy native di Vercel |
| Bahasa | TypeScript | type-safety untuk schema Supabase |
| Database & Auth | **Supabase** (Postgres + Auth + Storage) | 1 tools untuk DB, login, dan file storage |
| Styling | Tailwind CSS + shadcn/ui | komponen siap pakai, tidak perlu desain dari nol |
| Drag & drop kanban | `@dnd-kit/core` + `@dnd-kit/sortable` (dengan `TouchSensor`) | ringan, populer, dan **native support drag di layar sentuh/HP** |
| Kalender | `react-day-picker` (untuk filter tanggal) + custom month grid | ringan, tidak perlu library kalender berat |
| State/data fetching | Supabase JS client + React Server Components, `@tanstack/react-query` untuk client-side sync (opsional, boleh di-skip di awal) |
| Hosting | **Vercel (Free/Hobby plan)** | otomatis dari Next.js, tanpa biaya |
| File storage | Supabase Storage (bucket `attachments`) | untuk lampiran file, link cukup disimpan sebagai teks URL |

**Prinsip:** hindari menambah dependency baru kecuali benar-benar perlu. Jangan pakai state management library berat (Redux dll.) — cukup React state + Supabase realtime/query.

---

## 3. Autentikasi (super simpel — 1 akun bersama)

Karena hanya butuh 1 akun & password untuk seluruh tim:

- Gunakan **Supabase Auth (email + password)**, buat **1 user** saja di Supabase Dashboard (misal `team@domainkamu.com`).
- Next.js middleware (`middleware.ts`) mengecek session Supabase. Kalau belum login → redirect ke `/login`.
- Halaman `/login` cuma berisi form email + password (bisa hardcode/prefill email supaya makin cepat login).
- **Jangan bikin sistem multi-user Auth** (register, role permission rumit, dll). Itu di luar scope — cukup satu gerbang akses.
- "Ditugaskan ke" (assignee) **bukan** akun login terpisah — itu cuma data di tabel `members` (nama orang tim), dipilih dari dropdown saat bikin tugas. Jadi 1 login bersama, tapi tugas tetap bisa "atas nama" orang tertentu.

---

## 4. Skema Database (Supabase / Postgres)

```sql
-- Board (kanban terpisah per project/kategori tugas)
create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- misal "Konten Sosmed", "Akademik"
  description text,
  color text default '#6366f1',     -- untuk pembeda visual di board switcher
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Anggota tim (bukan akun login, cuma data untuk assignment)
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#6366f1', -- warna avatar/badge
  created_at timestamptz default now()
);

-- Status kanban (GLOBAL, dipakai bersama oleh semua board — supaya "Semua Tugas" tetap konsisten)
create table statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#a3a3a3',
  sort_order int not null default 0,
  is_final boolean default false, -- untuk tandai status "selesai/gagal"
  created_at timestamptz default now()
);

-- Tipe tugas (bisa dikustom user)
create table task_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#0ea5e9',
  created_at timestamptz default now()
);

-- Tugas utama
create table tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  description text,
  status_id uuid references statuses(id) on delete set null,
  type_id uuid references task_types(id) on delete set null,
  assignee_id uuid references members(id) on delete set null,
  deadline timestamptz,
  position int not null default 0, -- urutan dalam kolom kanban
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lampiran (file Supabase Storage ATAU link eksternal)
create table attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  kind text check (kind in ('file','link')) not null,
  url text not null,       -- public URL storage atau link eksternal
  label text,               -- nama tampilan, misal "Draft Desain v2"
  created_at timestamptz default now()
);

-- Seed default statuses
insert into statuses (name, color, sort_order, is_final) values
  ('iDEA', '#a78bfa', 0, false),
  ('On Going', '#3b82f6', 1, false),
  ('Done (Belum Diupload)', '#f59e0b', 2, false),
  ('Done (Sudah Diupload)', '#22c55e', 3, true),
  ('Gagal / Batal', '#ef4444', 4, true);

-- Seed 1 board default supaya app langsung bisa dipakai
insert into boards (name, description, sort_order) values
  ('Umum', 'Board default untuk tugas umum', 0);
```

> **Kenapa `statuses` & `task_types` dibuat global (bukan per-board)?** Supaya view **"Semua Tugas"** bisa menggabungkan kartu dari berbagai board dalam satu kanban yang konsisten (kolom yang sama artinya di semua board). Kalau nanti butuh status unik per board, tambahkan kolom `board_id nullable` di `statuses` (null = berlaku global, terisi = khusus board itu) — tapi jangan dibuat dari awal kalau belum benar-benar perlu.

**RLS (Row Level Security):** karena hanya 1 akun yang bisa login, aktifkan RLS sederhana: `auth.role() = 'authenticated'` boleh select/insert/update/delete di semua tabel di atas. Tidak perlu rule per-user yang rumit.

**Storage bucket:** buat bucket `attachments` (public read, authenticated write) untuk upload file.

---

## 5. Struktur Folder (Next.js App Router)

```
/app
  /login/page.tsx
  /(app)/                     # route group setelah login
    layout.tsx                # sidebar (desktop) / bottom-nav (mobile) + board switcher
    /boards/
      page.tsx                 # daftar semua board (grid/list, + tombol "Board Baru")
      /[boardId]/
        /kanban/page.tsx        # kanban khusus board ini
        /list/page.tsx
        /calendar/page.tsx
        /table/page.tsx
    /all/                       # view "Semua Tugas" (gabungan lintas board)
      /kanban/page.tsx
      /list/page.tsx
      /calendar/page.tsx
      /table/page.tsx
    /settings/
      boards/page.tsx           # CRUD board
      statuses/page.tsx         # CRUD status custom
      types/page.tsx            # CRUD tipe tugas
      members/page.tsx          # CRUD anggota tim
  /api/                        # kalau perlu route handler tambahan
/components
  /kanban/                     # Board, Column, TaskCard, DragOverlay
  /task/                       # TaskFormDialog, TaskDetailDialog, AttachmentList
  /calendar/                   # MonthGrid, DayFilter
  /nav/                        # BoardSwitcher, Sidebar, BottomNav (mobile)
  /shared/                     # StatusBadge, TypeBadge, AssigneeAvatar
/lib
  supabase/
    client.ts                  # browser client
    server.ts                  # server client (RSC/actions)
    middleware.ts
  actions/                     # Server Actions: createTask, updateTaskStatus, dst.
/middleware.ts
/types/database.ts             # hasil `supabase gen types typescript`
```

---

## 6. Fitur Utama & Detail Perilaku

### 6.0 Board Switcher & "Semua Tugas"
- **Board switcher** ada di sidebar (desktop) / dropdown atas (mobile) — daftar board diambil dari tabel `boards`, urut sesuai `sort_order`.
- Setiap board = satu ruang kerja kanban/list/calendar/table yang terisolasi (`tasks.board_id`).
- View **"Semua Tugas"** (`/all/...`) query tanpa filter `board_id` — tiap kartu di sana menampilkan **label board asal** (chip kecil warna sesuai `boards.color`) supaya tetap jelas asalnya.
- Bikin board baru = 1 form simpel: nama, deskripsi (opsional), warna. Tidak perlu setting kompleks per board (status & tipe tetap global, lihat Section 4).
- Board bisa diarsipkan (bukan dihapus permanen) — tambahkan kolom `archived boolean default false` di `boards` kalau fitur ini dibutuhkan nanti.

### 6.1 Kanban (utama)
- Kolom = `statuses`, diurutkan berdasar `sort_order`.
- Drag-and-drop kartu antar kolom → update `status_id` + `position` via Server Action, optimistic update di UI.
- Drag-and-drop kartu dalam satu kolom → reorder `position`.
- Kartu tugas menampilkan: judul, badge tipe, badge assignee (avatar + warna), tanggal deadline (merah kalau lewat/mendekati), dan (khusus di view "Semua Tugas") chip nama board.
- Klik kartu → buka dialog detail (edit deskripsi, ubah tipe/assignee/deadline, kelola lampiran).
- Tombol "+ Tugas Baru" di tiap kolom & di header — otomatis terikat ke `board_id` board yang sedang dibuka (kecuali di "Semua Tugas", form minta pilih board tujuan).

### 6.2 Form Tambah/Edit Tugas
Field:
- Judul (wajib)
- Tipe tugas (dropdown, bisa tambah tipe baru langsung dari form)
- Deskripsi (textarea/rich text sederhana)
- Ditugaskan ke (dropdown member, bisa tambah member baru langsung dari form)
- Tenggat waktu (date + time picker)
- Status (default `iDEA` untuk tugas baru)
- Lampiran: upload file (ke Supabase Storage) **atau** tempel link (disimpan sebagai teks) — bisa lebih dari satu.

### 6.3 List View
- Semua tugas dalam satu list vertikal, dikelompokkan per status atau flat.
- Filter: by status, by tipe, by assignee, by rentang deadline.
- Sort: by deadline terdekat, by terbaru dibuat.

### 6.4 Calendar View (dioptimalkan)
- Tampilan grid bulanan, tugas muncul di tanggal `deadline`-nya (badge warna sesuai tipe/status).
- **Filter bulan**: navigasi ‹ Bulan Ini › dengan cepat pindah bulan.
- **Filter tanggal spesifik**: klik satu tanggal → panel samping/bawah menampilkan hanya tugas di tanggal itu.
- Opsi filter tambahan: by status, by assignee (dropdown di atas kalender).
- Tugas tanpa deadline **tidak tampil** di calendar (tetap tampil di kanban/list/table).

### 6.5 Table View
- Tabel dengan kolom: Judul, Tipe, Status, Assignee, Deadline, Lampiran (jumlah), Dibuat.
- Sortable per kolom, filter cepat di atas tabel, search by judul.
- Cocok untuk laporan/rekap cepat.

### 6.6 Pengaturan (Settings)
- CRUD Board: tambah/edit nama, deskripsi, warna, urutan.
- CRUD Status: tambah/edit nama, warna, urutan (drag reorder), tandai `is_final`.
- CRUD Tipe Tugas: tambah/edit nama & warna.
- CRUD Anggota Tim: tambah/edit nama & warna avatar.

### 6.7 Mobile-Friendly (wajib, bukan opsional)
- **Layout**: sidebar desktop berubah jadi **bottom navigation bar** di layar < 768px (5 ikon: Kanban, List, Calendar, Table, Settings) + board switcher jadi dropdown di top bar.
- **Kanban di mobile**: kolom status di-scroll **horizontal** (snap-scroll per kolom, 1 kolom ≈ lebar layar), bukan dipaksa muat semua kolom sekaligus.
- **Drag-and-drop di HP**: pakai `TouchSensor` dari dnd-kit dengan delay kecil (misal 150ms) supaya tidak bentrok dengan scroll biasa. Sebagai fallback, sediakan juga cara pindah status tanpa drag — misal dropdown status singkat di tiap kartu — supaya tetap bisa dipakai walau drag di HP terasa sulit.
- **Form tambah/edit tugas**: dialog jadi **full-screen sheet** di mobile (bukan modal kecil di tengah layar), input besar dan mudah disentuh, date/time picker native-friendly.
- **Calendar di mobile**: grid bulan tetap ringkas (angka + titik indikator jumlah tugas), tap tanggal → buka daftar tugas hari itu di bawah/bottom-sheet, bukan tooltip kecil yang susah disentuh.
- **Table di mobile**: kolom yang kurang penting disembunyikan otomatis di layar kecil (tampilkan Judul, Status, Deadline saja), sisanya terlihat saat tap baris untuk expand.
- Uji breakpoint minimal: **375px** (HP kecil), **768px** (tablet), **1280px** (desktop) — gunakan Tailwind breakpoints (`sm`, `md`, `lg`) secara konsisten, jangan bikin breakpoint custom sembarangan.

---

## 7. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # hanya dipakai di server actions kalau perlu bypass RLS untuk task admin
```

Simpan di `.env.local` untuk dev, dan di Vercel Project Settings → Environment Variables untuk production.

---

## 8. Perintah Setup & Development

```bash
npx create-next-app@latest sans-ngatur-project --typescript --tailwind --app
cd sans-ngatur-project
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable react-day-picker date-fns

# generate types dari schema Supabase (setelah tabel dibuat)
npx supabase gen types typescript --project-id <project-id> > types/database.ts

npm run dev
```

---

## 9. Konvensi Kode (untuk agent/kontributor)

- Gunakan **Server Actions** (`"use server"`) untuk semua mutasi (create/update/delete task, ubah status, upload lampiran) — hindari bikin banyak API route manual.
- Gunakan **Server Components** untuk fetch data awal (kanban board, list, table), gunakan Client Component hanya untuk bagian interaktif (drag-drop, dialog form, filter kalender).
- Semua warna status/tipe disimpan sebagai hex di DB, ditampilkan lewat komponen `Badge` yang konsisten — jangan hardcode warna di banyak tempat.
- Penamaan file: `kebab-case` untuk file, `PascalCase` untuk komponen React.
- Jangan menambah tabel/kolom baru di luar skema di atas tanpa mendokumentasikan alasannya di file ini.
- Optimistic UI untuk drag-and-drop kanban (update tampilan dulu, baru sync ke Supabase; rollback kalau gagal).
- Validasi input pakai `zod` (opsional tapi disarankan) sebelum Server Action menyentuh DB.

---

## 10. Deployment (Vercel — Free Plan)

1. Push repo ke GitHub.
2. Import project di [vercel.com](https://vercel.com) → pilih repo.
3. Set Environment Variables (sama seperti `.env.local`).
4. Build command default (`next build`) sudah cukup, tidak perlu konfigurasi tambahan.
5. Free/Hobby plan Vercel cukup untuk trafik personal/tim kecil — cek batas terbaru di [vercel.com/docs/limits](https://vercel.com/docs/limits) kalau tim berkembang.

---

## 11. Yang Sengaja **Tidak** Dibuat (untuk menjaga simplicity)

- ❌ Multi-user auth dengan role/permission granular
- ❌ Notifikasi real-time/push (bisa ditambah belakangan pakai Supabase Realtime kalau perlu)
- ❌ Komentar/thread diskusi per tugas (bisa jadi v2)
- ❌ Rich text editor kompleks untuk deskripsi (textarea polos dulu sudah cukup)

Kalau ada kebutuhan baru di luar daftar ini, tambahkan sebagai section baru di file ini dulu sebelum mulai coding — supaya scope tetap terkendali.