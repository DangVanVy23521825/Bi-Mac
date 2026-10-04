import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["300", "400", "600"],
  variable: "--font-display-src",
  display: "swap",
});

const body = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-body-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bí Mặc — Hiểu để mặc đẹp",
  description:
    "Từ điển thời trang, cách phối đồ theo style, và gợi ý phối đồ cá nhân cho phụ nữ Việt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
