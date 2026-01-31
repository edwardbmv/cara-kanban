import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cara's Workboard",
  description: "Project management dashboard for Cara AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
