import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import AppChrome from "@/components/AppChrome";
import "./globals.css";

const themeInit = `(function(){try{if(localStorage.getItem("hpa-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "House Prefect Affairs",
  description: "House prefect attendance management system",
  icons: {
    icon: [{ url: "/ICON.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/ICON.jpeg", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-paper text-ink pb-[env(safe-area-inset-bottom)]">
        <Script id="hpa-theme" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <AuthProvider>
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
