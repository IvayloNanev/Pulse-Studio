import type { Metadata } from "next";
import { Bodoni_Moda, Geist, Geist_Mono } from "next/font/google";
import { RecoveryRedirect } from "@/components/recovery-redirect";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Pulse Studio",
    template: "%s · Pulse Studio",
  },
  description:
    "Boutique yoga, cycling, and HIIT classes built around a focused monthly practice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bodoniModa.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
