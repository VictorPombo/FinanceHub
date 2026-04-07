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
  title: "FinanceHub — Controle Financeiro Inteligente",
  description: "Controle financeiro pessoal com IA, dashboards inteligentes e interface premium.",
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
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "14px",
              fontSize: "13px",
              fontFamily: "var(--font-outfit)",
              fontWeight: "600",
              background: "#0F172A",
              color: "#F1F5F9",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.6), 0 0 20px rgba(139,92,246,0.1)",
              padding: "12px 20px",
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#020617' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#020617' },
            },
            loading: {
              iconTheme: { primary: '#A855F7', secondary: '#020617' },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
