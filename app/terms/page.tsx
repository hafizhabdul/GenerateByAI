import { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@iconify/react";

export const metadata: Metadata = {
    title: "Syarat & Ketentuan",
    description: "Syarat dan Ketentuan penggunaan layanan SquirrAI - Platform AI Generatif Indonesia.",
};

export default function TermsPage() {
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
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Syarat & Ketentuan</h1>
                    <p className="text-muted-foreground mb-8">Terakhir diperbarui: Januari 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">1. Penerimaan Ketentuan</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Dengan mengakses atau menggunakan layanan SquirrAI, Anda menyetujui untuk terikat dengan
                            Syarat dan Ketentuan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak
                            menggunakan layanan kami.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">2. Deskripsi Layanan</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            SquirrAI adalah platform berbasis AI yang menyediakan layanan:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Generate gambar dari teks (text-to-image)</li>
                            <li>Generate video dari teks (text-to-video)</li>
                            <li>Generate video dari gambar (image-to-video)</li>
                            <li>Penyimpanan dan manajemen hasil generasi</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Layanan kami menggunakan teknologi AI dari pihak ketiga dan hasil generasi dapat bervariasi
                            tergantung pada prompt dan parameter yang digunakan.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">3. Akun Pengguna</h2>

                        <h3 className="text-lg font-medium mb-2 mt-4">3.1 Pendaftaran</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Untuk menggunakan layanan kami, Anda harus membuat akun dengan informasi yang akurat
                            dan lengkap. Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">3.2 Kelayakan</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Anda harus berusia minimal 13 tahun untuk menggunakan layanan ini. Jika Anda berusia
                            di bawah 18 tahun, Anda harus mendapat izin dari orang tua atau wali.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">3.3 Keamanan Akun</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Anda bertanggung jawab atas semua aktivitas yang terjadi di bawah akun Anda. Segera
                            laporkan jika ada penggunaan tidak sah pada akun Anda.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">4. Token dan Pembayaran</h2>

                        <h3 className="text-lg font-medium mb-2 mt-4">4.1 Sistem Token</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            SquirrAI menggunakan sistem token untuk mengakses layanan generasi AI. Setiap generasi
                            memerlukan sejumlah token yang bervariasi berdasarkan jenis dan kompleksitas konten.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">4.2 Pembelian Token</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Token dapat dibeli melalui payment gateway yang tersedia</li>
                            <li>Harga token dapat berubah sewaktu-waktu</li>
                            <li>Token yang sudah dibeli tidak dapat dikembalikan (non-refundable)</li>
                            <li>Token tidak memiliki tanggal kadaluarsa</li>
                        </ul>

                        <h3 className="text-lg font-medium mb-2 mt-4">4.3 Token Gratis</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Pengguna baru menerima token gratis saat mendaftar. Token gratis memiliki ketentuan
                            khusus dimana hasil generasi akan ditampilkan di halaman Community (publik).
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">4.4 Kebijakan Refund</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Pembelian token bersifat final dan tidak dapat di-refund, kecuali dalam kasus:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                            <li>Kesalahan teknis dari sistem kami yang menyebabkan token tidak diterima</li>
                            <li>Pembayaran ganda yang tidak disengaja</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">5. Hak Kekayaan Intelektual</h2>

                        <h3 className="text-lg font-medium mb-2 mt-4">5.1 Kepemilikan Hasil Generasi</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Anda memiliki hak penuh atas konten (gambar/video) yang dihasilkan melalui layanan
                            kami menggunakan token Anda. Anda bebas menggunakan hasil generasi untuk keperluan
                            pribadi maupun komersial.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">5.2 Lisensi ke SquirrAI</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Dengan menggunakan layanan kami, Anda memberikan lisensi non-eksklusif kepada SquirrAI
                            untuk menyimpan dan memproses konten Anda dalam rangka menyediakan layanan.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">5.3 Konten Community</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Jika Anda menggunakan token gratis, hasil generasi Anda dapat ditampilkan di halaman
                            Community untuk menginspirasi pengguna lain. Anda tetap memiliki hak atas konten tersebut.
                        </p>

                        <h3 className="text-lg font-medium mb-2 mt-4">5.4 Hak Cipta SquirrAI</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Platform SquirrAI, termasuk desain, logo, kode, dan konten lainnya adalah milik
                            SquirrAI dan dilindungi oleh hukum hak cipta.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">6. Konten yang Dilarang</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Anda dilarang menggunakan layanan kami untuk membuat konten yang:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Mengandung pornografi atau konten seksual eksplisit</li>
                            <li>Menampilkan kekerasan berlebihan atau gore</li>
                            <li>Mempromosikan kebencian, diskriminasi, atau ujaran kebencian</li>
                            <li>Melanggar hak cipta atau merek dagang pihak lain</li>
                            <li>Mengandung informasi pribadi tanpa izin (doxxing)</li>
                            <li>Menyerupai tokoh publik untuk tujuan penipuan (deepfake)</li>
                            <li>Mempromosikan aktivitas ilegal</li>
                            <li>Berisi konten yang dapat membahayakan anak-anak</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Pelanggaran dapat mengakibatkan penangguhan atau penghapusan akun tanpa pengembalian token.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">7. Penggunaan yang Diizinkan</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Anda diizinkan untuk:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Menggunakan hasil generasi untuk proyek pribadi dan komersial</li>
                            <li>Membagikan hasil generasi di media sosial dengan atau tanpa atribusi</li>
                            <li>Mengedit atau memodifikasi hasil generasi</li>
                            <li>Menjual produk yang menggunakan hasil generasi</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">8. Batasan Layanan</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            Anda memahami dan menyetujui bahwa:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Hasil generasi AI dapat bervariasi dan tidak selalu sesuai ekspektasi</li>
                            <li>Layanan dapat mengalami gangguan atau maintenance</li>
                            <li>Kami berhak membatasi penggunaan untuk mencegah penyalahgunaan</li>
                            <li>Model AI dapat diperbarui yang dapat mempengaruhi hasil generasi</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">9. Batasan Tanggung Jawab</h2>
                        <p className="text-muted-foreground leading-relaxed mb-4">
                            SquirrAI tidak bertanggung jawab atas:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                            <li>Kerugian tidak langsung, insidental, atau konsekuensial</li>
                            <li>Kehilangan data atau keuntungan</li>
                            <li>Gangguan layanan di luar kendali kami</li>
                            <li>Penggunaan hasil generasi oleh pihak ketiga</li>
                            <li>Konten yang dibuat oleh pengguna lain</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-4">
                            Total tanggung jawab kami terbatas pada jumlah yang Anda bayarkan dalam 12 bulan terakhir.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">10. Penghentian Layanan</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Kami berhak menangguhkan atau menghentikan akses Anda ke layanan jika Anda melanggar
                            Syarat dan Ketentuan ini. Anda juga dapat menghapus akun kapan saja melalui pengaturan akun.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">11. Perubahan Ketentuan</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Kami dapat memperbarui Syarat dan Ketentuan ini dari waktu ke waktu. Perubahan signifikan
                            akan diberitahukan melalui email atau notifikasi dalam aplikasi. Penggunaan layanan setelah
                            perubahan berlaku berarti Anda menyetujui ketentuan yang diperbarui.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">12. Hukum yang Berlaku</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Syarat dan Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan
                            akan diselesaikan melalui musyawarah mufakat, dan jika tidak tercapai, akan diselesaikan
                            melalui pengadilan yang berwenang di Indonesia.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">13. Hubungi Kami</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Jika Anda memiliki pertanyaan tentang Syarat dan Ketentuan ini, silakan hubungi kami:
                        </p>
                        <div className="mt-4 p-4 bg-surface-1 rounded-lg border border-border">
                            <p className="text-foreground font-medium">SquirrAI</p>
                            <p className="text-muted-foreground">Email: support@cronicle.my.id</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <Link href="/privacy" className="hover:text-primary transition-colors">
                        Kebijakan Privasi
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
