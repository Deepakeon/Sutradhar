import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sutradhar | Dual-Role Peer Mock Interview Platform",
  description: "Enable a single account to seamlessly operate as both Candidate and Interviewer with dedicated dashboards and role-specific workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#101010] text-[#f2f2f2] font-sans selection:bg-[#00d992]/20 selection:text-[#00d992]">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
