'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Target,
  Clock,
  Zap,
  Award,
  Calendar,
  Plus,
  CheckCircle2,
  AlertCircle,
  Flame,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  PiggyBank,
  X,
  Calculator,
  Info,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PlanoDeVidaTabProps {
  userId?: string;
  dailyGoal?: number;
}

interface DayLog {
  id?: string;
  day: string;
  dateStr: string;
  earned: number;
  goal: number;
  hours: number;
}

interface DebtItem {
  id: string;
  title: string;
  totalAmount: number;
  remainingAmount: number;
  type: 'atrasado' | 'longo_prazo';
  dueDate?: string;
}

interface DreamItem {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  category: 'sonho' | 'compra';
}

export default function PlanoDeVidaTab({ userId: propUserId, dailyGoal = 150 }: PlanoDeVidaTabProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [loading, setLoading] = useState(true);
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

  // Estados dos Gráficos e Desempenho
  const [filter, setFilter] = useState<'semana' | 'mes'>('semana');
  const [weeklyLogs, setWeeklyLogs] = useState<DayLog[]>([]);
  const [todayEarned, setTodayEarned] = useState<number>(0);
  const [todayHours, setTodayHours] = useState<number>(0);

  // Estados Financeiros Reais
  const [emergencyReserve, setEmergencyReserve] = useState<number>(0);
  const [editingReserve, setEditingReserve] = useState(false);
  const [tempReserve, setTempReserve] = useState('0');
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [dreams, setDreams] = useState<DreamItem[]>([]);

  // Modais de Cadastro
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isDreamModalOpen, setIsDreamModalOpen] = useState(false);

  // Formulário Dívida
  const [newDebtTitle, setNewDebtTitle] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtType, setNewDebtType] = useState<'atrasado' | 'longo_prazo'>('atrasado');

  // Formulário Sonhos
  const [newDreamTitle, setNewDreamTitle] = useState('');
  const [newDreamTarget, setNewDreamTarget] = useState('');
  const [newDreamSaved, setNewDreamSaved] = useState('');
  const [newDreamCategory, setNewDreamCategory] = useState<'sonho' | 'compra'>('compra');

  // 1. CARREGAR DADOS REAIS DO USUÁRIO LOGADO NO SUPABASE
  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      let uid = currentUserId;

      // Se o userId não veio via prop, recupera a sessão ativa do Supabase
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          uid = user.id;
          setCurrentUserId(user.id);
        }
      }

      if (!uid) {
        setLoading(false);
        return;
      }

      // a) Busca os últimos 7 dias de produção (daily_logs)
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(7);

      if (logsData && logsData.length > 0) {
        const mapped: DayLog[] = logsData.reverse().map((item: any) => ({
          id: item.id,
          day: new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
          dateStr: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          earned: Number(item.amount || 0),
          goal: Number(item.goal || dailyGoal),
          hours: Number(item.hours || 0)
        }));
        setWeeklyLogs(mapped);

        const todayItem = mapped[mapped.length - 1];
        if (todayItem) {
          setTodayEarned(todayItem.earned);
          setTodayHours(todayItem.hours);
        }
      } else {
        setWeeklyLogs([]);
      }

      // b) Busca a Reserva de Emergência na tabela profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('emergency_reserve')
        .eq('id', uid)
        .maybeSingle();

      if (profileData) {
        setEmergencyReserve(Number(profileData.emergency_reserve || 0));
      }

      // c) Busca a Lista de Dívidas Reais
      const { data: debtsData } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (debtsData) {
        setDebts(debtsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          totalAmount: Number(d.total_amount || 0),
          remainingAmount: Number(d.remaining_amount || 0),
          type: d.type || 'atrasado',
          dueDate: d.due_date
        })));
      }

      // d) Busca a Lista de Objetivos / Sonhos Reais
      const { data: dreamsData } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (dreamsData) {
        setDreams(dreamsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          targetAmount: Number(d.target_amount || 0),
          savedAmount: Number(d.saved_amount || 0),
          category: d.category || 'compra'
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados do Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, dailyGoal]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // 2. AÇÕES DE BANCO DE DADOS (SUPABASE CRUD)

  // Atualizar Reserva de Emergência
  const handleSaveReserve = async () => {
    if (!currentUserId) return;
    const parsed = parseFloat(tempReserve);
    if (isNaN(parsed)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: currentUserId, emergency_reserve: parsed });

      if (!error) {
        setEmergencyReserve(parsed);
        setEditingReserve(false);
      }
    } catch (err) {
      console.error('Erro ao salvar reserva:', err);
    }
  };

  // Cadastrar Nova Dívida
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtTitle || !newDebtAmount || !currentUserId) return;
    const val = parseFloat(newDebtAmount);

    try {
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          user_id: currentUserId,
          title: newDebtTitle,
          total_amount: val,
          remaining_amount: val,
          type: newDebtType
        }])
        .select()
        .single();

      if (!error && data) {
        setDebts(prev => [
          {
            id: data.id,
            title: data.title,
            totalAmount: Number(data.total_amount),
            remainingAmount: Number(data.remaining_amount),
            type: data.type
          },
          ...prev
        ]);
        setNewDebtTitle('');
        setNewDebtAmount('');
        setIsDebtModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao inserir dívida:', err);
    }
  };

  // Remover Dívida
  const handleDeleteDebt = async (id: string) => {
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (!error) {
        setDebts(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir dívida:', err);
    }
  };

  // Cadastrar Novo Objetivo / Sonho
  const handleAddDream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDreamTitle || !newDreamTarget || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('dreams')
        .insert([{
          user_id: currentUserId,
          title: newDreamTitle,
          target_amount: parseFloat(newDreamTarget),
          saved_amount: parseFloat(newDreamSaved || '0'),
          category: newDreamCategory
        }])
        .select()
        .single();

      if (!error && data) {
        setDreams(prev => [
          {
            id: data.id,
            title: data.title,
            targetAmount: Number(data.target_amount),
            savedAmount: Number(data.saved_amount),
            category: data.category
          },
          ...prev
        ]);
        setNewDreamTitle('');
        setNewDreamTarget('');
        setNewDreamSaved('');
        setIsDreamModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao inserir sonho:', err);
    }
  };

  // Remover Objetivo / Sonho
  const handleDeleteDream = async (id: string) => {
    try {
      const { error } = await supabase.from('dreams').delete().eq('id', id);
      if (!error) {
        setDreams(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir objetivo:', err);
    }
  };

  // CÁLCULOS E DIAGNÓSTICO
  const weeklyGoal = dailyGoal * 6;
  const totalWeeklyEarned = weeklyLogs.reduce((acc, item) => acc + item.earned, 0);
  const todayProgressPercent = Math.min(Math.round((todayEarned / (dailyGoal || 1)) * 100), 100);
  const remainingToday = Math.max(dailyGoal - todayEarned, 0);
  const hourlyRate = todayHours > 0 ? (todayEarned / todayHours).toFixed(2) : '0.00';
  const maxWeeklyEarned = Math.max(...weeklyLogs.map(l => l.earned), dailyGoal, 1);

  const totalDebts = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const overdueDebts = debts.filter(d => d.type === 'atrasado').reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalDreamsRemaining = dreams.reduce((acc, d) => acc + (d.targetAmount - d.savedAmount), 0);

  const workDaysForTotalDebts = Math.ceil(totalDebts / (dailyGoal || 1));
  const workDaysForOverdue = Math.ceil(overdueDebts / (dailyGoal || 1));
  const workDaysForDreams = Math.ceil(totalDreamsRemaining / (dailyGoal || 1));

  const getHealthStatus = () => {
    if (overdueDebts > 0 && emergencyReserve < overdueDebts) {
      return {
        label: 'Atenção Crítica',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        desc: 'Você possui dívidas em atraso superiores à sua reserva. Priorize quitar as pendências no seu nome.'
      };
    }
    if (totalDebts > emergencyReserve * 2 && totalDebts > 0) {
      return {
        label: 'Saúde em Risco',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        desc: 'O acumulado de dívidas está elevado. Mantenha o ritmo de trabalho focado na quitação.'
      };
    }
    return {
      label: 'Saúde Estável',
      color: isDark ? 'text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/30' : 'text-blue-600 bg-blue-50 border-blue-200',
      desc: 'Sua vida financeira está sob controle. Continue mantendo a meta diária!'
    };
  };

  const health = getHealthStatus();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
        <Loader2 className={`animate-spin ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} size={32} />
        <p className="text-xs font-semibold">Carregando dados da sua conta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* BLOCO 1: DIAGNÓSTICO DE SAÚDE FINANCEIRA */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${isDark
              ? 'bg-gradient-to-r from-[#00D1FF]/20 to-[#3B82F6]/20 text-[#00D1FF] border-[#00D1FF]/30 shadow-lg shadow-[#00D1FF]/10'
              : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
              <HeartPulse size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-extrabold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Saúde da Vida Financeira</h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${health.color}`}>
                  {health.label}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{health.desc}</p>
            </div>
          </div>

          <div className={`border px-4 py-2 rounded-2xl flex items-center gap-3 self-start sm:self-auto ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <Calculator size={18} className="text-amber-400 shrink-0" />
            <div>
              <span className={`text-[10px] font-medium block ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Sua Meta Diária Base</span>
              <span className={`text-xs font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {dailyGoal.toFixed(2)}/dia</span>
            </div>
          </div>
        </div>

        {/* Resumo de Esforço em Dias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-rose-500/20' : 'bg-rose-50/50 border-rose-200'
            }`}>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert size={16} /> Pendências Atrasadas
            </span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {overdueDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span>Exige <strong className="text-amber-400">{workDaysForOverdue} dias</strong> de trabalho</span>
            </p>
          </div>

          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-600'}`}>
              <AlertCircle size={16} className="text-amber-400" /> Dívidas Totais
            </span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Clock size={13} className={isDark ? 'text-[#00D1FF] shrink-0' : 'text-blue-600 shrink-0'} />
              <span>Exige <strong className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'}>{workDaysForTotalDebts} dias</strong> de trabalho</span>
            </p>
          </div>

          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
              <Target size={16} /> Faltante p/ Sonhos
            </span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {totalDreamsRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Sparkles size={13} className={isDark ? 'text-[#00D1FF] shrink-0' : 'text-blue-600 shrink-0'} />
              <span>Conquiste em <strong className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'}>{workDaysForDreams} dias</strong> de foco</span>
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 2: GRÁFICOS SVG (DONUT & RITMO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* GRÁFICO SVG DONUT (DONUT CHART DE META HOJE) */}
        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                <Target size={22} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Progresso da Meta Diária Hoje</h3>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Desempenho do seu turno atual</p>
              </div>
            </div>

            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${todayEarned >= dailyGoal
              ? isDark
                ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
              {todayEarned >= dailyGoal ? 'Meta Batida! 🎉' : 'Em Progresso'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center py-4">
            {/* SVG DONUT */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className={isDark ? 'text-white/10' : 'text-slate-200'}
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`transition-all duration-1000 ease-out ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}
                    strokeDasharray={`${todayProgressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{todayProgressPercent}%</span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Atingido</span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Faturado Hoje</p>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                    R$ {todayEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Meta Estabelecida</p>
                  <p className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${isDark
                      ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6]'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                      }`}
                    style={{ width: `${todayProgressPercent}%` }}
                  />
                </div>
                <p className={`text-[11px] flex justify-between ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                  <span>{todayEarned >= dailyGoal ? 'Objetivo concluído!' : `Faltam R$ ${remainingToday.toFixed(2)}`}</span>
                  <span>{todayHours}h trabalhadas</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MÉTRICAS DE HOJE */}
        <div className={`backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Rendimento por Hora</h3>
            </div>
            <Flame size={18} className="text-orange-400 animate-pulse" />
          </div>

          <div className="space-y-3">
            <div className={`p-3.5 rounded-2xl border flex justify-between items-center ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div>
                <p className={`text-[11px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Ganho Médio / Hora</p>
                <p className={`text-lg font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>R$ {hourlyRate}/h</p>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'}`}>
                <Clock size={18} />
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex justify-between items-center ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <div>
                <p className={`text-[11px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Meta Semanal Est.</p>
                <p className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {weeklyGoal.toLocaleString('pt-BR')}</p>
              </div>
              <div className={`p-2 rounded-xl ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'}`}>
                <Award size={18} />
              </div>
            </div>
          </div>

          <div className={`text-[10px] text-center font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
            Calculado com base nas horas informadas
          </div>
        </div>

      </div>

      {/* BLOCO 3: GRÁFICO DE BARRAS SVG (DESEMPENHO DA SEMANA) */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-6 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <TrendingUp size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Rendimento Semanal vs. Meta Diária
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Acompanhamento dos lançamentos diários da sua conta</p>
          </div>

          <div className={`flex items-center gap-2 p-1 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <button
              onClick={() => setFilter('semana')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'semana'
                ? isDark
                  ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B]'
                  : 'bg-blue-600 text-white'
                : isDark ? 'text-[#C7B8FF]/70 hover:text-white' : 'text-slate-600 hover:text-[#0A1F5B]'
                }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilter('mes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'mes'
                ? isDark
                  ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B]'
                  : 'bg-blue-600 text-white'
                : isDark ? 'text-[#C7B8FF]/70 hover:text-white' : 'text-slate-600 hover:text-[#0A1F5B]'
                }`}
            >
              Este Mês
            </button>
          </div>
        </div>

        {weeklyLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Nenhum registro diário encontrado nesta conta para exibir o gráfico.
          </div>
        ) : (
          <div className="space-y-2 pt-4">
            <div className={`h-56 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 pb-2 relative border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>

              {/* Linha Tracejada da Meta Diária */}
              <div
                className={`absolute left-0 right-0 border-t-2 border-dashed z-10 flex justify-end pr-2 pointer-events-none ${isDark ? 'border-[#00D1FF]/40' : 'border-blue-400/40'
                  }`}
                style={{ bottom: `${Math.min((dailyGoal / maxWeeklyEarned) * 100, 90)}%` }}
              >
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${isDark
                  ? 'text-[#00D1FF] bg-slate-950/90 border-[#00D1FF]/30'
                  : 'text-blue-700 bg-white/90 border-blue-200'
                  }`}>
                  Meta: R$ {dailyGoal}
                </span>
              </div>

              {/* Renderização das Barras */}
              {weeklyLogs.map((item, index) => {
                const barHeightPercent = Math.min((item.earned / maxWeeklyEarned) * 100, 100);
                const isGoalReached = item.earned >= dailyGoal;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group relative">

                    {/* Tooltip */}
                    <div className={`absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 border p-2 rounded-xl shadow-xl z-20 pointer-events-none text-center min-w-[90px] ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                      <p className="text-[10px] text-slate-400 font-bold">{item.day} ({item.dateStr})</p>
                      <p className={`text-xs font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>R$ {item.earned}</p>
                      <p className="text-[9px] text-slate-400">{item.hours}h de trabalho</p>
                    </div>

                    <div className={`w-full max-w-[42px] rounded-2xl h-full flex items-end overflow-hidden p-1 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'
                      }`}>
                      <div
                        className={`w-full rounded-xl transition-all duration-700 ${isGoalReached
                          ? isDark
                            ? 'bg-gradient-to-t from-[#00D1FF] to-[#3B82F6] shadow-lg shadow-[#00D1FF]/20'
                            : 'bg-gradient-to-t from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20'
                          : item.earned > 0
                            ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                            : isDark ? 'bg-white/10' : 'bg-slate-200'
                          }`}
                        style={{ height: `${item.earned > 0 ? Math.max(barHeightPercent, 8) : 4}%` }}
                      />
                    </div>

                    <span className={`text-[11px] font-bold mt-2 uppercase tracking-wide transition-colors ${isDark ? 'text-[#C7B8FF]/70 group-hover:text-white' : 'text-slate-500 group-hover:text-[#0A1F5B]'
                      }`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={`flex items-center justify-between text-[11px] pt-2 px-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-[#00D1FF]' : 'bg-blue-600'}`} />
                  <span>Meta Batida</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Abaixo da Meta</span>
                </div>
              </div>
              <span className={`font-semibold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                Total Registrado: <strong className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'}>R$ {totalWeeklyEarned.toLocaleString('pt-BR')}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 4: HISTÓRICO RECENTE */}
      <div className={`backdrop-blur-xl border rounded-3xl p-6 space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <Calendar size={16} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Histórico Recente de Dias Trabalhados
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Detalhamento dos ganhos reais gravados no banco</p>
          </div>
        </div>

        {weeklyLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Nenhuma jornada cadastrada ainda.</p>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
            {weeklyLogs.map((log, idx) => {
              const hitGoal = log.earned >= dailyGoal;
              return (
                <div key={idx} className={`py-3 flex items-center justify-between px-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${hitGoal
                      ? isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'
                      : isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
                      }`}>
                      {hitGoal ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold uppercase ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{log.day} <span className={`font-normal ${isDark ? 'text-[#C7B8FF]/60' : 'text-slate-400'}`}>({log.dateStr})</span></h4>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{log.hours} horas registradas</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs font-black ${log.earned > 0 ? (isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]') : 'text-slate-500'}`}>
                      R$ {log.earned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[10px] font-semibold ${hitGoal ? (isDark ? 'text-[#00D1FF]' : 'text-blue-600') : 'text-slate-500'}`}>
                      {log.earned > 0 ? `${Math.round((log.earned / dailyGoal) * 100)}% da meta` : 'Sem registro'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 5: DÍVIDAS E PENDÊNCIAS DA CONTA */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <ShieldAlert size={18} className="text-rose-400" /> Dívidas & Pendências Cadastradas
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Tempo de trabalho estimado para quitação com base na sua meta diária</p>
          </div>

          <button
            onClick={() => setIsDebtModalOpen(true)}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus size={16} /> Adicionar Dívida
          </button>
        </div>

        {debts.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Nenhuma dívida cadastrada para esta conta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((debt) => {
              const daysToPay = Math.ceil(debt.remainingAmount / (dailyGoal || 1));
              const hoursToPay = daysToPay * 8;
              const progress = debt.totalAmount > 0
                ? Math.round(((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100)
                : 0;

              return (
                <div
                  key={debt.id}
                  className={`p-5 rounded-2xl border space-y-4 relative transition-all ${debt.type === 'atrasado'
                    ? 'border-rose-500/30 shadow-lg shadow-rose-500/5 bg-rose-500/[0.02]'
                    : isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/90 border-slate-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${debt.type === 'atrasado'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                        {debt.type === 'atrasado' ? 'Em Atraso / Negativado' : 'Longo Prazo / Parcelado'}
                      </span>
                      <h4 className={`text-sm font-bold mt-1.5 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{debt.title}</h4>
                    </div>

                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Excluir dívida"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={`flex items-baseline justify-between border-t border-b py-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Saldo Devedor</span>
                      <p className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        R$ {debt.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Valor Total</span>
                      <p className={`text-xs font-bold ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-600'}`}>
                        R$ {debt.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      <div>
                        <p className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Esforço para Quitar</p>
                        <p className="text-xs font-extrabold text-amber-400">
                          {daysToPay} {daysToPay === 1 ? 'dia' : 'dias'} de trabalho ({hoursToPay}h)
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold px-2 py-1 rounded-md border ${isDark ? 'bg-white/[0.04] border-white/10 text-[#C7B8FF]/80' : 'bg-white border-slate-200 text-slate-600'
                      }`}>
                      Meta: R${dailyGoal}/dia
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className={`flex justify-between text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                      <span>Progresso de pagamento</span>
                      <span>{progress}% pago</span>
                    </div>
                    <div className={`rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${debt.type === 'atrasado' ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(progress, 3)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 6: RESERVA & COMPRAS PLANEJADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RESERVA DE EMERGÊNCIA */}
        <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <PiggyBank size={20} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
                <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Reserva de Emergência</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isDark ? 'text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/20' : 'text-blue-600 bg-blue-50 border-blue-200'
                }`}>
                Segurança
              </span>
            </div>

            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              Sua proteção para imprevistos do dia a dia e manutenção veicular.
            </p>

            <div className={`border p-4 rounded-2xl space-y-2 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Total Guardado</span>
              {editingReserve ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempReserve}
                    onChange={(e) => setTempReserve(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none ${isDark
                      ? 'bg-slate-900 border-white/20 text-white focus:border-[#00D1FF]'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                  />
                  <button
                    onClick={handleSaveReserve}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isDark ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B]' : 'bg-blue-600 text-white'
                      }`}
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h4 className={`text-2xl font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
                    R$ {emergencyReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h4>
                  <button
                    onClick={() => {
                      setTempReserve(emergencyReserve.toString());
                      setEditingReserve(true);
                    }}
                    className={`text-[10px] underline ${isDark ? 'text-[#C7B8FF]/80 hover:text-white' : 'text-slate-500 hover:text-[#0A1F5B]'}`}
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border text-[11px] space-y-1 ${isDark ? 'bg-[#00D1FF]/5 border-[#00D1FF]/15 text-[#C7B8FF]' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
            <p className="font-bold flex items-center gap-1">
              <Info size={13} /> Dica de Segurança:
            </p>
            <p className={isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}>
              Mantenha pelo menos o equivalente a 3 meses de despesas salvas no banco.
            </p>
          </div>
        </div>

        {/* COMPRAS E OBJETIVOS */}
        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                <Sparkles size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Planejamento de Compras & Sonhos
              </h3>
              <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Contagem regressiva de dias de trabalho para realizar cada meta</p>
            </div>

            <button
              onClick={() => setIsDreamModalOpen(true)}
              className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto ${isDark
                ? 'bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 text-[#00D1FF] border-[#00D1FF]/30'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                }`}
            >
              <Plus size={16} /> Novo Objetivo
            </button>
          </div>

          {dreams.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Nenhum objetivo cadastrado nesta conta.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dreams.map((dream) => {
                const remaining = Math.max(dream.targetAmount - dream.savedAmount, 0);
                const daysToDream = Math.ceil(remaining / (dailyGoal || 1));
                const progress = dream.targetAmount > 0
                  ? Math.round((dream.savedAmount / dream.targetAmount) * 100)
                  : 0;

                return (
                  <div key={dream.id} className={`border p-4 rounded-2xl space-y-3 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/90 border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'
                          }`}>
                          <Target size={16} />
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{dream.title}</h4>
                          <span className={`text-[10px] capitalize ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{dream.category}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteDream(dream.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Excluir objetivo"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Guardado / Meta</span>
                          <span className={`font-bold text-[11px] ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                            R$ {dream.savedAmount} / R$ {dream.targetAmount}
                          </span>
                        </div>
                        <div className={`rounded-full h-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${isDark
                              ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6]'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                              }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className={`border p-2.5 rounded-xl flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex items-center gap-2">
                          <Clock size={15} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
                          <span className={`text-[11px] font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                            {daysToDream <= 0 ? 'Conquistado! 🎉' : `Faltam ${daysToDream} dias de trabalho`}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>{progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL CADASTRAR DÍVIDA */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold">Cadastrar Dívida na Sua Conta</h3>
              <button onClick={() => setIsDebtModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Título / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Cartão de Crédito, Financiamento, Serasa..."
                  value={newDebtTitle}
                  onChange={(e) => setNewDebtTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Restante Devedor (R$)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newDebtAmount}
                  onChange={(e) => setNewDebtAmount(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Categoria da Dívida</label>
                <select
                  value={newDebtType}
                  onChange={(e: any) => setNewDebtType(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                >
                  <option value="atrasado">Em Atraso / Sujo no Nome / Pendência</option>
                  <option value="longo_prazo">Longo Prazo / Financiamento / Parcelado</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDebtModalOpen(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Salvar Dívida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR SONHO / OBJETIVO */}
      {isDreamModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold">Cadastrar Novo Objetivo</h3>
              <button onClick={() => setIsDreamModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDream} className="space-y-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>O que você deseja conquistar?</label>
                <input
                  type="text"
                  placeholder="Ex: Moto Nova, Viagem, Equipamento..."
                  value={newDreamTitle}
                  onChange={(e) => setNewDreamTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Meta (R$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newDreamTarget}
                    onChange={(e) => setNewDreamTarget(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Já Guardado (R$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newDreamSaved}
                    onChange={(e) => setNewDreamSaved(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Categoria</label>
                <select
                  value={newDreamCategory}
                  onChange={(e: any) => setNewDreamCategory(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                >
                  <option value="compra">Compra Planejada</option>
                  <option value="sonho">Sonho / Meta Pessoal</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDreamModalOpen(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B]' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Salvar Objetivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}