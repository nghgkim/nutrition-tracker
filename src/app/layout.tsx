import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nutrition Tracker",
  description: "Track daily calorie intake",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
