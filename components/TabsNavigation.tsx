"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered, BarChart2, Bot, CreditCard, Tags } from "lucide-react";

export default function TabsNavigation() {
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard/lancamentos", icon: <ListOrdered className="w-4 h-4 mr-2" />, label: "Lançamentos" },
    { href: "/dashboard/resumo", icon: <BarChart2 className="w-4 h-4 mr-2" />, label: "Resumo Mensal" },
    { href: "/dashboard/consultor", icon: <Bot className="w-4 h-4 mr-2" />, label: "Consultor IA" },
    { href: "/dashboard/dividas", icon: <CreditCard className="w-4 h-4 mr-2" />, label: "Dívidas" },
    { href: "/dashboard/categorias", icon: <Tags className="w-4 h-4 mr-2" />, label: "Categorias" },
  ];

  return (
    <div className="flex items-end bg-gradient-to-r from-[#0F172A] to-[#1E293B] pt-3 px-6 border-b border-white/5 shadow-sm relative z-40">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-all duration-300 mr-2 border border-b-0 rounded-t-xl group relative overflow-hidden
              ${isActive 
                ? "bg-[#F8FAFC] text-blue-600 border-white/10 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] z-10 -mb-[1px]" 
                : "bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10"
              }
            `}
          >
            {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>}
            <span className={`mr-2 transition-transform duration-300 flex items-center justify-center ${isActive ? 'transform scale-110 text-blue-600' : 'group-hover:scale-110 text-slate-400'}`}>
              <tab.icon.type {...tab.icon.props} className="w-4 h-4" />
            </span> 
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
