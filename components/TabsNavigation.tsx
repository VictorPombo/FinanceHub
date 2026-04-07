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
    { href: "/dashboard/planilha-ia", icon: Bot, label: "Planilha IA", short: "Plan. IA" },
    { href: "/dashboard/consultor", icon: Bot, label: "Consultor IA", short: "Consult." },
    { href: "/dashboard/categorias", icon: Tags, label: "Categorias", short: "Categ." },
    { href: "/dashboard/duda", icon: Table2, label: "Planilha Excel", short: "Excel" },
  ];

  return (
    <>
      {/* DESKTOP TABS */}
      <div className="hidden md:flex items-center px-4 py-2 gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-xl whitespace-nowrap
                ${isActive 
                  ? "bg-purple-600/15 text-purple-400 border border-purple-500/25 shadow-[0_0_20px_rgba(147,51,234,0.15)]" 
                  : "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* MOBILE BOTTOM NAV - scrollable with 3D depth */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#020617]/95 backdrop-blur-2xl border-t border-slate-800/80 z-[100] pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.9)]">
        <div className="flex items-center overflow-x-auto no-scrollbar h-16 px-1 gap-0.5">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center min-w-[60px] h-full px-2 transition-all duration-200 shrink-0 ${
                  isActive ? "text-purple-400" : "text-slate-600 active:text-slate-400"
                }`}
              >
                <div className={`p-1.5 rounded-xl mb-0.5 transition-all ${isActive ? 'bg-purple-900/50 shadow-[0_0_12px_rgba(147,51,234,0.3)]' : ''}`}>
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
