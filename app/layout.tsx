import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import TopLoadingBar from "@/components/top-loading-bar";
import { Suspense } from "react";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SNG - Sans Ngatur Project",
  description: "Aplikasi manajemen tugas Kanban & Project SNG yang simpel, flat, dan cepat.",
  icons: {
    icon: "/sng-logo.svg",
    apple: "/sng-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-var-primary text-var-primary">
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
