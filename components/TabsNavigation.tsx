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
                  ? "bg-slate-100 text-slate-800" 
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }
              `}
            >
              <span className={`flex items-center justify-center ${isActive ? 'text-emerald-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                {tab.icon}
              </span> 
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[100] pb-safe shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <div className={`p-1 rounded-full ${isActive ? 'bg-blue-50' : ''}`}>
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
