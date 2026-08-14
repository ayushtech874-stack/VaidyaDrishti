import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vaidya-drishti.vercel.app"),
  title: {
    default: "VaidyaDrishti — AI Teleconsultation Triage & Clinic Management Portal",
    template: "%s | VaidyaDrishti",
  },
  description:
    "VaidyaDrishti: Empirical AI teleconsultation triage, 8-language voice intake, and clinic management platform for Registered Medical Practitioners in India under TPG 2020 & DPDP Act 2023.",
  applicationName: "VaidyaDrishti",
  keywords: [
    "VaidyaDrishti",
    "Vaidya Drishti",
    "Telemedicine Triage",
    "AI Healthcare India",
    "RMP Clinical Assistant",
    "ICMR Audit Triage",
    "Groq Whisper ASR",
    "Doctor Clinic Portal",
  ],
  authors: [{ name: "Ayush Tech Team", url: "https://github.com/ayushtech874-stack/VaidyaDrishti" }],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "VaidyaDrishti — AI Teleconsultation Triage & Clinic Management",
    description:
      "Empirical AI clinical triage, 8-language voice intake, and clinic queue management platform for RMP doctors.",
    siteName: "VaidyaDrishti",
    url: "https://vaidya-drishti.vercel.app",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "VaidyaDrishti AI Tele-Triage Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VaidyaDrishti — AI Teleconsultation Triage & Clinic Management",
    description: "Empirical AI clinical triage and queue management for RMP doctors in India.",
    images: ["/icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
