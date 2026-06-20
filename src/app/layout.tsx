import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/exvias/service-worker-register";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "EXVIASS",
  title: "EXVIASS S.A.",
  description: "Reservas de transporte fijo Cusco y Colquepata",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/exviass-app-icon.png",
    apple: "/brand/exviass-app-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "EXVIASS",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-PE"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
