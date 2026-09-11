# GlukoTrack

Aplikasi pencatatan gula darah harian. Live, mobile-first, dan datanya tersimpan permanen sebagai file JSON di repo GitHub kamu sendiri (setiap simpan/edit/hapus = 1 commit otomatis ke `data/entries.json`).

## Cara kerja penyimpanan data

Tidak ada database terpisah. Backend (API route Next.js) membaca & menulis langsung ke file `data/entries.json` di repo GitHub kamu lewat GitHub Contents API, menggunakan Personal Access Token yang hanya disimpan sebagai Environment Variable di Vercel (tidak pernah terekspos ke browser).

## Langkah Setup

### 1. Push project ini ke GitHub
Buat repo baru di GitHub (boleh private), lalu push seluruh isi folder ini ke repo tersebut.

```bash
cd glukotrack-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

### 2. Buat Personal Access Token GitHub
1. Buka GitHub → foto profil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token (classic)**.
3. Beri centang scope **repo** (akses penuh ke repo, termasuk baca/tulis file).
4. Generate, lalu **simpan token-nya** (hanya muncul sekali).

### 3. Import project ke Vercel
1. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo GitHub yang tadi kamu push.
2. Sebelum deploy, buka tab **Environment Variables** dan isi:

| Key | Value |
|---|---|
| `GITHUB_TOKEN` | token dari langkah 2 |
| `GITHUB_OWNER` | username/organisasi GitHub kamu |
| `GITHUB_REPO` | nama repo (boleh repo yang sama dengan project ini) |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_DATA_PATH` | `data/entries.json` |

3. Klik **Deploy**.

### 4. Selesai
Buka URL Vercel yang diberikan (mis. `glukotrack.vercel.app`) — bisa langsung dipakai dari HP. Setiap kali kamu isi/edit/hapus tracking, perubahan otomatis ter-commit ke `data/entries.json` di repo GitHub kamu, jadi datanya live dan tidak hilang meski buka dari device lain.

## Menjalankan secara lokal (opsional)
```bash
npm install
cp .env.example .env.local   # lalu isi nilai-nilainya
npm run dev
```
Buka `http://localhost:3000`.

## Catatan
- Karena datanya satu file bersama, kalau dibuka dari 2 device dalam waktu yang nyaris bersamaan, simpanan terakhir yang menang (last write wins) — wajar untuk pemakaian personal/1 orang.
- Jangan pernah commit token asli ke file `.env` ke GitHub — file `.gitignore` sudah menandai `.env*` supaya aman.
