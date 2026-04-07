"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered, BarChart2, Bot, CreditCard, Tags, FileText } from "lucide-react";

export default function TabsNavigation() {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/lancamentos", icon: <ListOrdered className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Lançamentos" },
    { href: "/dashboard/resumo", icon: <BarChart2 className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Resumo" },
    { href: "/dashboard/contas", icon: <CreditCard className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Cartões" },
    { href: "/dashboard/extratos", icon: <FileText className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Extratos Auto" },
    { href: "/dashboard/consultor", icon: <Bot className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Consultor IA" },
    { href: "/dashboard/categorias", icon: <Tags className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Categorias" },
    { href: "/dashboard/duda", icon: <ListOrdered className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />, label: "Duda" },
  ];

  return (
    <>
      <div className="hidden md:flex items-center px-6 py-2 gap-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full
                ${isActive 
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.3)]" 
                  : "bg-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-transparent"
                }
              `}
            >
              <span className={`flex items-center justify-center ${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {tab.icon}
              </span> 
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#020617]/90 backdrop-blur-xl border-t border-slate-800 z-[100] pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? "text-purple-400" : "text-slate-500"
                }`}
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-purple-900/40 shadow-[0_0_10px_rgba(147,51,234,0.3)]' : ''}`}>
                   {tab.icon}
                </div>
                <span className="text-[10px] font-semibold tracking-tight">{tab.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
