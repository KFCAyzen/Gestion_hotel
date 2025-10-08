import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ActivityLogProvider } from "./context/ActivityLogContext";

export const metadata: Metadata = {
  title: "PAULINA HÔTEL - Gestion",
  description: "Système de gestion hôtelière PAULINA HÔTEL",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paulina Hotel"
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7D3837"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7D3837" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Paulina Hotel" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ActivityLogProvider>
            {children}
          </ActivityLogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
