import { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@iconify/react";

export const metadata: Metadata = {
    title: "Kebijakan Privasi",
    description: "Kebijakan Privasi SquirrAI - Bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b border-border">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link href="/" className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
                        <Icon icon="mingcute:arrow-left-line" className="w-5 h-5" />
                        <span className="text-sm font-medium">Kembali ke Beranda</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="prose prose-invert max-w-none">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Kebijakan Privasi</h1>
                    <p className="text-muted-foreground mb-8">Terakhir diperbarui: Januari 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">1. Pendahuluan</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Selamat datang di SquirrAI. Kami menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi Anda.
                            Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi
                            informasi Anda ketika Anda menggunakan layanan kami.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">2. Informasi yang Kami Kumpulkan</h2>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.1 Informasi Akun</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Alamat email</li>
                            <li>Nama (opsional)</li>
                            <li>Foto profil (opsional)</li>
                        </ul>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.2 Data Penggunaan</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Prompt yang Anda masukkan untuk generate gambar/video</li>
                            <li>Hasil generasi (gambar dan video)</li>
                            <li>Riwayat transaksi dan pembelian token</li>
                            <li>Statistik penggunaan (jumlah generasi, token digunakan)</li>
                        </ul>

                        <h3 className="text-lg font-medium mb-2 mt-4">2.3 Data Teknis</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Alamat IP</li>
                            <li>Jenis browser dan perangkat</li>
                            <li>Waktu akses dan durasi sesi</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">3. Penggunaan Informasi</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Kami menggunakan informasi yang dikumpulkan untuk:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Menyediakan dan mengoperasikan layanan SquirrAI</li>
                            <li>Memproses pembayaran dan mengelola akun Anda</li>
                            <li>Mengirimkan notifikasi terkait layanan</li>
                            <li>Meningkatkan kualitas layanan dan pengalaman pengguna</li>
                            <li>Mencegah penyalahgunaan dan menjaga keamanan platform</li>
                            <li>Mematuhi kewajiban hukum</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">4. Penyimpanan dan Keamanan Data</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Data Anda disimpan dengan aman menggunakan layanan cloud terpercaya:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li><strong>Database:</strong> Supabase (PostgreSQL) dengan enkripsi data</li>
                            <li><strong>File Media:</strong> Penyimpanan terenkripsi dengan akses terbatas</li>
                            <li><strong>Autentikasi:</strong> Supabase Auth dengan standar keamanan industri</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Kami menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data Anda
                            dari akses tidak sah, perubahan, pengungkapan, atau penghancuran.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">5. Berbagi Data dengan Pihak Ketiga</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Kami dapat membagikan data Anda dengan pihak ketiga berikut:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li><strong>Penyedia AI:</strong> fal.ai untuk pemrosesan generasi gambar/video (hanya prompt)</li>
                            <li><strong>Payment Gateway:</strong> Pakasir untuk memproses pembayaran</li>
                            <li><strong>Hosting:</strong> Netlify/Vercel untuk menyajikan aplikasi</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Kami tidak menjual data pribadi Anda kepada pihak ketiga.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">6. Konten Komunitas</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Jika Anda menggunakan akun gratis, hasil generasi Anda mungkin ditampilkan di halaman Community
                            untuk menginspirasi pengguna lain. Jika Anda ingin hasil generasi Anda bersifat privat,
                            Anda dapat membeli token untuk menggunakan mode privat.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">7. Hak Anda</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Anda memiliki hak-hak berikut terkait data pribadi Anda:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li><strong>Akses:</strong> Melihat data yang kami simpan tentang Anda</li>
                            <li><strong>Koreksi:</strong> Memperbarui informasi akun Anda</li>
                            <li><strong>Penghapusan:</strong> Menghapus akun dan data Anda</li>
                            <li><strong>Portabilitas:</strong> Meminta salinan data Anda</li>
                            <li><strong>Keberatan:</strong> Menolak pemrosesan data tertentu</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Untuk menggunakan hak-hak ini, silakan hubungi kami melalui email di bawah.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">8. Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Kami menggunakan cookies dan teknologi serupa untuk:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                            <li>Menjaga sesi login Anda</li>
                            <li>Mengingat preferensi Anda</li>
                            <li>Menganalisis penggunaan layanan</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">9. Retensi Data</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Kami menyimpan data Anda selama akun Anda aktif atau selama diperlukan untuk menyediakan
                            layanan. Jika Anda menghapus akun, kami akan menghapus data Anda dalam waktu 30 hari,
                            kecuali jika diwajibkan oleh hukum untuk menyimpannya lebih lama.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">10. Perubahan Kebijakan</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan
                            akan diberitahukan melalui email atau notifikasi dalam aplikasi. Penggunaan layanan
                            setelah perubahan berlaku berarti Anda menyetujui kebijakan yang diperbarui.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">11. Hubungi Kami</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini atau ingin menggunakan
                            hak-hak Anda, silakan hubungi kami:
                        </p>
                        <div className="mt-4 p-4 bg-surface-1 rounded-lg border border-border">
                            <p className="text-foreground font-medium">SquirrAI</p>
                            <p className="text-muted-foreground">Email: abdulhafizhsaenal@gmail.com</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <Link href="/terms" className="hover:text-primary transition-colors">
                        Syarat & Ketentuan
                    </Link>
                    <span>•</span>
                    <Link href="/" className="hover:text-primary transition-colors">
                        Kembali ke Beranda
                    </Link>
                </div>
            </main>
        </div>
    );
}
