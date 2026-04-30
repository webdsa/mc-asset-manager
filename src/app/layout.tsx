import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppAuthBar } from "@/components/app-auth-bar";
import {
  getFirebasePublicConfig,
  isFirebaseAuthConfigured,
} from "@/lib/firebase/public-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asset Manager",
  description: "Gestão de itens, equipamentos e acervo de estúdio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showAuthBar = isFirebaseAuthConfigured();
  const firebaseConfig = getFirebasePublicConfig();

  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {showAuthBar && firebaseConfig ? (
          <AppAuthBar firebaseConfig={firebaseConfig} />
        ) : null}
        {children}
      </body>
    </html>
  );
}
