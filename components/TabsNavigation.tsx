"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, CreditCard, FileText, Bot, Tags, Table2 } from "lucide-react";

export default function TabsNavigation() {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/resumo", icon: LayoutDashboard, label: "Resumo", short: "Resumo" },
    { href: "/dashboard/lancamentos", icon: ListOrdered, label: "Lançamentos", short: "Lançar" },
    { href: "/dashboard/contas", icon: CreditCard, label: "Cartões", short: "Cartões" },
    { href: "/dashboard/extratos", icon: FileText, label: "Extratos Auto", short: "Extratos" },
    { href: "/dashboard/consultor", icon: Bot, label: "Consultor IA", short: "Consult." },
    { href: "/dashboard/categorias", icon: Tags, label: "Categorias", short: "Categ." },
    { href: "/dashboard/duda", icon: Table2, label: "Planilha Excel", short: "Excel" },
  ];

  return (
    <>
      {/* DESKTOP TABS */}
      <div className="hidden md:flex items-center px-5 py-2.5 gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-all duration-250 rounded-xl whitespace-nowrap
                ${isActive 
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_20px_rgba(124,58,237,0.1)]" 
                  : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent"
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-zinc-600'}`} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#09090b]/95 backdrop-blur-2xl border-t border-zinc-800/50 z-[100] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center overflow-x-auto no-scrollbar h-16 px-1 gap-0.5">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center min-w-[60px] h-full px-2 transition-all duration-200 shrink-0 ${
                  isActive ? "text-violet-400" : "text-zinc-600 active:text-zinc-400"
                }`}
              >
                <div className={`p-1.5 rounded-xl mb-0.5 transition-all ${isActive ? 'bg-violet-900/40 shadow-[0_0_14px_rgba(124,58,237,0.25)]' : ''}`}>
                   <Icon className="w-5 h-5"/>
                </div>
                <span className="text-[9px] font-bold tracking-tight leading-none">{tab.short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
