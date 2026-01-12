# Spesifikasi Update: Restrukturisasi Token & Pricing (Anti-Boncos)

**Tanggal:** 06 Januari 2026
**Status:** Urgent / Wajib Diimplementasikan Segera
**Tujuan:** Menyelaraskan harga jual (Token) dengan biaya modal API (COGS) untuk mencegah kerugian finansial pada fitur high-cost (Veo).

---

## 1. Perubahan Nilai Konsumsi Token (Database Update)

**PENTING:** Struktur lama tidak linier dengan biaya dolar. Update tabel database `token_cost` atau `pricing_rules` dengan nilai baru di kolom **NEW TOKEN** di bawah ini.

**Base Logic:**
* **Cost Base:** 1 Token = ~$0.008 USD (Rp 128 - Rp 130).
* **Ratio:** Token di-scale agar margin profit tetap stabil di 50-60% terlepas dari model AI yang dipilih user.

| Feature / Model | Duration | Provider Cost (Est.) | **OLD Token** (DELETE) | **NEW TOKEN** (APPLY) |
| :--- | :--- | :--- | :--- | :--- |
| **Generate Image** | N/A | $0.167 | 10 | **20** |
| **Kling AI (Standard)** | 5s | $0.20 | 50 | **25** |
| **Kling AI (Standard)** | 10s | $0.40 | 90 | **50** |
| **Kling AI (Pro)** | 5s | $0.35 | 80 | **45** |
| **Kling AI (Pro)** | 10s | $0.70 | 140 | **90** |
| **Veo 3.1 (Fal.ai)** | 5s | $2.00 | 100 ❌ | **250** ✅ |
| **Veo 3.1 (Fal.ai)** | 8s | $3.20 | 160 ❌ | **400** ✅ |

> **Catatan Developer:** Pastikan logika frontend menampilkan estimasi token yang baru sebelum user klik "Generate".

---

## 2. Struktur Paket Top-Up (Pricing Tier)

Implementasikan 3 tier paket ini di halaman pembayaran/billing.

**Target Margin:** ~50% - 60% setelah potong biaya API.

### 📦 Paket 1: Starter (Trial)
* **Harga Jual:** Rp 99.000
* **Total Token:** **300 Token**
* *Use Case:* User bisa coba 1x Veo (Mahal) atau ~12x Kling Std (Murah).

### 📦 Paket 2: Creator (Best Value)
* **Harga Jual:** Rp 299.000
* **Total Token:** **1.000 Token**
* *Use Case:* User rutin, cukup untuk ~40 video Kling standard.

### 📦 Paket 3: Pro / Agency
* **Harga Jual:** Rp 999.000
* **Total Token:** **4.000 Token**
* *Use Case:* Power user, volume tinggi.

---

## 3. Requirement Teknis (Safety Guard)

Untuk menjaga profitabilitas dan UX, mohon implementasikan fitur berikut:

### A. Auto-Refund on Failure (Wajib)
Mengingat API Kling/Fal.ai terkadang gagal generate atau timeout:
1.  Deduct token saat request dikirim (`status: processing`).
2.  Listen ke Webhook/Callback provider.
3.  **IF** `status == 'failed'` **OR** `error` exists:
    * **THEN:** Credit balik token ke balance user secara otomatis.
    * *Reason:* Mencegah komplain user & chargeback karena saldo hilang tapi video tidak ada.

### B. UI Default Selection
1.  Set default model selection ke **Kling Standard 5s (25 Token)**.
2.  Posisikan Veo 3.1 atau Kling Pro sebagai opsi "Advanced/Premium" (jangan default).
3.  Tampilkan label token cost secara real-time saat user mengubah durasi/model.

### C. Token Expiry (Opsional tapi Disarankan)
Set masa aktif token (misal: 60 hari) untuk simplifikasi pembukuan database dan mendorong penggunaan.

---

## 4. Referensi Biaya API (Backend Knowledge)

Sekadar info untuk tim teknis mengenai HPP (Harga Pokok) per request:

* **Kling API:**
    * Std 5s: 2 Credits
    * Pro 10s: 7 Credits
    * *1 Credit ~ $0.02*
* **Fal.ai (Veo):**
    * Billing per second generation ($0.40/detik).
    * 5s = $2.00 flat.
* **Sumopod (Image):**
    * $0.167 per image.
* **Fixed Cost:**
    * Database & Domain: ~$30/bulan (Harus tertutup dari penjualan 3-5 paket pertama).

---
**Approved by:** Owner