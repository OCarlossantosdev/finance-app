'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Clock,
  Zap,
  Calendar,
  Plus,
  AlertCircle,
  HeartPulse,
  ShieldAlert,
  Sparkles,
  PiggyBank,
  X,
  Calculator,
  Loader2,
  ArrowUpCircle
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
  paidAmount: number;
  type: 'atrasado' | 'longo_prazo';
  priority: 'alta' | 'media' | 'baixa';
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
  const [weeklyLogs, setWeeklyLogs] = useState<DayLog[]>([]);
  const [todayEarned, setTodayEarned] = useState<number>(0);
  const [todayHours, setTodayHours] = useState<number>(0);

  // Estados Financeiros Reais
  const [emergencyReserve, setEmergencyReserve] = useState<number>(0);
  const [editingReserve, setEditingReserve] = useState(false);
  const [tempReserve, setTempReserve] = useState('0');
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [dreams, setDreams] = useState<DreamItem[]>([]);

  // Modais
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isDreamModalOpen, setIsDreamModalOpen] = useState(false);

  // Modal de Pagamento / Abatimento de Dívida
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Formulário Dívida
  const [newDebtTitle, setNewDebtTitle] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtType, setNewDebtType] = useState<'atrasado' | 'longo_prazo'>('atrasado');
  const [newDebtPriority, setNewDebtPriority] = useState<'alta' | 'media' | 'baixa'>('alta');

  // Formulário Sonhos
  const [newDreamTitle, setNewDreamTitle] = useState('');
  const [newDreamTarget, setNewDreamTarget] = useState('');
  const [newDreamSaved, setNewDreamSaved] = useState('');
  const [newDreamCategory, setNewDreamCategory] = useState<'sonho' | 'compra'>('compra');

  // Função utilitária para mascarar dinheiro em tempo real (Ex: 1250,50)
  const handleCurrencyInput = (value: string, setter: (val: string) => void) => {
    const onlyDigits = value.replace(/\D/g, '');
    if (!onlyDigits) {
      setter('');
      return;
    }
    const numberValue = Number(onlyDigits) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setter(formatted);
  };

  // Converte string formatada ("1.250,50") para float numérico do banco (1250.50)
  const parseCurrencyToNumber = (formattedStr: string) => {
    if (!formattedStr) return 0;
    const clean = formattedStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  // 1. CARREGAR DADOS DO SUPABASE
  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      let uid = currentUserId;

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

      // a) Busca logs diários
      let logsMapped: DayLog[] = [];
      try {
        const { data: logsData, error: logsError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', uid)
          .order('date', { ascending: false })
          .limit(7);

        if (!logsError && logsData && logsData.length > 0) {
          logsMapped = logsData.reverse().map((item: any) => ({
            id: item.id,
            day: new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
            dateStr: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            earned: Number(item.amount || 0),
            goal: Number(item.goal || dailyGoal),
            hours: Number(item.hours || 0)
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar logs:', err);
      }

      setWeeklyLogs(logsMapped);
      if (logsMapped.length > 0) {
        const todayItem = logsMapped[logsMapped.length - 1];
        setTodayEarned(todayItem.earned);
        setTodayHours(todayItem.hours);
      }

      // b) Reserva de emergência
      const { data: profileData } = await supabase
        .from('profiles')
        .select('emergency_reserve')
        .eq('id', uid)
        .maybeSingle();

      if (profileData) {
        setEmergencyReserve(Number(profileData.emergency_reserve || 0));
      }

      // c) Dívidas
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (!debtsError && debtsData) {
        const mappedDebts: DebtItem[] = debtsData.map((d: any) => {
          const total = Number(d.total_amount || 0);
          const paid = Number(d.paid_amount || 0);
          const remaining = Math.max(total - paid, 0);
          const type = (d.debt_type === 'long_term' || d.debt_type === 'longo_prazo' ? 'longo_prazo' : 'atrasado') as 'atrasado' | 'longo_prazo';

          let priority = d.priority;
          if (!priority) {
            if (type === 'atrasado') priority = 'alta';
            else if (total > 2000) priority = 'media';
            else priority = 'baixa';
          }

          return {
            id: d.id,
            title: d.title,
            totalAmount: total,
            paidAmount: paid,
            remainingAmount: remaining,
            type,
            priority,
            dueDate: d.due_date
          };
        });

        mappedDebts.sort((a, b) => {
          const pWeight = { alta: 3, media: 2, baixa: 1 };
          if (pWeight[b.priority] !== pWeight[a.priority]) {
            return pWeight[b.priority] - pWeight[a.priority];
          }
          return b.remainingAmount - a.remainingAmount;
        });

        setDebts(mappedDebts);
      }

      // d) Sonhos
      const { data: dreamsData, error: dreamsError } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (!dreamsError && dreamsData) {
        setDreams(dreamsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          targetAmount: Number(d.target_amount || 0),
          savedAmount: Number(d.current_amount || 0),
          category: 'compra'
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, dailyGoal]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // 2. AÇÕES DE CRUD E PAGAMENTO PARCIAL DE DÍVIDAS

  const handleSaveReserve = async () => {
    if (!currentUserId) return;
    const parsed = parseCurrencyToNumber(tempReserve);

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: currentUserId, emergency_reserve: parsed });

    if (!error) {
      setEmergencyReserve(parsed);
      setEditingReserve(false);
    }
  };

  const handleAddPaymentToDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment || !paymentAmount) return;

    const val = parseCurrencyToNumber(paymentAmount);
    if (isNaN(val) || val <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }

    const newPaidAmount = selectedDebtForPayment.paidAmount + val;
    if (newPaidAmount > selectedDebtForPayment.totalAmount) {
      alert('O valor pago não pode exceder o total da dívida.');
      return;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .update({ paid_amount: newPaidAmount })
        .eq('id', selectedDebtForPayment.id);

      if (error) {
        alert('Erro ao atualizar pagamento: ' + error.message);
        return;
      }

      setDebts(prev => prev.map(d => {
        if (d.id === selectedDebtForPayment.id) {
          const updatedPaid = d.paidAmount + val;
          return {
            ...d,
            paidAmount: updatedPaid,
            remainingAmount: Math.max(d.totalAmount - updatedPaid, 0)
          };
        }
        return d;
      }));

      setSelectedDebtForPayment(null);
      setPaymentAmount('');
    } catch (err) {
      console.error('Erro ao abater dívida:', err);
    }
  };

  const handleChangePriority = async (debtId: string, newPriority: 'alta' | 'media' | 'baixa') => {
    try {
      await supabase
        .from('debts')
        .update({ priority: newPriority })
        .eq('id', debtId);

      setDebts(prev => prev.map(d => d.id === debtId ? { ...d, priority: newPriority } : d));
    } catch (err) {
      console.error('Erro ao alterar prioridade:', err);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtTitle || !newDebtAmount || !currentUserId) return;

    const val = parseCurrencyToNumber(newDebtAmount);
    if (isNaN(val) || val <= 0) return;

    const dbDebtType = newDebtType === 'longo_prazo' ? 'long_term' : 'overdue';

    try {
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          user_id: currentUserId,
          title: newDebtTitle,
          total_amount: val,
          paid_amount: 0,
          debt_type: dbDebtType,
          priority: newDebtPriority
        }])
        .select()
        .single();

      if (!error && data) {
        setDebts(prev => [
          {
            id: data.id,
            title: data.title,
            totalAmount: Number(data.total_amount),
            paidAmount: 0,
            remainingAmount: Number(data.total_amount),
            type: newDebtType,
            priority: newDebtPriority
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

  const handleDeleteDebt = async (id: string) => {
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (!error) {
      setDebts(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleAddDream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDreamTitle || !newDreamTarget || !currentUserId) return;
    const val = parseCurrencyToNumber(newDreamTarget);
    const savedVal = newDreamSaved ? parseCurrencyToNumber(newDreamSaved) : 0;

    const { data, error } = await supabase
      .from('dreams')
      .insert([{
        user_id: currentUserId,
        title: newDreamTitle,
        target_amount: val,
        current_amount: savedVal
      }])
      .select()
      .single();

    if (!error && data) {
      setDreams(prev => [
        {
          id: data.id,
          title: data.title,
          targetAmount: Number(data.target_amount),
          savedAmount: Number(data.current_amount),
          category: newDreamCategory
        },
        ...prev
      ]);
      setNewDreamTitle('');
      setNewDreamTarget('');
      setNewDreamSaved('');
      setIsDreamModalOpen(false);
    }
  };

  const handleDeleteDream = async (id: string) => {
    const { error } = await supabase.from('dreams').delete().eq('id', id);
    if (!error) setDreams(prev => prev.filter(d => d.id !== id));
  };

  // CÁLCULOS
  const totalWeeklyEarned = weeklyLogs.reduce((acc, item) => acc + item.earned, 0);
  const todayProgressPercent = Math.min(Math.round((todayEarned / (dailyGoal || 1)) * 100), 100);
  const hourlyRate = todayHours > 0 ? (todayEarned / todayHours).toFixed(2) : '0.00';

  const totalDebts = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  const overdueDebts = debts.filter(d => d.type === 'atrasado').reduce((acc, d) => acc + d.remainingAmount, 0);
  const totalDreamsRemaining = dreams.reduce((acc, d) => acc + (d.targetAmount - d.savedAmount), 0);

  const workDaysForTotalDebts = Math.ceil(totalDebts / (dailyGoal || 1));
  const workDaysForOverdue = Math.ceil(overdueDebts / (dailyGoal || 1));

  const getHealthStatus = () => {
    if (overdueDebts > 0 && emergencyReserve < overdueDebts) {
      return {
        label: 'Atenção Crítica',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        desc: 'Você possui dívidas em atraso. Foque nas dívidas com Prioridade Alta.'
      };
    }
    return {
      label: 'Saúde Estável',
      color: isDark ? 'text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/30' : 'text-blue-600 bg-blue-50 border-blue-200',
      desc: 'Sua vida financeira está organizada. Mantenha o foco nas metas diárias.'
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

      {/* BLOCO 1: SAÚDE FINANCEIRA */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-gradient-to-r from-[#00D1FF]/20 to-[#3B82F6]/20 text-[#00D1FF] border-[#00D1FF]/30' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
              <HeartPulse size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-extrabold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Saúde da Vida Financeira</h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${health.color}`}>{health.label}</span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{health.desc}</p>
            </div>
          </div>
          <div className={`border px-4 py-2 rounded-2xl flex items-center gap-3 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <Calculator size={18} className="text-amber-400 shrink-0" />
            <div>
              <span className={`text-[10px] font-medium block ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Meta Diária Base</span>
              <span className={`text-xs font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {dailyGoal.toFixed(2)}/dia</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-rose-500/20' : 'bg-rose-50/50 border-rose-200'}`}>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5"><ShieldAlert size={16} /> Pendências Atrasadas</span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {overdueDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Clock size={13} className="text-amber-400 shrink-0" /> Exige <strong className="text-amber-400">{workDaysForOverdue} dias</strong>
            </p>
          </div>
          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-600'}`}><AlertCircle size={16} className="text-amber-400" /> Dívidas Totais</span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {totalDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Clock size={13} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Exige <strong className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'}>{workDaysForTotalDebts} dias</strong>
            </p>
          </div>
          <div className={`border p-4 rounded-2xl space-y-1.5 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}><Target size={16} /> Faltante p/ Sonhos</span>
            <h3 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {totalDreamsRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <Sparkles size={13} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Conquiste em foco
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 2: METAS E GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
          <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20' : 'bg-blue-50 text-blue-600 border-blue-200'}`}><Target size={22} /></div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Progresso da Meta Diária Hoje</h3>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Desempenho do seu turno atual</p>
              </div>
            </div>
            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${todayEarned >= dailyGoal ? (isDark ? 'text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/30' : 'text-emerald-600 bg-emerald-50') : 'text-amber-400 bg-amber-500/10'}`}>
              {todayEarned >= dailyGoal ? 'Meta Batida! 🎉' : 'Em Progresso'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className={isDark ? 'text-white/10' : 'text-slate-200'} strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={`transition-all duration-1000 ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} strokeDasharray={`${todayProgressPercent}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{todayProgressPercent}%</span>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Faturado Hoje</p>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {todayEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Meta</p>
                  <p className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>R$ {dailyGoal.toFixed(2)}</p>
                </div>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div className={`h-2 rounded-full ${isDark ? 'bg-[#00D1FF]' : 'bg-blue-600'}`} style={{ width: `${todayProgressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className={`backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h3 className={`text-xs font-bold uppercase ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Desempenho</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className={`p-3.5 rounded-2xl border flex justify-between items-center ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Ganho Médio / Hora</p>
                <p className={`text-lg font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>R$ {hourlyRate}/h</p>
              </div>
              <Clock size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 3: DÍVIDAS & PRIORIDADES */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <ShieldAlert size={18} className="text-rose-400" /> Dívidas & Gestão de Prioridades
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>O sistema ordena por prioridade automaticamente. Você pode alterar a qualquer momento.</p>
          </div>
          <button
            onClick={() => setIsDebtModalOpen(true)}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Plus size={16} /> Adicionar Dívida
          </button>
        </div>

        {debts.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Nenhuma dívida cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((debt) => {
              const daysToPay = Math.ceil(debt.remainingAmount / (dailyGoal || 1));
              const progress = debt.totalAmount > 0 ? Math.round((debt.paidAmount / debt.totalAmount) * 100) : 0;

              const priorityColors = {
                alta: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                media: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                baixa: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              };

              return (
                <div key={debt.id} className={`p-5 rounded-2xl border space-y-4 relative transition-all ${debt.priority === 'alta' ? 'border-rose-500/30 bg-rose-500/[0.01]' : isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${priorityColors[debt.priority]}`}>
                          Prioridade: {debt.priority.toUpperCase()}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {debt.type === 'atrasado' ? 'Atrasada' : 'Longo Prazo'}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold mt-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{debt.title}</h4>
                    </div>
                    <button onClick={() => handleDeleteDebt(debt.id)} className="text-slate-500 hover:text-rose-400 p-1" title="Excluir">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/60' : 'text-slate-500'}`}>Alterar prioridade:</span>
                    {(['alta', 'media', 'baixa'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => handleChangePriority(debt.id, p)}
                        className={`text-[9px] px-2 py-0.5 rounded-lg border font-bold transition-all ${debt.priority === p ? (isDark ? 'bg-white text-slate-950 border-white' : 'bg-slate-900 text-white border-slate-900') : (isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500')}`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className={`flex items-baseline justify-between border-t border-b py-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Saldo Devedor / Restante</span>
                      <p className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        R$ {debt.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Total Inicial</span>
                      <p className={`text-xs font-bold ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-600'}`}>
                        R$ {debt.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      <div>
                        <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Meta Exata</p>
                        <p className="text-xs font-extrabold text-amber-400">{daysToPay} dias de trabalho</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDebtForPayment(debt)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/30 hover:bg-[#00D1FF]/20' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      <ArrowUpCircle size={14} /> Abater Valor
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className={`flex justify-between text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                      <span>Progresso quitado</span>
                      <span>{progress}% pago (R$ {debt.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                    </div>
                    <div className={`rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(progress, 3)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 4: RESERVA & OBJETIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
          <div className="space-y-3">
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <PiggyBank size={20} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
                <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Reserva de Emergência</h3>
              </div>
            </div>
            <div className={`border p-4 rounded-2xl space-y-2 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Total Guardado</span>
              {editingReserve ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempReserve}
                    onChange={(e) => handleCurrencyInput(e.target.value, setTempReserve)}
                    placeholder="0,00"
                    className={`w-full border rounded-xl px-3 py-1.5 text-sm font-bold ${isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300'}`}
                  />
                  <button onClick={handleSaveReserve} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00D1FF] text-slate-950">Salvar</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h4 className={`text-2xl font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>R$ {emergencyReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                  <button onClick={() => { setTempReserve(emergencyReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })); setEditingReserve(true); }} className={`text-[10px] underline ${isDark ? 'text-[#C7B8FF]/80' : 'text-slate-500'}`}>Editar</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl space-y-5 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                <Sparkles size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Sonhos & Objetivos
              </h3>
            </div>
            <button
              onClick={() => setIsDreamModalOpen(true)}
              className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
            >
              <Plus size={16} /> Novo Objetivo
            </button>
          </div>
          {dreams.length === 0 ? (
            <p className={`text-xs text-center py-4 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Nenhum objetivo cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {dreams.map((dream) => {
                const remaining = Math.max(dream.targetAmount - dream.savedAmount, 0);
                const daysToDream = Math.ceil(remaining / (dailyGoal || 1));
                const progress = dream.targetAmount > 0 ? Math.round((dream.savedAmount / dream.targetAmount) * 100) : 0;
                return (
                  <div key={dream.id} className={`border p-4 rounded-2xl space-y-3 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{dream.title}</h4>
                      <button onClick={() => handleDeleteDream(dream.id)} className="text-slate-500 hover:text-rose-400"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>R$ {dream.savedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {dream.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className={`rounded-full h-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                          <div className={`h-2 rounded-full ${isDark ? 'bg-[#00D1FF]' : 'bg-blue-600'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-xs font-bold text-amber-400">
                        {daysToDream <= 0 ? 'Conquistado! 🎉' : `Faltam ${daysToDream} dias de trabalho`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ABATER VALOR DA DÍVIDA */}
      {selectedDebtForPayment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'}`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold">Abater Valor: {selectedDebtForPayment.title}</h3>
              <button onClick={() => setSelectedDebtForPayment(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddPaymentToDebt} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Quanto deseja pagar/abater agora? (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={paymentAmount}
                  onChange={(e) => handleCurrencyInput(e.target.value, setPaymentAmount)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setSelectedDebtForPayment(null)} className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-700">Cancelar</button>
                <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400">Confirmar Abatimento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR DÍVIDA */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'}`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold">Cadastrar Dívida</h3>
              <button onClick={() => setIsDebtModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDebt} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Título / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Cartão de Crédito"
                  value={newDebtTitle}
                  onChange={(e) => setNewDebtTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Valor Total (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={newDebtAmount}
                  onChange={(e) => handleCurrencyInput(e.target.value, setNewDebtAmount)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Tipo</label>
                  <select value={newDebtType} onChange={(e: any) => setNewDebtType(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`}>
                    <option value="atrasado">Em Atraso</option>
                    <option value="longo_prazo">Longo Prazo</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Prioridade</label>
                  <select value={newDebtPriority} onChange={(e: any) => setNewDebtPriority(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`}>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsDebtModalOpen(false)} className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 text-slate-700">Cancelar</button>
                <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-500 text-slate-950">Salvar Dívida</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR SONHO */}
      {isDreamModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-3xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'}`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold">Cadastrar Objetivo</h3>
              <button onClick={() => setIsDreamModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDream} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Título</label>
                <input type="text" placeholder="Ex: Viagem" value={newDreamTitle} onChange={(e) => setNewDreamTitle(e.target.value)} className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Valor Meta (R$)</label>
                <input type="text" placeholder="0,00" value={newDreamTarget} onChange={(e) => handleCurrencyInput(e.target.value, setNewDreamTarget)} className={`w-full border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-300'}`} required />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#00D1FF] text-slate-950">Salvar Objetivo</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}