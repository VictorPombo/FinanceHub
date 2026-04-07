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
      <body className={`${outfit.variable} ${jetbrains.variable} font-sans antialiased bg-[#09090b] text-zinc-200 selection:bg-violet-500/30`}>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "16px",
              fontSize: "13px",
              fontFamily: "var(--font-outfit)",
              fontWeight: "600",
              background: "rgba(24, 24, 27, 0.95)",
              backdropFilter: "blur(12px)",
              color: "#fafafa",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.05)",
              padding: "14px 22px",
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#09090b' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#09090b' },
            },
            loading: {
              iconTheme: { primary: '#a78bfa', secondary: '#09090b' },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
