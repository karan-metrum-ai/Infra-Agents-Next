import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { NotificationToast } from "@/components/NotificationToast/NotificationToast";
import { MobileBlocker } from "@/components/MobileBlocker/MobileBlocker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infra Agents",
  description:
    "AI operations console for infrastructure monitoring, digital twin, and agent teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${geistMono.variable}`}>
      <body>
        <ReduxProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-inter), sans-serif",
                },
              }}
              theme="dark"
              richColors
              closeButton
            />
            <NotificationToast />
            <MobileBlocker />
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
