import type { Metadata } from "next";
import { Bodoni_Moda, Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://pulse-studio-ivaylo-nanev.vercel.app"),
  title: {
    default: "Pulse Studio",
    template: "%s · Pulse Studio",
  },
  description:
    "One connected boutique-fitness experience for members, staff, and studio owners.",
  openGraph: {
    title: "Pulse Studio",
    description:
      "A connected boutique-fitness experience for booking, attendance, studio operations, member retention, and AI-powered support.",
    url: "/",
    siteName: "Pulse Studio",
    type: "website",
    images: [
      {
        url: "/media/pulse-staff-operations.png",
        width: 1680,
        height: 945,
        alt: "Pulse Studio staff using the studio operations experience",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse Studio",
    description:
      "Boutique-fitness operations, member retention, and AI support in one connected experience.",
    images: ["/media/pulse-staff-operations.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bodoniModa.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
