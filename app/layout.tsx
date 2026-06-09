import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baxter Industries — Property Maintenance & Remodeling in New Hampshire",
  description:
    "Baxter Industries provides maintenance, cleaning, carpentry, and full unit renovations for New Hampshire homes & businesses. Request your free quote today.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
