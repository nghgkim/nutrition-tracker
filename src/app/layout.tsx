import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import PWARegister from "@/components/PWARegister";
import I18nProvider from "@/components/I18nProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nutrition Tracker",
  description: "Track daily calorie intake",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Critical inline CSS: paints correct background before external CSS loads (prevents white flash on tab switch) */}
        <style dangerouslySetInnerHTML={{ __html: `
          html,body{margin:0;background:#f8fafc;color:#0f172a}
          html.dark,html.dark body{background:#09090b;color:#fafafa}
          html,body{min-height:100%}
        ` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var stored = localStorage.getItem('nt-theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var isDark = stored ? stored === 'dark' : prefersDark;
              var root = document.documentElement;
              if (isDark) {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
                root.style.background = '#09090b';
                if (document.body) document.body.style.background = '#09090b';
              } else {
                root.style.colorScheme = 'light';
                root.style.background = '#f8fafc';
                if (document.body) document.body.style.background = '#f8fafc';
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <ThemeProvider>
          <I18nProvider>
          <PWARegister />
          <Nav />
          {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
