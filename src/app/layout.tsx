import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getAuthState } from "@/features/account/guard";
import { APP_NAME, APP_TAGLINE, APP_TITLE } from "@/lib/brand";
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
  applicationName: APP_NAME,
  title: APP_TITLE,
  description: `${APP_TAGLINE} — từ điển thời trang, cách phối đồ theo style, và gợi ý phối đồ cá nhân cho phụ nữ Việt.`,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getAuthState();

  return (
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>
        <SiteHeader authState={authState} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
