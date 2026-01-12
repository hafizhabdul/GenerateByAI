import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display, Roboto_Mono, Pacifico, Oswald } from "next/font/google"; // turbo
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], variable: "--font-roboto-mono" });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], variable: "--font-pacifico" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });

export const metadata: Metadata = {
  metadataBase: new URL("https://squirrai.cronicle.my.id"),
  title: {
    default: "SquirrAI | Platform AI Generatif Indonesia",
    template: "%s | SquirrAI",
  },
  description: "Platform AI untuk generate gambar dan video berkualitas tinggi. Ubah ide menjadi visual menakjubkan dengan teknologi AI terdepan.",
  keywords: ["AI", "generative AI", "image generation", "video generation", "Indonesia", "text to image", "text to video"],
  authors: [{ name: "SquirrAI" }],
  creator: "SquirrAI",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://squirrai.cronicle.my.id",
    siteName: "SquirrAI",
    title: "SquirrAI | Platform AI Generatif Indonesia",
    description: "Platform AI untuk generate gambar dan video berkualitas tinggi. Ubah ide menjadi visual menakjubkan dengan teknologi AI terdepan.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SquirrAI - Platform AI Generatif",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SquirrAI | Platform AI Generatif Indonesia",
    description: "Platform AI untuk generate gambar dan video berkualitas tinggi.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} ${robotoMono.variable} ${pacifico.variable} ${oswald.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
