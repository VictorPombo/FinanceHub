import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

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
      <body className="antialiased">
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
