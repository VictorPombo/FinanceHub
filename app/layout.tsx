import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700", "800", "900"], 
  variable: "--font-outfit" 
});

const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"], 
  weight: ["400", "500", "700", "800"], 
  variable: "--font-jetbrains" 
});

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
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased bg-[#020617] text-slate-200 selection:bg-purple-500/30`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "4px",
              fontSize: "13px",
              fontFamily: "var(--font-outfit)",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
