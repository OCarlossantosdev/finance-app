'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  HeartPulse,
  LineChart,
  Receipt,
  Target,
  LogOut,
  Wallet,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type TabType = 'dashboard' | 'plano-de-vida' | 'investimentos' | 'gastos-ganhos' | 'metas';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout?: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onLogout,
  isOpen,
  setIsOpen
}: SidebarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const updateThemeFromStorage = () => {
      const savedTheme = localStorage.getItem('@app:theme') as 'dark' | 'light';
      if (savedTheme) setTheme(savedTheme);
    };

    updateThemeFromStorage();

    window.addEventListener('storage', updateThemeFromStorage);
    const interval = setInterval(updateThemeFromStorage, 200);

    return () => {
      window.removeEventListener('storage', updateThemeFromStorage);
      clearInterval(interval);
    };
  }, []);

  const isDark = theme === 'dark';

  const menuItems: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Início / Dashboard', icon: LayoutDashboard },
    { id: 'plano-de-vida', label: 'Plano de Vida', icon: HeartPulse },
    { id: 'investimentos', label: 'Investimentos', icon: LineChart },
    { id: 'gastos-ganhos', label: 'Gastos e Ganhos', icon: Receipt },
    { id: 'metas', label: 'Metas', icon: Target },
  ];

  const handleGoHome = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveTab('dashboard');
    if (typeof window !== 'undefined') {
      localStorage.setItem('@app:activeTab', 'dashboard');
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      }
    }
  };

  const handleTabSelect = (tab: TabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Botão Hambúrguer Mobile */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 backdrop-blur-xl border rounded-2xl shadow-2xl active:scale-95 transition-all ${isDark
              ? 'bg-[#0A1F5B]/90 border-white/10 text-[#F8FAFF]'
              : 'bg-white/90 border-slate-200 text-[#0A1F5B]'
            }`}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-4 left-4 z-40 h-[calc(100vh-2rem)] backdrop-blur-2xl border rounded-3xl shadow-2xl flex flex-col justify-between shrink-0 transition-all duration-300 ${isDark
            ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]'
            : 'bg-white/70 border-slate-200 text-[#0A1F5B] shadow-slate-200/50'
          } ${isOpen ? 'w-64 p-5' : 'w-20 p-4 hidden lg:flex'} ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="space-y-6">
          {/* Logo Fluxo Pay - Redireciona para o Dashboard Principal */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={handleGoHome}
              className={`flex items-center gap-3 group cursor-pointer ${!isOpen && 'justify-center w-full'}`}
            >
              <div className="p-2.5 bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] rounded-2xl shadow-lg shadow-[#00D1FF]/20 text-[#0A1F5B] font-black shrink-0 group-hover:scale-105 transition-transform border border-white/20">
                <Wallet size={20} strokeWidth={2.5} />
              </div>
              {isOpen && (
                <div className="animate-in fade-in duration-200">
                  <h2 className={`font-extrabold text-base tracking-wide transition-colors ${isDark ? 'text-[#F8FAFF] group-hover:text-[#00D1FF]' : 'text-[#0A1F5B] group-hover:text-[#3B82F6]'}`}>
                    Fluxo<span className="text-[#00D1FF]">Pay</span>
                  </h2>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Gestão Inteligente</p>
                </div>
              )}
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`hidden lg:flex p-1.5 rounded-xl transition-all ${isDark
                  ? 'hover:bg-white/10 text-[#C7B8FF] hover:text-[#F8FAFF]'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-[#0A1F5B]'
                }`}
            >
              {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* Navegação */}
          <nav className="space-y-2 pt-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  title={!isOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-3 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 ${isOpen ? 'px-3.5' : 'justify-center px-0'
                    } ${isActive
                      ? 'bg-gradient-to-r from-[#00D1FF]/15 to-[#3B82F6]/15 text-[#00D1FF] border border-[#00D1FF]/30 shadow-md shadow-[#00D1FF]/5'
                      : isDark
                        ? 'text-[#C7B8FF]/80 hover:text-[#F8FAFF] hover:bg-white/[0.04]'
                        : 'text-slate-600 hover:text-[#0A1F5B] hover:bg-slate-100'
                    }`}
                >
                  <Icon
                    size={20}
                    className={isActive ? 'text-[#00D1FF] shrink-0' : (isDark ? 'text-[#C7B8FF]/70 shrink-0' : 'text-slate-500 shrink-0')}
                  />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          {onLogout && (
            <button
              onClick={onLogout}
              title={!isOpen ? 'Sair da Conta' : undefined}
              className={`w-full flex items-center gap-3 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 group ${isDark
                  ? 'text-[#C7B8FF]/80 hover:text-rose-400 hover:bg-rose-500/10'
                  : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                } ${isOpen ? 'px-3.5' : 'justify-center px-0'}`}
            >
              <LogOut size={18} className="group-hover:text-rose-400 transition-colors shrink-0" />
              {isOpen && <span>Sair da Conta</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}