import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SWV — Semantic Workflow Visualizer",
  description: "LLM 동작 원리 시각화 및 업무 자동화 엔지니어링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        className="h-full overflow-hidden"
        style={{ fontFamily: "var(--font-barlow), sans-serif", fontSize: "13px" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
