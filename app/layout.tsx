import type { Metadata } from "next";
import "./globals.css";

const preview = process.env.BAXTER_DEPLOY_ENV === "preview";

export const metadata: Metadata = {
  title: "Baxter Industries — Property Maintenance & Remodeling in New Hampshire",
  description:
    "Baxter Industries provides maintenance, cleaning, carpentry, and full unit renovations for New Hampshire homes & businesses. Request your free quote today.",
  robots: preview ? { index: false, follow: false } : undefined,
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
        {/* Enable scroll-reveal only when JS runs, before paint, so content
            stays visible with JS disabled. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('reveal-enabled');",
          }}
        />
      </head>
      <body>
        {preview && (
          <div className="preview-notice">
            Preview site. Quote submissions are tests and won&apos;t email Baxter
            Industries. Please use sample details.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
