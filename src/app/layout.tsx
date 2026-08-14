import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "openquantum · 开放式科研智能体",
  description: "面向量子计算与科学探索的开放式科研智能体。",
  icons: {
    icon: [
      { url: "/openquantum/mark.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/openquantum/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
