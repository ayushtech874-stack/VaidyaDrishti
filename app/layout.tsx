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
  title: {
    default: "VaidyaDrishti — AI Teleconsultation Triage Assistant",
    template: "%s | VaidyaDrishti",
  },
  description:
    "Empirical, compliance-first AI teleconsultation triage and clinical intake platform for Registered Medical Practitioners in India under TPG 2020 & DPDP Act 2023.",
  applicationName: "VaidyaDrishti",
  keywords: [
    "VaidyaDrishti",
    "Telemedicine Triage",
    "AI Healthcare India",
    "RMP Clinical Assistant",
    "ICMR Audit Triage",
    "Groq Whisper ASR",
    "Manchester Triage System",
  ],
  authors: [{ name: "Ayush Tech Team", url: "https://github.com/ayushtech874-stack/VaidyaDrishti" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "VaidyaDrishti — AI Teleconsultation Triage Assistant",
    description:
      "Empirical AI clinical triage, 8-language voice intake, and compliance management platform for RMP doctors.",
    siteName: "VaidyaDrishti",
    locale: "en_IN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
