'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  Target,
  Clock,
  Settings2,
  Check,
  ChevronRight,
  PieChart as PieChartIcon,
  PlusCircle,
  CalendarDays,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import Sidebar, { TabType } from '@/components/Sidebar';
import PlanoDeVidaTab from '@/components/tabs/PlanoDeVidaTab';
import InvestimentosTab from '@/components/tabs/InvestimentosTab';
import QuickTransactionModal from '@/components/QuickTransactionModal';
import WorkProfileModal from '@/components/WorkProfileModal';
import GastosGanhosTab from '@/components/tabs/GastosGanhosTab';
import MetasTab from '@/components/tabs/MetasTab';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Tema Dark / Light
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Configurações do Usuário e Meta Diária
  const [dailyGoal, setDailyGoal] = useState<number>(150);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempDailyGoal, setTempDailyGoal] = useState('150');
  const [workProfile, setWorkProfile] = useState<'motoboy' | 'driver' | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Estados do Progresso da Meta Diária e Histórico Semanal
  const [todayProgress, setTodayProgress] = useState<number>(0);
  const [quickInputAmount, setQuickInputAmount] = useState<string>('');
  const [weeklyGoalTotal, setWeeklyGoalTotal] = useState<number>(0);

  // Estados Financeiros Consolidados do Dashboard
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loadingDashboardData, setLoadingDashboardData] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'goal' | 'investment'>('expense');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSidebarOpen(window.innerWidth >= 1024);

      const savedTab = localStorage.getItem('@app:activeTab') as TabType;
      if (savedTab) setCurrentTab(savedTab);

      const savedTheme = localStorage.getItem('@app:theme') as 'dark' | 'light';
      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('@app:theme', nextTheme);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('@app:activeTab', tab);
    }
  };

  const calculateWeeklyTotal = useCallback((userId: string, currentTodayVal: number) => {
    const curr = new Date();
    const firstDayOfWeek = new Date(curr.setDate(curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1)));

    let weekSum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];

      if (dStr === todayStr) {
        weekSum += currentTodayVal;
      } else {
        const storedDayVal = localStorage.getItem(`@app:todayProgress:${userId}:${dStr}`);
        if (storedDayVal) {
          weekSum += parseFloat(storedDayVal) || 0;
        }
      }
    }
    setWeeklyGoalTotal(weekSum);
  }, [todayStr]);

  const loadUserSettings = useCallback(async (userId: string) => {
    const savedProfile = localStorage.getItem(`@app:workProfile:${userId}`) as 'motoboy' | 'driver' | null;
    if (savedProfile) {
      setWorkProfile(savedProfile);
    } else {
      setIsProfileModalOpen(true);
    }

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('daily_goal')
      .eq('user_id', userId)
      .single();

    if (profileData?.daily_goal) {
      const val = Number(profileData.daily_goal);
      setDailyGoal(val);
      setTempDailyGoal(val.toString());
    } else {
      const savedDailyGoal = localStorage.getItem(`@app:dailyGoal:${userId}`);
      if (savedDailyGoal) {
        const val = parseFloat(savedDailyGoal) || 150;
        setDailyGoal(val);
        setTempDailyGoal(val.toString());
      }
    }

    const savedTodayProgress = localStorage.getItem(`@app:todayProgress:${userId}:${todayStr}`);
    const currentDayVal = savedTodayProgress ? parseFloat(savedTodayProgress) || 0 : 0;
    setTodayProgress(currentDayVal);

    calculateWeeklyTotal(userId, currentDayVal);
  }, [todayStr, calculateWeeklyTotal]);

  const loadDashboardMetrics = useCallback(async (userId: string) => {
    setLoadingDashboardData(true);
    try {
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (txs) {
        const incomes = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        const expenses = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0);
        setTotalIncomes(incomes);
        setTotalExpenses(expenses);

        const catMap: { [key: string]: number } = {};
        txs.filter(t => t.type === 'expense').forEach(t => {
          catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
        });
        setCategoryData(Object.keys(catMap).map(cat => ({ name: cat, value: catMap[cat] })));

        const dateMap: { [key: string]: { income: number; expense: number } } = {};
        txs.forEach(t => {
          const dateStr = t.date;
          if (!dateMap[dateStr]) dateMap[dateStr] = { income: 0, expense: 0 };
          if (t.type === 'income') dateMap[dateStr].income += Number(t.amount);
          else dateMap[dateStr].expense += Number(t.amount);
        });

        setEvolutionData(
          Object.keys(dateMap).sort().map(date => ({
            date: date.split('-').reverse().slice(0, 2).join('/'),
            Entradas: dateMap[date].income,
            Saídas: dateMap[date].expense
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoadingDashboardData(false);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        await loadUserSettings(session.user.id);
        await loadDashboardMetrics(session.user.id);
      }
      setAuthChecking(false);
    };

    checkUser();
  }, [router, loadUserSettings, loadDashboardMetrics]);

  const handleSaveDailyGoal = async () => {
    const val = parseFloat(tempDailyGoal);
    if (isNaN(val) || val <= 0) return;
    setDailyGoal(val);
    setIsEditingGoal(false);

    if (user) {
      localStorage.setItem(`@app:dailyGoal:${user.id}`, val.toString());
      await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, daily_goal: val }, { onConflict: 'user_id' });
    }
  };

  const handleAddTodayProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickInputAmount);
    if (isNaN(val) || val === 0) return;

    const newTotal = todayProgress + val;
    setTodayProgress(newTotal);
    setQuickInputAmount('');

    if (user) {
      localStorage.setItem(`@app:todayProgress:${user.id}:${todayStr}`, newTotal.toString());
      calculateWeeklyTotal(user.id, newTotal);

      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          title: 'Meta Diária / Faturamento',
          amount: val,
          type: 'income',
          category: 'Trabalho / Corridas',
          date: todayStr
        }
      ]);

      await loadDashboardMetrics(user.id);
    }
  };

  const handleResetTodayProgress = async () => {
    if (user && todayProgress > 0) {
      localStorage.removeItem(`@app:todayProgress:${user.id}:${todayStr}`);
      setTodayProgress(0);
      calculateWeeklyTotal(user.id, 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0A1F5B] flex items-center justify-center text-[#C7B8FF] text-xs font-semibold">
        Carregando informações do Fluxo Pay...
      </div>
    );
  }

  const netBalance = totalIncomes - totalExpenses;
  const progressPercentage = dailyGoal > 0 ? Math.min(Math.round((todayProgress / dailyGoal) * 100), 100) : 0;
  const actualPercentageRaw = dailyGoal > 0 ? Math.round((todayProgress / dailyGoal) * 100) : 0;
  const COLORS = ['#00D1FF', '#3B82F6', '#7C3AED', '#C7B8FF', '#0A1F5B'];

  // Variáveis dinâmicas para troca de temas
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex p-3 md:p-5 gap-4 relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0A1F5B] text-[#F8FAFF]' : 'bg-[#F8FAFF] text-[#0A1F5B]'
      }`}>
      {/* Background Glows com Glassmorphism */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none ${isDark ? 'bg-[#00D1FF]/10' : 'bg-[#00D1FF]/20'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none ${isDark ? 'bg-[#7C3AED]/15' : 'bg-[#7C3AED]/10'}`} />

      <Sidebar
        activeTab={currentTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 w-full pb-20 lg:pb-6 px-1 md:px-3 pt-2 overflow-y-auto z-10">
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">

          {/* Topbar com controle de Tema */}
          <div className="flex justify-between items-center pl-12 lg:pl-0">
            <div>
              <span className="text-xs text-[#00D1FF] font-black tracking-widest uppercase">Fluxo Pay</span>
              <h1 className={`text-xl md:text-2xl font-extrabold flex items-center gap-2 mt-0.5 capitalize ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                {currentTab === 'dashboard' ? 'Visão Geral' : currentTab.replace(/-/g, ' ')}{' '}
                <Sparkles size={18} className="text-[#00D1FF] animate-pulse" />
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2.5 rounded-2xl border text-xs font-bold transition-all shadow-md active:scale-95 ${isDark
                  ? 'bg-white/[0.05] border-white/10 text-[#C7B8FF] hover:text-[#00D1FF]'
                  : 'bg-white border-[#3B82F6]/20 text-[#3B82F6] hover:bg-slate-100'
                  }`}
                title="Alternar Tema Dark / Light"
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <button
                onClick={() => {
                  setModalType('expense');
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] hover:opacity-90 text-[#0A1F5B] px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-lg shadow-[#00D1FF]/20 active:scale-95 border border-white/20"
              >
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Novo Lançamento</span>
              </button>
            </div>
          </div>

          {/* DASHBOARD PRINCIPAL */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">

              {/* META DIÁRIA & GLASSMORPHISM CARD */}
              <div className={`backdrop-blur-2xl border p-6 rounded-3xl space-y-6 shadow-2xl relative ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-slate-200 shadow-slate-200/50'
                }`}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#00D1FF]/5 via-transparent to-[#7C3AED]/10 rounded-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20 px-3 py-1 rounded-full text-[11px] font-bold">
                      <Sparkles size={13} className="text-[#00D1FF]" /> Faturamento Diário & Semanal
                    </div>
                    <h2 className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                      Meta de Hoje: {actualPercentageRaw}% alcançado
                    </h2>
                    <p className={`text-xs max-w-xl leading-relaxed ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-600'}`}>
                      Sua contabilidade sincronizada em tempo real com a nova experiência Fluxo Pay.
                    </p>
                  </div>

                  {/* Configuração de Meta Diária e Faturamento Semanal */}
                  <div className="flex items-center gap-3">
                    <div className={`backdrop-blur-md border p-4 rounded-2xl flex flex-col gap-1 min-w-[150px] shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 border-white/10' : 'bg-white/80 border-slate-200'
                      }`}>
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                        <CalendarDays size={12} className="text-[#00D1FF]" /> Faturado na Semana
                      </span>
                      <div className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        {formatCurrency(weeklyGoalTotal)}
                      </div>
                    </div>

                    <div className={`backdrop-blur-md border p-4 rounded-2xl flex flex-col gap-1 min-w-[150px] shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 border-white/10' : 'bg-white/80 border-slate-200'
                      }`}>
                      <div className={`flex items-center justify-between text-[10px] font-semibold ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                        <span>Meta Diária</span>
                        <button
                          onClick={() => setIsEditingGoal(!isEditingGoal)}
                          className="text-[#00D1FF] hover:underline flex items-center gap-0.5"
                        >
                          <Settings2 size={11} /> {isEditingGoal ? 'Fechar' : 'Editar'}
                        </button>
                      </div>

                      {isEditingGoal ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            step="10"
                            value={tempDailyGoal}
                            onChange={(e) => setTempDailyGoal(e.target.value)}
                            className={`w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#00D1FF] font-bold ${isDark ? 'bg-[#0A1F5B] border-[#3B82F6]/50 text-[#F8FAFF]' : 'bg-slate-50 border-slate-300 text-[#0A1F5B]'
                              }`}
                          />
                          <button
                            onClick={handleSaveDailyGoal}
                            className="bg-[#00D1FF] hover:opacity-90 text-[#0A1F5B] p-1.5 rounded-lg text-xs font-bold shrink-0"
                            title="Salvar"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-lg font-black text-[#00D1FF]">
                          {formatCurrency(dailyGoal)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO E ADIÇÃO RÁPIDA */}
                <div className={`backdrop-blur-md border p-5 rounded-2xl space-y-4 relative z-10 shadow-inner ${isDark ? 'bg-[#0A1F5B]/50 border-white/10' : 'bg-slate-100/70 border-slate-200'
                  }`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div>
                      <span className={isDark ? 'text-[#C7B8FF] font-medium' : 'text-slate-600 font-medium'}>Faturado Hoje: </span>
                      <strong className={`text-sm font-black ml-1 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        {formatCurrency(todayProgress)}
                      </strong>
                      <span className={`ml-2 ${isDark ? 'text-[#C7B8FF]/60' : 'text-slate-500'}`}>({actualPercentageRaw}% da meta)</span>
                    </div>

                    {todayProgress > 0 && (
                      <button
                        onClick={handleResetTodayProgress}
                        className={`text-[10px] underline font-medium ${isDark ? 'text-[#C7B8FF]/75 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'}`}
                      >
                        Limpar visualização de hoje
                      </button>
                    )}
                  </div>

                  {/* Barra visual de progresso */}
                  <div className={`h-3 rounded-full overflow-hidden border p-0.5 ${isDark ? 'bg-[#0A1F5B] border-white/10' : 'bg-slate-200 border-slate-300'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#00D1FF] via-[#3B82F6] to-[#7C3AED]"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* Input rápido */}
                  <form onSubmit={handleAddTodayProgress} className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-[#00D1FF] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 45.00 (adicionar valor de corrida/entrega)"
                        value={quickInputAmount}
                        onChange={(e) => setQuickInputAmount(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#00D1FF] font-medium ${isDark
                          ? 'bg-[#0A1F5B]/80 border-white/10 text-[#F8FAFF] placeholder-[#C7B8FF]/40'
                          : 'bg-white border-slate-200 text-[#0A1F5B] placeholder-slate-400'
                          }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] hover:opacity-90 text-[#0A1F5B] px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-lg shadow-[#00D1FF]/20 border border-white/20"
                    >
                      <PlusCircle size={15} /> Adicionar ao Saldo
                    </button>
                  </form>
                </div>

              </div>

              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`backdrop-blur-xl border p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden group transition-all ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-[#00D1FF]/40' : 'bg-white border-slate-200 shadow-slate-200/50 hover:border-[#00D1FF]/40'
                  }`}>
                  <div className={`flex items-center justify-between ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                    <span className="text-xs font-semibold">Saldo Líquido</span>
                    <div className="p-2 bg-[#00D1FF]/10 text-[#00D1FF] rounded-xl border border-[#00D1FF]/20">
                      <Wallet size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black ${netBalance >= 0 ? (isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]') : 'text-rose-400'}`}>
                      {formatCurrency(netBalance)}
                    </h3>
                    <p className="text-[11px] text-[#00D1FF] font-medium mt-1">Consolidado geral</p>
                  </div>
                </div>

                <div className={`backdrop-blur-xl border p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden group transition-all ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-[#3B82F6]/40' : 'bg-white border-slate-200 shadow-slate-200/50 hover:border-[#3B82F6]/40'
                  }`}>
                  <div className={`flex items-center justify-between ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                    <span className="text-xs font-semibold">Ganhos Totais</span>
                    <div className="p-2 bg-[#3B82F6]/10 text-[#3B82F6] rounded-xl border border-[#3B82F6]/20">
                      <ArrowUpCircle size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                      {formatCurrency(totalIncomes)}
                    </h3>
                    <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Entradas registradas</p>
                  </div>
                </div>

                <div className={`backdrop-blur-xl border p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden group transition-all ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-rose-500/40' : 'bg-white border-slate-200 shadow-slate-200/50 hover:border-rose-500/40'
                  }`}>
                  <div className={`flex items-center justify-between ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                    <span className="text-xs font-semibold">Gastos Totais</span>
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                      <ArrowDownCircle size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                      {formatCurrency(totalExpenses)}
                    </h3>
                    <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Saídas registradas</p>
                  </div>
                </div>

                <div className={`backdrop-blur-xl border p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden group transition-all ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-[#7C3AED]/40' : 'bg-white border-slate-200 shadow-slate-200/50 hover:border-[#7C3AED]/40'
                  }`}>
                  <div className={`flex items-center justify-between ${isDark ? 'text-[#C7B8FF]' : 'text-slate-500'}`}>
                    <span className="text-xs font-semibold">Meta Diária Alvo</span>
                    <div className="p-2 bg-[#7C3AED]/10 text-[#7C3AED] rounded-xl border border-[#7C3AED]/20">
                      <Target size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#7C3AED]">
                      {formatCurrency(dailyGoal)}
                    </h3>
                    <p className={`text-[11px] font-medium mt-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Objetivo por jornada</p>
                  </div>
                </div>
              </div>

              {/* GRÁFICOS VISUAIS COM ESTILO GLASS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-4 shadow-xl ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                      <TrendingUp size={16} className="text-[#00D1FF]" /> Evolução de Entradas x Saídas
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    {evolutionData.length === 0 ? (
                      <div className={`h-full flex items-center justify-center text-xs ${isDark ? 'text-[#C7B8FF]/50' : 'text-slate-400'}`}>
                        Nenhum dado lançado para o gráfico temporal.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={evolutionData}>
                          <XAxis dataKey="date" stroke={isDark ? '#C7B8FF' : '#64748b'} fontSize={11} />
                          <YAxis stroke={isDark ? '#C7B8FF' : '#64748b'} fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: isDark ? '#0A1F5B' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: isDark ? '#F8FAFF' : '#0A1F5B' }} />
                          <Area type="monotone" dataKey="Entradas" stroke="#00D1FF" fill="#00D1FF" fillOpacity={0.25} />
                          <Area type="monotone" dataKey="Saídas" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-4 shadow-xl ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'
                  }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                      <PieChartIcon size={16} className="text-[#7C3AED]" /> Distribuição de Gastos por Categoria
                    </h3>
                  </div>
                  <div className="h-64 w-full flex items-center justify-center">
                    {categoryData.length === 0 ? (
                      <div className={`h-full flex items-center justify-center text-xs ${isDark ? 'text-[#C7B8FF]/50' : 'text-slate-400'}`}>
                        Nenhum gasto registrado para exibir categorias.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={{ backgroundColor: isDark ? '#0A1F5B' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: isDark ? '#F8FAFF' : '#0A1F5B' }} />
                          <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                            {categoryData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Atalhos Rápidos */}
              <div className={`backdrop-blur-xl border rounded-3xl p-6 space-y-4 shadow-xl ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                  <Clock size={16} className="text-[#00D1FF]" /> Acesso Rápido às Abas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleTabChange('plano-de-vida')}
                    className={`flex items-center justify-between p-4 border rounded-2xl text-left transition-all active:scale-95 group shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 hover:bg-[#0A1F5B] border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                  >
                    <div>
                      <h4 className={`text-xs font-bold transition-colors ${isDark ? 'text-[#F8FAFF] group-hover:text-[#00D1FF]' : 'text-[#0A1F5B] group-hover:text-[#3B82F6]'}`}>Plano de Vida</h4>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Metas diárias de trabalho</p>
                    </div>
                    <ChevronRight size={16} className={`transition-colors ${isDark ? 'text-[#C7B8FF]/50 group-hover:text-[#00D1FF]' : 'text-slate-400 group-hover:text-[#3B82F6]'}`} />
                  </button>

                  <button
                    onClick={() => handleTabChange('investimentos')}
                    className={`flex items-center justify-between p-4 border rounded-2xl text-left transition-all active:scale-95 group shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 hover:bg-[#0A1F5B] border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                  >
                    <div>
                      <h4 className={`text-xs font-bold transition-colors ${isDark ? 'text-[#F8FAFF] group-hover:text-[#00D1FF]' : 'text-[#0A1F5B] group-hover:text-[#3B82F6]'}`}>Investimentos</h4>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Carteira e reserva</p>
                    </div>
                    <ChevronRight size={16} className={`transition-colors ${isDark ? 'text-[#C7B8FF]/50 group-hover:text-[#00D1FF]' : 'text-slate-400 group-hover:text-[#3B82F6]'}`} />
                  </button>

                  <button
                    onClick={() => handleTabChange('gastos-ganhos')}
                    className={`flex items-center justify-between p-4 border rounded-2xl text-left transition-all active:scale-95 group shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 hover:bg-[#0A1F5B] border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                  >
                    <div>
                      <h4 className={`text-xs font-bold transition-colors ${isDark ? 'text-[#F8FAFF] group-hover:text-[#00D1FF]' : 'text-[#0A1F5B] group-hover:text-[#3B82F6]'}`}>Gastos e Ganhos</h4>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Fluxo de caixa diário</p>
                    </div>
                    <ChevronRight size={16} className={`transition-colors ${isDark ? 'text-[#C7B8FF]/50 group-hover:text-[#00D1FF]' : 'text-slate-400 group-hover:text-[#3B82F6]'}`} />
                  </button>

                  <button
                    onClick={() => handleTabChange('metas')}
                    className={`flex items-center justify-between p-4 border rounded-2xl text-left transition-all active:scale-95 group shadow-inner ${isDark ? 'bg-[#0A1F5B]/60 hover:bg-[#0A1F5B] border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                  >
                    <div>
                      <h4 className={`text-xs font-bold transition-colors ${isDark ? 'text-[#F8FAFF] group-hover:text-[#00D1FF]' : 'text-[#0A1F5B] group-hover:text-[#3B82F6]'}`}>Metas</h4>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Objetivos e conquistas</p>
                    </div>
                    <ChevronRight size={16} className={`transition-colors ${isDark ? 'text-[#C7B8FF]/50 group-hover:text-[#00D1FF]' : 'text-slate-400 group-hover:text-[#3B82F6]'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEMAIS ABAS DO SISTEMA */}
          {currentTab === 'plano-de-vida' && (
            <PlanoDeVidaTab userId={user?.id} dailyGoal={dailyGoal} />
          )}

          {currentTab === 'investimentos' && (
            <InvestimentosTab userId={user?.id} dailyGoal={dailyGoal} />
          )}

          {currentTab === 'gastos-ganhos' && (
            <GastosGanhosTab userId={user?.id} dailyGoal={dailyGoal} />
          )}

          {currentTab === 'metas' && (
            <MetasTab userId={user?.id} monthlySavingsBase={1200} />
          )}

        </div>
      </main>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          if (user) loadDashboardMetrics(user.id);
        }}
        initialType={modalType}
      />

      <WorkProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={workProfile}
        onSelect={(p) => {
          setWorkProfile(p);
          if (user) localStorage.setItem(`@app:workProfile:${user.id}`, p);
        }}
      />
    </div>
  );
}