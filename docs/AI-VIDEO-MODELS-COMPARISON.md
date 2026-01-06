# Perbandingan Komprehensif AI Video Generator 2025

> Dokumen ini berisi perbandingan lengkap model AI untuk generate video, termasuk pricing, fitur, durasi maksimal, audio support, dan rekomendasi untuk kebutuhan bisnis.

---

## ⚠️ PENTING: Status API Availability

| Model | Web App | API Available | Audio via API | Extend via API |
|-------|---------|---------------|---------------|----------------|
| Kling AI v1.5 | ✅ | ✅ `kling-v1-5` | ✅ Video-to-Audio | ✅ |
| Kling AI v2.6 | ✅ | ❌ Belum tersedia | ❌ | ❌ |
| Hailuo/MiniMax | ✅ | ✅ via AIML API | ❌ | ❌ |
| Google Veo 3 | ✅ | ✅ Flow API | ✅ Native | ❌ |
| Runway Gen-4 | ✅ | ✅ | ❌ | ❌ |
| Sora 2 | ✅ | ❌ | ✅ Native | ❌ |
| Luma Ray2 | ✅ | ✅ | ❌ | ❌ |

---

## Ringkasan Eksekutif

| Model | Harga Mulai | Max Durasi | Audio | Resolusi | Commercial Use |
|-------|-------------|------------|-------|----------|----------------|
| **Kling AI v1.5** | $9.79 (trial) | 10 detik | Ya (V2A API) | 1080p | Ya |
| **Hailuo 2.3** | ~$0.28/video | 6 detik | ❌ | 1080p | Ya |
| **Runway Gen-4** | $12/bulan | ~10 detik | ❌ | 4K | Ya (dari Pro) |
| **Luma Ray2** | $9.99/bulan | 10 detik | ❌ | 4K | Ya |
| **Google Veo 3** | $19.99/bulan | 8 detik | **✅ Native** | 1080p | Ya (watermark) |
| **OpenAI Sora 2** | $200/bulan (Pro) | 20 detik | **✅ Native** | 1080p | Ya |
| **Dreamina** | Free tier | 5 detik | ✅ | 1080p | Ya |

---

## 🎯 REKOMENDASI: Alternatif Veo 3.1 dengan Audio + Extend

### Pilihan Terbaik untuk API dengan Audio:

| Ranking | Model | Audio | Extend | Harga/Video | Catatan |
|---------|-------|-------|--------|-------------|---------|
| 1️⃣ | **Kling v1.5 + V2A** | ✅ Video-to-Audio | ✅ | ~$0.50 | **SUDAH DIPAKAI** - Best value |
| 2️⃣ | **Hailuo 2.3 via AIML** | ❌ | ❌ | ~$0.28 | Kualitas bagus, tanpa audio |
| 3️⃣ | **Veo 3 Fast** | ✅ Native | ❌ | ~$1.50 | Mahal tapi audio terbaik |
| 4️⃣ | **Dreamina** | ✅ | ❌ | Free tier | ByteDance, masih beta |

### Kesimpulan:
**Kling AI v1.5 yang Anda gunakan adalah pilihan TERBAIK** untuk kombinasi:
- ✅ API tersedia & stabil
- ✅ Audio via Video-to-Audio API  
- ✅ Video Extend support
- ✅ Harga 3x lebih murah dari Veo 3

---

## 1. Kling AI (by Kuaishou)

### ⚠️ API Model Availability

| Model | Status API | Fitur |
|-------|------------|-------|
| `kling-v1-5` | ✅ Tersedia | Image2Video, Text2Video, Extend, V2A |
| `kling-v2-0` | ❌ Belum | - |
| `kling-v2-6` | ❌ Belum | Native audio di web app saja |

### Pricing Plans

| Paket | Harga | Units/Credits |
|-------|-------|---------------|
| Trial Package | $9.79 | 100 units |
| Standard Package | $97.99 | 1,000 units |
| Pro Package | $349.99 | 4,000 units |
| Enterprise | Custom | Custom |

### Credit Cost per Video

| Durasi | Mode | Units | Estimasi App Tokens |
|--------|------|-------|---------------------|
| 5 detik | Standard | 3 units | ~45 tokens |
| 5 detik | Pro | 4 units | ~60 tokens |
| 10 detik | Standard | 6 units | ~90 tokens |
| 10 detik | Pro | 8 units | ~120 tokens |

### Fitur Lengkap

- **Text to Video** - Generate video dari prompt teks
- **Image to Video** - Animasi gambar statis menjadi video
- **Multi-Image to Video** - Gabungkan beberapa gambar jadi video
- **Video Extension** - Perpanjang video yang sudah ada
- **Virtual Try-On** - Coba pakaian secara virtual
- **AI Avatar** - Buat avatar digital
- **Lip Sync** - Sinkronisasi gerakan bibir
- **Video Effects** - Efek visual pada video
- **Text to Audio** - Generate audio dari teks
- **Video to Audio** - Generate audio dari video

### Spesifikasi Teknis

- **Max Durasi**: 10 detik (dapat diperpanjang)
- **Resolusi**: 720p - 1080p
- **Frame Rate**: 30 FPS
- **Aspect Ratio**: 16:9, 9:16, 1:1
- **Audio**: Ya (Text-to-Audio, Video-to-Audio)
- **API**: Ya (JWT Authentication)

---

## 2. Runway (Gen-4 & Gen-3 Alpha)

### Pricing Plans

| Plan | Harga/Bulan | Credits/Bulan | Per Video (10s) |
|------|-------------|---------------|-----------------|
| Free | $0 | 125 credits | ~2 video |
| Standard | $12 | 625 credits | ~12 video |
| Pro | $28 | 2,250 credits | ~45 video |
| Unlimited | $76 | Unlimited | Unlimited |
| Enterprise | Custom | Custom | Custom |

### Model Tersedia

| Model | Kecepatan | Kualitas | Credits/5s |
|-------|-----------|----------|------------|
| Gen-4.5 | Medium | Highest | ~50 |
| Gen-4 | Fast | High | ~40 |
| Gen-3 Alpha Turbo | Fastest | Good | ~25 |

### Fitur Lengkap

- **Text to Video** - Prompt teks ke video
- **Image to Video** - Animasi gambar
- **Video to Video** - Transform style video
- **Motion Brush** - Kontrol gerakan spesifik area
- **Camera Control** - Kontrol pergerakan kamera
- **Director Mode** - Advanced creative control
- **Gen Lock** - Konsistensi karakter
- **Upscale** - Tingkatkan resolusi hingga 4K

### Spesifikasi Teknis

- **Max Durasi**: ~10 detik (5-10s tergantung credits)
- **Resolusi**: 720p - 4K (dengan upscale)
- **Frame Rate**: 24 FPS
- **Audio**: Tidak (silent output)
- **API**: Ya (RESTful)
- **Platforms**: Web, iOS, Desktop

### Kelebihan
- UI/UX paling polished dan user-friendly
- Motion Brush untuk kontrol presisi
- Komunitas kreatif yang aktif
- Integrasi dengan creative tools populer

### Kekurangan
- Tidak ada audio generation
- Credit cepat habis untuk video berkualitas tinggi
- Mahal untuk produksi volume tinggi

---

## 3. Pika Labs

### Pricing Plans

| Plan | Harga/Bulan | Credits/Bulan | Video/Bulan |
|------|-------------|---------------|-------------|
| Free | $0 | 80 credits | ~8 video |
| Standard | $8 | 700 credits | ~70 video |
| Pro | $28 | 2,300 credits | ~230 video |
| Fancy | $76 | 6,000 credits | ~600 video |

### Credit Cost per Generation

| Fitur | Credits |
|-------|---------|
| Standard Video (5s) | 10 credits |
| Extended Video (10s) | 20 credits |
| Pikaframes (25s) | 50 credits |
| Lip Sync | 15 credits |
| Upscale 1080p | 10 credits |

### Fitur Lengkap

- **Text to Video** - Generate dari prompt
- **Image to Video** - Animasi gambar
- **Pikaframes** - Video hingga 25 detik
- **Lip Sync** - Sinkronisasi audio ke video
- **Modify Region** - Edit area spesifik
- **Expand Canvas** - Perluas frame video
- **Pikaffects** - Efek visual (melt, explode, crush, dll)

### Spesifikasi Teknis

- **Max Durasi**: 25 detik (dengan Pikaframes)
- **Resolusi**: 720p - 1080p
- **Frame Rate**: 24 FPS
- **Audio**: Lip Sync only (tidak generate audio)
- **API**: Ya (beta)

### Kelebihan
- Pikaframes untuk video lebih panjang (25s)
- Harga entry-level sangat terjangkau ($8)
- Pikaffects untuk efek kreatif unik
- Lip sync terintegrasi

### Kekurangan
- Tidak ada native audio generation
- Kualitas lebih rendah dari kompetitor
- API masih beta

---

## 4. Luma AI Dream Machine (Ray3)

### Pricing Plans (Yearly Billing - Save 20%)

| Plan | Harga/Bulan | Credits/Bulan | Video (Draft) |
|------|-------------|---------------|---------------|
| Free | $0 | - | 8 video |
| Lite | $7.99 | 3,200 credits | ~50 video |
| Plus | $23.99 | 10,000 credits | ~160 video |
| Unlimited | $75.99 | 10,000 + Relaxed | Unlimited |
| Enterprise | Custom | 20,000+ credits | Custom |

### Credit Cost per Video

| Model | Resolusi | HDR | Durasi | Credits |
|-------|----------|-----|--------|---------|
| Ray3 Draft | - | - | 5s | 60 |
| Ray3 Draft | - | - | 10s | 120 |
| Ray3 | 540p | SDR | 5s | 160 |
| Ray3 | 540p | SDR | 10s | 320 |
| Ray3 | 720p | SDR | 5s | 320 |
| Ray3 | 720p | SDR | 10s | 640 |
| Ray3 | 720p | HDR | 5s | 600 |
| Ray3 | 720p | HDR | 10s | 1,200 |
| Ray2 Flash | 720p | SDR | 5s | 55 |
| Ray2 Flash | 1080p | SDR | 10s | 130 |

### Fitur Lengkap

- **Text to Video** - Generate dari teks
- **Image to Video** - Animasi gambar
- **Extend** - Perpanjang video
- **Modify** - Edit video yang ada
- **References** - Gunakan referensi visual
- **Image Generation** - Generate gambar (Photon)
- **Reframe** - Ubah aspect ratio
- **Upscale** - Tingkatkan resolusi ke 4K
- **HDR** - High Dynamic Range output
- **Reasoning** - AI understand complex prompts

### Spesifikasi Teknis

- **Max Durasi**: 10 detik
- **Resolusi**: Draft - 4K (dengan upscale)
- **HDR**: Ya (Plus ke atas)
- **Audio**: Tidak
- **Concurrency**: 1-4 (tergantung plan)
- **API**: Ya

### Kelebihan
- Ray3 model sangat advanced untuk physics
- HDR support untuk kualitas sinematik
- 4K upscale tersedia
- Unlimited mode dengan relaxed processing

### Kekurangan
- Tidak ada audio generation
- Credit cost tinggi untuk HDR
- Free plan sangat terbatas (8 video)

---

## 5. Hailuo AI / MiniMax

### Pricing Plans

| Plan | Harga/Bulan | Credits/Bulan | Video/Bulan |
|------|-------------|---------------|-------------|
| Free | $0 | 500 + 100/hari | ~15 video |
| Standard | $14.99 | 1,000 credits | ~30 video |
| Pro | $54.99 | 4,500 credits | ~140 video |
| Master | $119.99 | 10,000 credits | ~300 video |
| Ultra | $124.99 | 12,000+ credits | ~400 video |
| Max | $199.99 | 15,000+ credits | ~500 video |

### Credit Cost per Video

| Konfigurasi | Credits |
|-------------|---------|
| 6s HD (768p) | ~30-50 credits |
| 6s Full HD (1080p) | ~50-70 credits |
| 10s HD | ~60-100 credits |

### Fitur Lengkap

- **Text to Video** - Hailuo 02, 2.3, 2.3-Fast models
- **Image to Video** - Animasi gambar
- **Director Mode** - Camera control (dolly, zoom, orbit)
- **S2V-01** - Subject consistency/identity preservation
- **AI Music Composer** - Background music generation
- **Voice Cloning** - Clone suara untuk voice-over
- **Text-to-Speech** - Voice generation
- **Image Generation** - Generate gambar
- **Physics Engine** - Realistic motion simulation

### Spesifikasi Teknis

- **Max Durasi**: 6-10 detik
- **Resolusi**: 768p - 1080p (4K untuk business tier)
- **Frame Rate**: 24-30 FPS
- **Audio**: Ya (TTS, Voice Clone, Music)
- **API**: Ya (juga via Fal.ai ~$0.28/video)

### Kelebihan
- Physics engine sangat realistis
- Audio generation terintegrasi (musik, voice)
- Director mode untuk camera control
- Subject consistency dengan S2V-01
- Model Hailuo 02 sangat competitive (#2 di leaderboard)

### Kekurangan
- Durasi standar hanya 6 detik
- Credit system bisa membingungkan
- Daily bonus credits dihapus (Juni 2025)

---

## 6. Google Veo 3 / Veo 3.1

### Pricing Plans

| Akses | Harga | Inklusif |
|-------|-------|----------|
| Google AI Pro | $19.99/bulan | 90 Veo 3.1 Fast videos |
| Google One AI Premium | $24.99/bulan | Akses Veo + Gemini |
| API (Pay-as-you-go) | Variable | Per-second billing |

### API Pricing (Per Detik)

| Model | Video Only | Video + Audio |
|-------|------------|---------------|
| Veo 3.1 Fast | $0.10/s | $0.15/s |
| Veo 3.1 Standard | $0.40/s | - |
| Veo 3.0 Full | $0.50/s | $0.75/s |

### Estimasi Biaya per Video

| Durasi | Veo 3.1 Fast + Audio | Veo 3.0 Full + Audio |
|--------|----------------------|----------------------|
| 8 detik | $1.20 | $6.00 |
| 30 detik | $4.50 | $22.50 |
| 60 detik | $9.00 | $45.00 |

### Fitur Lengkap

- **Text to Video** - Generate dari prompt
- **Image to Video** - Animasi gambar
- **Native Audio Generation** - Dialog, SFX, ambient sound
- **Lip Sync** - Sinkronisasi otomatis
- **Multimodal Input** - Kombinasi text/image/video
- **HD Output** - 720p - 1080p
- **Aspect Ratio** - 16:9, 9:16 (vertical)
- **Extended Videos** - Hingga 64 detik dengan chaining

### Spesifikasi Teknis

- **Max Durasi**: 8 detik (extendable hingga 60+ detik)
- **Resolusi**: 720p - 1080p
- **Audio**: **Ya (Native - dialog, SFX, musik)**
- **API**: Ya (Gemini API, Vertex AI)
- **Platforms**: Gemini App, Flow Editor

### Kelebihan
- **Native audio generation** - Tidak perlu tools terpisah
- Video durasi panjang (hingga 60 detik)
- Integrasi dengan Google ecosystem
- Veo 3.1 Fast sangat affordable
- Lip sync otomatis berkualitas tinggi

### Kekurangan
- API masih preview (rate limits)
- Membutuhkan Google account
- Tidak tersedia di semua region

---

## 7. OpenAI Sora 2

### Pricing Plans

| Akses | Harga | Inklusif |
|-------|-------|----------|
| ChatGPT Plus | $20/bulan | 50 video 480p |
| ChatGPT Pro | $200/bulan | Unlimited + 1080p + 20s |
| API | $0.10-$0.50/s | Pay-as-you-go |

### API Pricing

| Tier | Harga/Detik | Per Video 10s |
|------|-------------|---------------|
| Standard | $0.10/s | $1.00 |
| Pro | $0.25/s | $2.50 |
| Premium | $0.50/s | $5.00 |

### Fitur Lengkap

- **Text to Video** - Generate dari prompt
- **Image to Video** - Animasi gambar
- **Native Audio** - Dialog dan sound effects
- **Character Injection** - Masukkan orang/objek real ke video
- **Voice Cloning** - Clone suara untuk karakter
- **Lip Sync** - Sinkronisasi otomatis
- **Physics Accuracy** - Simulasi fisika realistis
- **Aspect Ratio** - 16:9, 9:16, 1:1

### Spesifikasi Teknis

- **Max Durasi**: 20 detik (Pro)
- **Resolusi**: 480p (Plus) - 1080p (Pro)
- **Audio**: **Ya (Native - dialog, SFX)**
- **API**: Ya (beta)
- **Platforms**: ChatGPT, Sora App (iOS)

### Kelebihan
- Kualitas tertinggi untuk realism
- Native audio dengan lip sync
- Character injection unik
- Integrasi dengan OpenAI ecosystem

### Kekurangan
- Sangat mahal ($200/bulan untuk full access)
- Availability terbatas (invite-only di beberapa region)
- API pricing tidak kompetitif

---

## 8. Synthesia (Avatar-Based)

### Pricing Plans

| Plan | Harga/Bulan | Video Minutes | Avatars |
|------|-------------|---------------|---------|
| Free | $0 | 3 menit/bulan | 6 stock |
| Starter | $18 (yearly) | 10 menit/bulan | 30+ stock |
| Creator | $64 (yearly) | 30 menit/bulan | 230+ + 1 custom |
| Enterprise | Custom | Unlimited | Unlimited custom |

### Add-on Costs

| Add-on | Harga |
|--------|-------|
| Custom Avatar | $1,000/tahun/avatar |
| Extra Minutes | Variable |
| SCORM Export | Enterprise only |

### Fitur Lengkap

- **Text to Video** - Script ke video dengan avatar
- **230+ AI Avatars** - Stock presenters
- **Custom Avatar** - Digital twin Anda
- **140+ Languages** - Multi-language support
- **250+ Templates** - Business templates
- **1-Click Translation** - Auto dubbing
- **AI Voice** - Text-to-speech berkualitas
- **Screen Recording** - Gabungkan dengan screen capture

### Spesifikasi Teknis

- **Max Durasi**: Unlimited (credit-based)
- **Resolusi**: 1080p Full HD
- **Audio**: Ya (TTS dengan banyak voice)
- **Languages**: 140+ bahasa
- **API**: Ya (Creator+)

### Kelebihan
- Perfect untuk training & corporate video
- Multi-language tanpa reshoot
- Konsisten (avatar selalu sama)
- Templates siap pakai

### Kekurangan
- Avatar-based (bukan generative creative)
- Custom avatar mahal ($1,000/tahun)
- Tidak cocok untuk creative/artistic content
- Lip sync kadang tidak natural

---

## 9. Stable Video Diffusion (Open Source)

### Pricing (Self-Hosted)

| Opsi | Estimasi Biaya |
|------|----------------|
| Local GPU (RTX 4090) | $0 (hardware cost) |
| Cloud GPU Rental | $0.35-$1.50/jam |
| API Services | $0.01-$0.10/video |

### Licensing

| License | Syarat | Harga |
|---------|--------|-------|
| Community | Revenue < $1M | Gratis |
| Enterprise | Revenue > $1M | Custom |

### Fitur

- **Image to Video** - Animasi gambar
- **Text to Video** - Via community models
- **Open Source** - Full control
- **Self-Hosted** - No API limits
- **Custom Training** - Fine-tune model

### Spesifikasi Teknis

- **Max Durasi**: 4-14 detik (tergantung config)
- **Resolusi**: 576p - 1024p
- **Frame Rate**: 3-30 FPS (configurable)
- **Audio**: Tidak
- **Processing**: 2 menit atau kurang

### Kelebihan
- Gratis untuk revenue < $1M
- Full control dan privacy
- Tidak ada usage limits
- Bisa fine-tune untuk use case spesifik

### Kekurangan
- Membutuhkan technical expertise
- GPU requirement tinggi
- Tidak ada audio
- Kualitas di bawah commercial options
- API tidak lagi tersedia dari Stability

---

## Perbandingan Fitur Detail

### Audio Capabilities

| Model | Native Audio | TTS | Music | Voice Clone | Lip Sync |
|-------|--------------|-----|-------|-------------|----------|
| Kling AI | Partial | Ya | - | - | Ya |
| Runway | Tidak | - | - | - | - |
| Pika Labs | Tidak | - | - | - | Ya |
| Luma AI | Tidak | - | - | - | - |
| Hailuo AI | Ya | Ya | Ya | Ya | - |
| Google Veo 3 | **Ya** | Ya | Ya | - | Ya |
| OpenAI Sora 2 | **Ya** | - | Ya | Ya | Ya |
| Synthesia | - | Ya | - | - | Ya |

### Maximum Video Duration

| Model | Standard | Extended | Maximum |
|-------|----------|----------|---------|
| Kling AI | 5s | 10s | 10s+ (chain) |
| Runway | 5s | 10s | 10s |
| Pika Labs | 5s | 10s | **25s** |
| Luma AI | 5s | 10s | 10s |
| Hailuo AI | 6s | 10s | 10s |
| Google Veo 3 | 8s | 30s | **60s** |
| OpenAI Sora 2 | 10s | 20s | 20s |
| Synthesia | Unlimited | - | Script-based |

### Resolution & Quality

| Model | Standard | Max | HDR | 4K |
|-------|----------|-----|-----|-----|
| Kling AI | 720p | 1080p | - | - |
| Runway | 720p | 1080p | - | Ya (upscale) |
| Pika Labs | 720p | 1080p | - | - |
| Luma AI | 540p | 720p | **Ya** | Ya (upscale) |
| Hailuo AI | 768p | 1080p | - | Ya (business) |
| Google Veo 3 | 720p | 1080p | - | - |
| OpenAI Sora 2 | 480p | 1080p | - | - |
| Synthesia | 1080p | 1080p | - | - |

---

## Rekomendasi Berdasarkan Use Case

### 1. Marketing & Advertising
**Rekomendasi: Hailuo AI atau Google Veo 3**

- Hailuo AI: Physics engine realistis, director mode, affordable
- Google Veo 3: Native audio, video panjang untuk storytelling
- Budget: $15-50/bulan

### 2. Social Media Content
**Rekomendasi: Pika Labs atau Runway**

- Pika Labs: Harga terjangkau, Pikaframes untuk video 25s
- Runway: Creative effects, motion brush
- Budget: $8-28/bulan

### 3. Product Showcase / E-commerce
**Rekomendasi: Kling AI**

- Image-to-video berkualitas tinggi
- Virtual try-on untuk fashion
- Harga sangat kompetitif
- Budget: $10-100 (credit-based)

### 4. Training & Corporate
**Rekomendasi: Synthesia**

- Avatar presenter profesional
- 140+ bahasa untuk global team
- Templates untuk berbagai kebutuhan
- Budget: $18-64/bulan

### 5. High-End Production
**Rekomendasi: OpenAI Sora 2 atau Google Veo 3**

- Kualitas tertinggi
- Native audio generation
- Realistic physics
- Budget: $20-200/bulan

### 6. Startup / Budget-Conscious
**Rekomendasi: Stable Video Diffusion (self-hosted) atau Kling AI Trial**

- Open source = gratis
- Kling trial = $9.79 untuk 100 units
- Budget: $0-10

---

## Rekomendasi untuk Maksimal Capability

### Jika Budget Tidak Masalah:
**OpenAI Sora 2 Pro ($200/bulan)**
- Kualitas tertinggi
- Native audio + lip sync
- Character injection
- 1080p, 20 detik

### Jika Ingin Value Terbaik:
**Google Veo 3 ($19.99/bulan) + Hailuo AI ($14.99/bulan)**
- Veo 3: Native audio, video panjang (60s)
- Hailuo: Physics realistis, director mode
- Total: ~$35/bulan untuk coverage lengkap

### Jika Fokus Quantity:
**Pika Labs Fancy ($76/bulan)**
- 6,000 credits = ~600 video/bulan
- Pikaframes untuk video 25s
- Cost per video sangat rendah

### Jika Sudah Pakai Kling AI:
**Tetap dengan Kling + Tambah Veo 3**
- Kling untuk image-to-video berkualitas
- Veo 3 untuk video dengan audio
- Kombinasi optimal untuk harga

---

## Kesimpulan

### Top 3 untuk 2025:

1. **Google Veo 3** - Best overall value dengan native audio
2. **Hailuo AI / Minimax** - Best physics & director control
3. **Kling AI** - Best price-to-quality ratio

### Untuk AI Creative Studio (Project Ini):

Saat ini menggunakan **Kling AI** yang sudah terintegrasi. Rekomendasi enhancement:

1. **Tambah Google Veo 3** - Untuk video dengan audio
2. **Pertahankan Kling AI** - Untuk image-to-video & editing
3. **Optional: Pika Labs** - Untuk video lebih panjang (25s)

---

## Sumber Data

- [Kling AI Developer Portal](https://klingai.com/global/dev/pricing)
- [Runway Pricing](https://runwayml.com/pricing/)
- [Pika Labs](https://pika.art/pricing)
- [Luma AI Pricing](https://lumalabs.ai/pricing)
- [Hailuo AI](https://hailuoai.video/subscribe)
- [Google Veo Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAI Sora](https://openai.com/index/sora-2/)
- [Synthesia Pricing](https://www.synthesia.io/pricing)
- [Stability AI](https://platform.stability.ai/pricing)

---

*Dokumen ini dibuat pada: 4 Januari 2026*
*Last Updated: 4 Januari 2026*
