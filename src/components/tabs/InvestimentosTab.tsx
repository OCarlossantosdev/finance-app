'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  PieChart,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  X,
  Loader2,
  ArrowUpRight,
  Calculator,
  Building2,
  Landmark,
  LineChart,
  Briefcase,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InvestimentosTabProps {
  userId?: string;
  dailyGoal?: number; // Usado para calcular a Reserva Recomendada
}

export interface InvestmentItem {
  id: string;
  user_id?: string;
  title: string;
  category: 'cdb' | 'selic' | 'acoes' | 'fiis' | 'cripto' | 'reserva' | 'outros';
  amount: number;
  yield_rate?: string; // Ex: '100% CDI', '11% a.a.', '12% DY'
  institution?: string; // Ex: Nubank, Inter, XP
  created_at?: string;
}

const CATEGORIES_CONFIG = {
  reserva: { label: 'Reserva de Emergência', color: 'bg-emerald-500', stroke: '#10b981', icon: ShieldCheck },
  selic: { label: 'Tesouro Selic', color: 'bg-[#00D1FF]', stroke: '#00D1FF', icon: Landmark },
  cdb: { label: 'CDB / Renda Fixa', color: 'bg-[#3B82F6]', stroke: '#3B82F6', icon: Building2 },
  fiis: { label: 'Fundos Imobiliários (FIIs)', color: 'bg-[#7C3AED]', stroke: '#7C3AED', icon: Briefcase },
  acoes: { label: 'Ações (Renda Variável)', color: 'bg-violet-500', stroke: '#8b5cf6', icon: LineChart },
  cripto: { label: 'Criptomoedas', color: 'bg-amber-500', stroke: '#f59e0b', icon: Sparkles },
  outros: { label: 'Outros Investimentos', color: 'bg-slate-500', stroke: '#64748b', icon: DollarSign },
};

export default function InvestimentosTab({ userId: propUserId, dailyGoal = 150 }: InvestimentosTabProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sincronização dinâmica com o Tema do App
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

  // Meses desejados para o cálculo automático da Reserva de Emergência
  const [reserveMonths, setReserveMonths] = useState<number>(3);

  // Estados dos Modais e Formulários
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<InvestmentItem['category']>('cdb');
  const [amountRaw, setAmountRaw] = useState(''); // Valor em centavos para o input formatado
  const [yieldRate, setYieldRate] = useState('');
  const [institution, setInstitution] = useState('');

  // Estados da Calculadora de Investimentos
  const [calcInitial, setCalcInitial] = useState('1000');
  const [calcMonthly, setCalcMonthly] = useState('500');
  const [calcRate, setCalcRate] = useState('10.5'); // Ex: 10.5% a.a. (Selic média)
  const [calcYears, setCalcYears] = useState('5');

  // Função auxiliar para formatar moeda automaticamente (Input Inteligente)
  const handleCurrencyInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const value = e.target.value.replace(/\D/g, '');
    setter(value);
  };

  const formatDisplayCurrency = (rawVal: string) => {
    if (!rawVal) return '0,00';
    const number = parseInt(rawVal, 10) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getNumericValue = (rawVal: string) => {
    if (!rawVal) return 0;
    return parseInt(rawVal, 10) / 100;
  };

  // 1. CARREGAR INVESTIMENTOS DO SUPABASE
  const loadInvestments = useCallback(async () => {
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

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', uid)
        .order('amount', { ascending: false });

      if (error) throw error;

      if (data) {
        setInvestments(
          data.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category || 'cdb',
            amount: Number(item.amount || 0),
            yield_rate: item.yield_rate || '',
            institution: item.institution || ''
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao buscar investimentos no Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  // 2. SALVAR NOVO INVESTIMENTO
  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amountRaw || !currentUserId) return;

    const parsedAmount = getNumericValue(amountRaw);

    try {
      const { data, error } = await supabase
        .from('investments')
        .insert([{
          user_id: currentUserId,
          title,
          category,
          amount: parsedAmount,
          yield_rate: yieldRate,
          institution
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setInvestments(prev => [
          {
            id: data.id,
            title: data.title,
            category: data.category,
            amount: Number(data.amount),
            yield_rate: data.yield_rate,
            institution: data.institution
          },
          ...prev
        ]);

        // Resetar Formulário
        setTitle('');
        setAmountRaw('');
        setYieldRate('');
        setInstitution('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao salvar investimento:', err);
    }
  };

  // 3. EXCLUIR INVESTIMENTO
  const handleDeleteInvestment = async (id: string) => {
    try {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (!error) {
        setInvestments(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir investimento:', err);
    }
  };

  // CÁLCULOS FINANCEIROS E RESERVA RECOMENDADA
  const totalInvested = investments.reduce((acc, item) => acc + item.amount, 0);

  const estimatedMonthlyIncome = dailyGoal * 26;
  const recommendedReserve = estimatedMonthlyIncome * reserveMonths;

  const currentReserveAmount = investments
    .filter(i => i.category === 'reserva' || i.category === 'selic')
    .reduce((acc, item) => acc + item.amount, 0);

  const reserveProgressPercent = Math.min(
    Math.round((currentReserveAmount / (recommendedReserve || 1)) * 100),
    100
  );

  const categoryTotals = investments.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  // MOTOR DA CALCULADORA DE JUROS COMPOSTOS (SELIC / CDB)
  const pInit = parseFloat(calcInitial) || 0;
  const pMonth = parseFloat(calcMonthly) || 0;
  const annualRate = parseFloat(calcRate) || 0;
  const years = parseFloat(calcYears) || 1;

  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const totalMonths = Math.round(years * 12);

  let calcFutureValue = pInit;
  let calcTotalInvested = pInit;

  for (let i = 0; i < totalMonths; i++) {
    calcFutureValue = (calcFutureValue + pMonth) * (1 + monthlyRate);
    calcTotalInvested += pMonth;
  }
  const calcTotalYield = Math.max(0, calcFutureValue - calcTotalInvested);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
        <Loader2 className={`animate-spin ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} size={32} />
        <p className="text-xs font-semibold">Carregando carteira de investimentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* BLOCO 1: CABEÇALHO DA CARTEIRA & RESERVA RECOMENDADA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TOTAL PATRIMÔNIO INVESTIDO */}
        <div className={`backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-gradient-to-r from-[#00D1FF]/20 to-[#3B82F6]/20 text-[#00D1FF] border-[#00D1FF]/30 shadow-lg shadow-[#00D1FF]/10' : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                <TrendingUp size={22} />
              </div>
              <div>
                <h2 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Patrimônio Investido</h2>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Total alocado em ativos</p>
              </div>
            </div>
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${isDark ? 'text-[#00D1FF] bg-[#00D1FF]/10 border-[#00D1FF]/30' : 'text-blue-600 bg-blue-50 border-blue-200'
              }`}>
              Ativo
            </span>
          </div>

          <div>
            <span className={`text-[11px] font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Total Acumulado</span>
            <h1 className={`text-3xl font-black mt-1 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
          </div>

          <div className={`pt-2 border-t flex items-center justify-between text-xs ${isDark ? 'border-white/10 text-[#C7B8FF]/70' : 'border-slate-200 text-slate-500'
            }`}>
            <span>Ativos na Carteira: <strong className={isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}>{investments.length}</strong></span>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-1.5 font-bold transition-all hover:underline ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'
                }`}
            >
              <Plus size={15} /> Adicionar Ativo
            </button>
          </div>
        </div>

        {/* CÁLCULO DE RESERVA RECOMENDADA BASEADO NA META DIÁRIA */}
        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl flex flex-col justify-between space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Reserva de Emergência Recomendada</h3>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Calculado automaticamente com base na sua Meta Diária</p>
              </div>
            </div>

            {/* Seletor de Meses de Proteção */}
            <div className={`flex items-center gap-1.5 p-1 rounded-2xl border self-start sm:self-auto ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              {[3, 6, 12].map((months) => (
                <button
                  key={months}
                  onClick={() => setReserveMonths(months)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${reserveMonths === months
                      ? isDark
                        ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] shadow-md shadow-[#00D1FF]/20'
                        : 'bg-blue-600 text-white shadow-md'
                      : isDark
                        ? 'text-[#C7B8FF]/70 hover:text-white'
                        : 'text-slate-500 hover:text-[#0A1F5B]'
                    }`}
                >
                  {months} Meses
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className={`p-3.5 rounded-2xl border space-y-1 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <span className={`text-[10px] font-semibold flex items-center gap-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                <Calculator size={13} className="text-amber-400" /> Meta Diária Atual
              </span>
              <p className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>R$ {dailyGoal.toFixed(2)} / dia</p>
              <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                R$ {estimatedMonthlyIncome.toLocaleString('pt-BR')}/mês (26 dias)
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border space-y-1 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <span className={`text-[10px] font-semibold flex items-center gap-1 ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
                <ShieldCheck size={13} /> Meta Recomendada ({reserveMonths}M)
              </span>
              <p className={`text-lg font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
                R$ {recommendedReserve.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                Proteção para {reserveMonths} meses sem faturar
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border space-y-1 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <span className={`text-[10px] font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Guardado p/ Reserva</span>
              <p className={`text-lg font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                R$ {currentReserveAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-[10px] font-extrabold ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
                {reserveProgressPercent}% da meta ideal
              </p>
            </div>
          </div>

          {/* Barra de Progresso da Reserva */}
          <div className="space-y-1.5 pt-1">
            <div className={`flex justify-between text-[11px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              <span>Status da Cobertura de Emergência</span>
              <span>{reserveProgressPercent}% concluído</span>
            </div>
            <div className={`w-full rounded-full h-2.5 overflow-hidden border ${isDark ? 'bg-white/10 border-white/10' : 'bg-slate-200 border-slate-200'
              }`}>
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ${isDark
                    ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6]'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                  }`}
                style={{ width: `${reserveProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* BLOCO 1.5: CALCULADORA DE INVESTIMENTOS (NOVO PLANEJADOR SELIC / CDB) */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-6 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'
          }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/30' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
              <Calculator size={20} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Calculadora de Renda Fixa (Selic / CDB)</h3>
              <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Simule o crescimento dos seus aportes mensais com juros compostos</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${isDark ? 'bg-white/[0.04] border-white/10 text-[#C7B8FF]' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
            Planejamento de Longo Prazo
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Inputs da Calculadora */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Inicial Disponível (R$)</label>
              <input
                type="number"
                step="100"
                value={calcInitial}
                onChange={(e) => setCalcInitial(e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Aporte Mensal Recorrente (R$)</label>
              <input
                type="number"
                step="50"
                value={calcMonthly}
                onChange={(e) => setCalcMonthly(e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Rentabilidade Anual (% a.a.)</label>
              <input
                type="number"
                step="0.1"
                value={calcRate}
                onChange={(e) => setCalcRate(e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
              />
              <span className={`text-[10px] mt-1 block ${isDark ? 'text-[#C7B8FF]/60' : 'text-slate-400'}`}>Ex: Selic atual (~10.5% a.a.) ou CDB 110% CDI</span>
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Prazo (Anos)</label>
              <input
                type="number"
                step="1"
                value={calcYears}
                onChange={(e) => setCalcYears(e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
              />
            </div>
          </div>

          {/* Resultado da Simulação */}
          <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/10' : 'bg-blue-50/50 border-blue-100'
            }`}>
            <span className={`text-[11px] font-bold block ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>Resultado da Simulação</span>

            <div>
              <span className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Montante Final Acumulado</span>
              <p className={`text-2xl font-black mt-0.5 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                R$ {calcFutureValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className={`pt-2 border-t space-y-1.5 text-[11px] ${isDark ? 'border-white/10 text-[#C7B8FF]/70' : 'border-slate-200 text-slate-600'}`}>
              <div className="flex justify-between">
                <span>Total investido por você:</span>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>R$ {calcTotalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between">
                <span>Rendimento de Juros:</span>
                <strong className="text-emerald-400">+ R$ {calcTotalYield.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 2: DISTRIBUIÇÃO DA CARTEIRA & INSIGHTS (GRÁFICO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* DISTRIBUIÇÃO POR CATEGORIA */}
        <div className={`lg:col-span-2 backdrop-blur-xl border p-6 rounded-3xl space-y-6 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <PieChart size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Alocação por Categoria de Ativo</h3>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Onde está seu dinheiro</span>
          </div>

          {investments.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Nenhum investimento cadastrado ainda. Clique em &quot;Adicionar Ativo&quot; para iniciar sua carteira.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra de Distribuição Multicor */}
              <div className={`w-full h-4 rounded-2xl overflow-hidden flex shadow-inner border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-200 border-slate-200'
                }`}>
                {Object.entries(categoryTotals).map(([cat, amount]) => {
                  const percentage = totalInvested > 0 ? (amount / totalInvested) * 100 : 0;
                  const config = CATEGORIES_CONFIG[cat as keyof typeof CATEGORIES_CONFIG] || CATEGORIES_CONFIG.outros;
                  if (percentage === 0) return null;

                  return (
                    <div
                      key={cat}
                      className={`${config.color} h-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                      title={`${config.label}: ${percentage.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Grid de Legendas e Porcentagens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {Object.entries(CATEGORIES_CONFIG).map(([key, config]) => {
                  const categoryAmount = categoryTotals[key] || 0;
                  const percent = totalInvested > 0 ? (categoryAmount / totalInvested) * 100 : 0;
                  if (categoryAmount === 0) return null;

                  const Icon = config.icon;

                  return (
                    <div key={key} className={`border p-3 rounded-2xl flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'
                          }`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{config.label}</p>
                          <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                            R$ {categoryAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-black ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>{percent.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* INSIGHTS E RECOMENDAÇÕES */}
        <div className={`backdrop-blur-xl border p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
          }`}>
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <Sparkles size={18} className="text-amber-400" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Insights de Estratégia</h3>
            </div>

            <div className="space-y-3">
              {currentReserveAmount < recommendedReserve ? (
                <div className={`p-3.5 border rounded-2xl space-y-1 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-slate-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <AlertCircle size={15} /> Foco em Renda Fixa / Liquidez
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sua reserva de emergência ainda está abaixo da meta recomendada. Concentre os novos aportes em Tesouro Selic ou CDBs com liquidez diária.
                  </p>
                </div>
              ) : (
                <div className={`p-3.5 border rounded-2xl space-y-1 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-slate-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <ShieldCheck size={15} /> Reserva em Nível Seguro
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Excelente! Sua reserva atinge o período de proteção recomendado. Você pode explorar ativos com maior rentabilidade ou dividendos (FIIs / Ações).
                  </p>
                </div>
              )}

              <div className={`p-3.5 border rounded-2xl space-y-1 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                <span className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>
                  <ArrowUpRight size={14} /> Diversificação
                </span>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                  Evite manter 100% dos seus recursos na mesma instituição financeira. Distribua entre opções com garantia do FGC.
                </p>
              </div>
            </div>
          </div>

          <div className={`text-[10px] text-center font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
            Informações analíticas atualizadas automaticamente
          </div>
        </div>

      </div>

      {/* BLOCO 3: TABELA DE ATIVOS / DETALHAMENTO */}
      <div className={`backdrop-blur-xl border rounded-3xl p-6 space-y-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <Briefcase size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Ativos Cadastrados
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Gerencie todos os seus aportes e rendimentos</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto ${isDark
                ? 'bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 text-[#00D1FF] border-[#00D1FF]/30'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
              }`}
          >
            <Plus size={16} /> Novo Investimento
          </button>
        </div>

        {investments.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Nenhum investimento registrado nesta conta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDark ? 'border-white/10 text-[#C7B8FF]/70' : 'border-slate-200 text-slate-500'
                  }`}>
                  <th className="py-3 px-3">Ativo / Título</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Instituição</th>
                  <th className="py-3 px-3">Rentabilidade</th>
                  <th className="py-3 px-3 text-right">Valor Alocado</th>
                  <th className="py-3 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                {investments.map((item) => {
                  const config = CATEGORIES_CONFIG[item.category] || CATEGORIES_CONFIG.outros;

                  return (
                    <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                      <td className={`py-3.5 px-3 font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{item.title}</td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isDark ? 'border-white/10 bg-white/[0.03] text-[#C7B8FF]' : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}>
                          {config.label}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{item.institution || '—'}</td>
                      <td className={`py-3.5 px-3 font-semibold ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>{item.yield_rate || '—'}</td>
                      <td className={`py-3.5 px-3 text-right font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteInvestment(item.id)}
                          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                          title="Remover ativo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR INVESTIMENTO COM INPUT INTELIGENTE DE MOEDA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'
            }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Adicionar Investimento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddInvestment} className="space-y-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Nome do Título / Ativo</label>
                <input
                  type="text"
                  placeholder="Ex: CDB 110% CDI, Tesouro Selic 2029, HGLG11..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Categoria</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                  >
                    <option value="reserva">Reserva de Emergência</option>
                    <option value="selic">Tesouro Selic</option>
                    <option value="cdb">CDB / Renda Fixa</option>
                    <option value="fiis">Fundos Imobiliários (FIIs)</option>
                    <option value="acoes">Ações</option>
                    <option value="cripto">Criptomoedas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Alocado (R$)</label>
                  {/* INPUT INTELIGENTE: Digite apenas números, formata automaticamente como centavos/reais */}
                  <div className={`flex items-center border rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}>
                    <span className="text-slate-400 mr-1 font-bold">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={formatDisplayCurrency(amountRaw)}
                      onChange={(e) => handleCurrencyInput(e, setAmountRaw)}
                      className="w-full bg-transparent focus:outline-none font-bold text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Instituição / Corretora</label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank, XP, Inter"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Rentabilidade (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 100% CDI, 12% a.a."
                    value={yieldRate}
                    onChange={(e) => setYieldRate(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${isDark
                      ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-lg shadow-[#00D1FF]/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}