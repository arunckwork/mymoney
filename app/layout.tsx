import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyMoney - Admin Panel",
  description: "Admin panel for MyMoney application",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

