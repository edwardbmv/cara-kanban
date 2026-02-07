import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cara HQ",
  description: "Mission Control & Workboard - Activity tracking, scheduling, and task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
