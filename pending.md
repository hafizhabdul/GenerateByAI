🔍 Pertanyaan Klarifikasi
1. Fungsionalitas Core
Apakah semua fitur generasi sudah ditest end-to-end? (Image Generate, Image Transform, Video Text-to-Video, Video Image-to-Video, Premium Veo 3.1)
Apakah sistem token/credit sudah berfungsi dengan baik? (deduction, balance check, refund on failure)
Apakah payment integration (Stripe/Midtrans?) sudah ditest dengan transaksi real/sandbox?
2. User Experience
Apakah ada onboarding flow untuk user baru? Atau mereka langsung masuk ke generator?
Bagaimana flow ketika user kehabisan token? Apakah ada guidance ke halaman pricing/top-up?
Apakah sudah ada loading states dan error handling yang user-friendly di semua halaman?
3. Infrastructure & Security
Apakah sudah ada rate limiting yang proper untuk mencegah abuse?
Bagaimana dengan backup strategy untuk database Supabase?
Apakah semua API keys (fal.ai, Supabase) sudah di environment variables production?
Apakah sudah ada monitoring/logging untuk track errors di production?
4. Legal & Compliance
Apakah sudah ada Terms of Service dan Privacy Policy?
Apakah ada content moderation untuk prompt yang inappropriate?
5. Marketing & Launch
Target user pertama siapa? (B2C individual, B2B agency, content creators?)
Sudah ada landing page atau halaman marketing?
Apakah sudah ada rencana pricing tiers?