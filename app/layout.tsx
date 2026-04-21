import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LINEスタンプ切り取りツール",
  description: "複数のLINEスタンプが並んだ画像を均等分割してダウンロード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
