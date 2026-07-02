import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "投资驾驶舱",
  description: "个人基金与股票分析工具",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
