import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "💰 FinanceHub - Controle Financeiro Pessoal",
  description: "Sistema de controle financeiro pessoal com interface estilo Excel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased bg-[#020617] text-slate-200 selection:bg-purple-500/30`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "4px",
              fontSize: "13px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
