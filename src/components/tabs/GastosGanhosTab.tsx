'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Trash2,
  Receipt,
  PieChart,
  ShieldAlert,
  Lock,
  Wallet,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GastosGanhosTabProps {
  userId?: string;
  dailyGoal?: number; // Utilizado para calcular o teto de gastos seguro
}

interface TransactionItem {
  id: string;
  user_id?: string;
  title: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
}

interface FixedExpenseItem {
  id: string;
  user_id?: string;
  title: string;
  amount: number;
  due_day?: number;
}

const EXPENSE_CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'transporte', label: 'Transporte / Combustível' },
  { id: 'moradia', label: 'Moradia / Contas' },
  { id: 'lazer', label: 'Lazer & Entretenimento' },
  { id: 'saude', label: 'Saúde' },
  { id: 'outros', label: 'Outros Gastos' },
];

const INCOME_CATEGORIES = [
  { id: 'trabalho', label: 'Faturamento Principal' },
  { id: 'freela', label: 'Trabalhos Extras / Freela' },
  { id: 'outros', label: 'Outras Entradas' },
];

export default function GastosGanhosTab({ userId: propUserId, dailyGoal = 150 }: GastosGanhosTabProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sincronização dinâmica com o Tema do Fluxo Pay
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

  // Estados de Dados
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>([]);

  // Estados dos Modais de Transações do Mês
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transTitle, setTransTitle] = useState('');
  const [transType, setTransType] = useState<'expense' | 'income'>('expense');
  const [transCategory, setTransCategory] = useState('alimentacao');
  const [transAmount, setTransAmount] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);

  // Estados dos Modais de Gastos Fixos
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [fixedTitle, setFixedTitle] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedDueDay, setFixedDueDay] = useState('10');

  // Limite de alerta personalizado ou calculado (Baseado em 20 dias de faturamento meta)
  const safeSpendingLimit = dailyGoal * 20;

  // 1. CARREGAR DADOS DO SUPABASE
  const loadData = useCallback(async () => {
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

      // Buscar Transações (Ganhos e Gastos variáveis)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false });

      if (transError) throw transError;
      if (transData) {
        setTransactions(transData.map((t: any) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          category: t.category,
          amount: Number(t.amount || 0),
          date: t.date
        })));
      }

      // Buscar Gastos Fixos
      const { data: fixedData, error: fixedError } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', uid)
        .order('amount', { ascending: false });

      if (fixedError && fixedError.code !== '42P01') {
        console.error('Erro ao buscar gastos fixos:', fixedError);
      } else if (fixedData) {
        setFixedExpenses(fixedData.map((f: any) => ({
          id: f.id,
          title: f.title,
          amount: Number(f.amount || 0),
          due_day: f.due_day
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar dados de Gastos e Ganhos:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. ADICIONAR TRANSAÇÃO (GAIN / EXPENSE)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transTitle || !transAmount || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: currentUserId,
          title: transTitle,
          type: transType,
          category: transCategory,
          amount: parseFloat(transAmount),
          date: transDate
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTransactions(prev => [{
          id: data.id,
          title: data.title,
          type: data.type,
          category: data.category,
          amount: Number(data.amount),
          date: data.date
        }, ...prev]);

        // Limpar e fechar
        setTransTitle('');
        setTransAmount('');
        setIsTransModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
    }
  };

  // 3. ADICIONAR GASTO FIXO
  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedTitle || !fixedAmount || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert([{
          user_id: currentUserId,
          title: fixedTitle,
          amount: parseFloat(fixedAmount),
          due_day: parseInt(fixedDueDay) || 10
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFixedExpenses(prev => [...prev, {
          id: data.id,
          title: data.title,
          amount: Number(data.amount),
          due_day: data.due_day
        }]);

        setFixedTitle('');
        setFixedAmount('');
        setIsFixedModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao salvar gasto fixo:', err);
    }
  };

  // 4. EXCLUIR ITENS
  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteFixedExpense = async (id: string) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (!error) setFixedExpenses(prev => prev.filter(f => f.id !== id));
  };

  // CÁLCULOS E TOTAIS
  const totalIncomes = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalVariableExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalFixedExpenses = fixedExpenses.reduce((acc, f) => acc + f.amount, 0);

  const grandTotalExpenses = totalVariableExpenses + totalFixedExpenses;
  const netBalance = totalIncomes - grandTotalExpenses;

  // Verificação de Limite Crítico ultrapassado
  const isSpendingLimitExceeded = grandTotalExpenses > safeSpendingLimit;
  const spendingPercentage = Math.round((grandTotalExpenses / (safeSpendingLimit || 1)) * 100);

  // Agrupamento por Categoria de Gastos Variáveis
  const categoryExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
        <Loader2 className={`animate-spin ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} size={32} />
        <p className="text-xs font-semibold">Carregando fluxo de gastos e ganhos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* BLOCO DE ALERTA DE LIMITE */}
      {isSpendingLimitExceeded ? (
        <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-3xl flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
              ⚠️ ALERTA: Limite Financeiro Crítico Ultrapassado!
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Seus gastos totais (R$ {grandTotalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ultrapassaram o patamar de segurança recomendado de <strong>R$ {safeSpendingLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({spendingPercentage}% do limite). Isso pode comprometer severamente a sua estabilidade financeira este mês.
            </p>
          </div>
        </div>
      ) : (
        <div className={`backdrop-blur-xl border p-4 rounded-3xl flex items-center justify-between shadow-xl ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Saúde Financeira sob Controle</p>
              <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Gastos atuais em {spendingPercentage}% do limite recomendado de segurança.</p>
            </div>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full border hidden sm:inline ${
            isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            Seguro
          </span>
        </div>
      )}

      {/* BLOCO 1: CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`backdrop-blur-xl border shadow-2xl p-5 rounded-3xl space-y-2 ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Ganhos Totais</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
              <ArrowUpCircle size={18} />
            </div>
          </div>
          <h2 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
            R$ {totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className={`text-[10px] font-medium ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>Entradas do período</p>
        </div>

        <div className={`backdrop-blur-xl border shadow-2xl p-5 rounded-3xl space-y-2 ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Gastos Fixos Base</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Lock size={18} />
            </div>
          </div>
          <h2 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
            R$ {totalFixedExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[10px] text-amber-400 font-medium">Compromissos mensais fixos</p>
        </div>

        <div className={`backdrop-blur-xl border shadow-2xl p-5 rounded-3xl space-y-2 ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Gastos Variáveis</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <ArrowDownCircle size={18} />
            </div>
          </div>
          <h2 className={`text-xl font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
            R$ {totalVariableExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[10px] text-rose-400 font-medium">Consumo do dia a dia</p>
        </div>

        <div className={`backdrop-blur-xl border shadow-2xl p-5 rounded-3xl space-y-2 ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Saldo Líquido Real</span>
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              <Wallet size={18} />
            </div>
          </div>
          <h2 className={`text-xl font-black ${netBalance >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-rose-400'}`}>
            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <p className={`text-[10px] font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Ganhos menos todas as saídas</p>
        </div>
      </div>

      {/* BLOCO 2: GASTOS FIXOS (BASE PARA EVITAR DÍVIDAS) */}
      <div className={`backdrop-blur-xl border shadow-2xl rounded-3xl p-6 space-y-4 ${
        isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Lock size={20} />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Base de Gastos Fixos</h3>
              <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Contas obrigatórias mensais para prevenir dívidas</p>
            </div>
          </div>

          <button
            onClick={() => setIsFixedModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus size={15} /> Adicionar Gasto Fixo
          </button>
        </div>

        {fixedExpenses.length === 0 ? (
          <div className={`p-6 text-center rounded-2xl border ${
            isDark ? 'bg-white/[0.02] border-white/10 text-[#C7B8FF]/70' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <p className="text-xs">Nenhum gasto fixo cadastrado. Adicione aluguel, internet, contas essenciais para ter sua base.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {fixedExpenses.map((item) => (
              <div key={item.id} className={`border p-4 rounded-2xl flex items-center justify-between ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{item.title}</h4>
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Vencimento: Dia {item.due_day || 10}</p>
                  <p className="text-sm font-black text-amber-400 mt-1">
                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteFixedExpense(item.id)}
                  className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
                  title="Remover gasto fixo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BLOCO 3: GRÁFICO E DISTRIBUIÇÃO DE GASTOS POR CATEGORIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* DISTRIBUIÇÃO GRÁFICA */}
        <div className={`lg:col-span-2 backdrop-blur-xl border shadow-2xl p-6 rounded-3xl space-y-6 ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-rose-400" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Onde Você Mais Está Gastando</h3>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Variáveis por Categoria</span>
          </div>

          {totalVariableExpenses === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Nenhum gasto variável registrado para gerar o gráfico de categorias.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Barra Multicor de Proporção */}
              <div className={`w-full h-4 rounded-2xl overflow-hidden flex shadow-inner border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-slate-200 border-slate-200'
              }`}>
                {EXPENSE_CATEGORIES.map((cat, idx) => {
                  const amount = categoryExpenses[cat.id] || 0;
                  const percent = totalVariableExpenses > 0 ? (amount / totalVariableExpenses) * 100 : 0;
                  if (percent === 0) return null;

                  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-[#00D1FF]', 'bg-[#7C3AED]', 'bg-emerald-500', 'bg-[#3B82F6]'];
                  const colorClass = colors[idx % colors.length];

                  return (
                    <div
                      key={cat.id}
                      className={`${colorClass} h-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                      title={`${cat.label}: ${percent.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Detalhamento por Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const amount = categoryExpenses[cat.id] || 0;
                  const percent = totalVariableExpenses > 0 ? (amount / totalVariableExpenses) * 100 : 0;
                  if (amount === 0) return null;

                  return (
                    <div key={cat.id} className={`border p-3 rounded-2xl flex items-center justify-between ${
                      isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <p className={`text-[11px] font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{cat.label}</p>
                        <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                          R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <span className="text-xs font-black text-rose-400">{percent.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* INSIGHTS DE CONSUMO */}
        <div className={`backdrop-blur-xl border shadow-2xl p-6 rounded-3xl space-y-4 flex flex-col justify-between ${
          isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-3 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
              <Receipt size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} />
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Análise de Gastos</h3>
            </div>

            <div className="space-y-3">
              <div className={`p-3.5 border rounded-2xl space-y-1 ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[11px] font-bold text-amber-400">Peso dos Gastos Fixos</span>
                <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Seus gastos fixos consomem <strong>R$ {totalFixedExpenses.toLocaleString('pt-BR')}</strong> do seu orçamento mensal antes mesmo de você começar a trabalhar no mês.
                </p>
              </div>

              <div className={`p-3.5 border rounded-2xl space-y-1 ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[11px] font-bold ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`}>Teto de Segurança</span>
                <p className={`text-[11px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                  Definimos seu limite de alerta crítico em R$ {safeSpendingLimit.toLocaleString('pt-BR')} com base na sua produtividade diária esperada.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsTransModalOpen(true)}
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-[#00D1FF]/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            + Nova Transação
          </button>
        </div>

      </div>

      {/* BLOCO 4: HISTÓRICO DE TRANSAÇÕES */}
      <div className={`backdrop-blur-xl border shadow-2xl rounded-3xl p-6 space-y-4 ${
        isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              <Receipt size={18} className={isDark ? 'text-[#00D1FF]' : 'text-blue-600'} /> Histórico de Lançamentos
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Entradas e saídas variáveis registradas</p>
          </div>

          <button
            onClick={() => setIsTransModalOpen(true)}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 self-start sm:self-auto ${
              isDark
                ? 'bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 text-[#00D1FF] border-[#00D1FF]/30'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
            }`}
          >
            <Plus size={16} /> Lançar Movimentação
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border ${
            isDark ? 'bg-white/[0.02] border-white/10 text-[#C7B8FF]/70' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <p className="text-xs">Nenhum ganho ou gasto avulso registrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'border-white/10 text-[#C7B8FF]/70' : 'border-slate-200 text-slate-500'
                }`}>
                  <th className="py-3 px-3">Título / Descrição</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3 text-right">Valor</th>
                  <th className="py-3 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                {transactions.map((item) => (
                  <tr key={item.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                    <td className={`py-3.5 px-3 font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{item.title}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        item.type === 'income'
                          ? isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20' : 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.type === 'income' ? 'Ganho' : 'Gasto'}
                      </span>
                    </td>
                    <td className={`py-3.5 px-3 capitalize ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{item.category}</td>
                    <td className={`py-3.5 px-3 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>{item.date}</td>
                    <td className={`py-3.5 px-3 text-right font-black ${
                      item.type === 'income' ? (isDark ? 'text-[#00D1FF]' : 'text-blue-600') : 'text-rose-400'
                    }`}>
                      {item.type === 'income' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleDeleteTransaction(item.id)}
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                        title="Remover transação"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR TRANSAÇÃO */}
      {isTransModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Nova Movimentação</h3>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTransType('expense'); setTransCategory('alimentacao'); }}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    transType === 'expense'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : isDark ? 'bg-white/[0.02] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  Gasto Variável
                </button>
                <button
                  type="button"
                  onClick={() => { setTransType('income'); setTransCategory('trabalho'); }}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    transType === 'income'
                      ? isDark ? 'bg-[#00D1FF]/20 border-[#00D1FF] text-[#00D1FF]' : 'bg-blue-100 border-blue-500 text-blue-700'
                      : isDark ? 'bg-white/[0.02] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  Ganho / Entrada
                </button>
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Título / Descrição</label>
                <input
                  type="text"
                  placeholder={transType === 'expense' ? 'Ex: Supermercado, Peça moto...' : 'Ex: Corrida app, Freela extra...'}
                  value={transTitle}
                  onChange={(e) => setTransTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    isDark
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
                    value={transCategory}
                    onChange={(e) => setTransCategory(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  >
                    {transType === 'expense'
                      ? EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                      : INCOME_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)
                    }
                  </select>
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Data</label>
                <input
                  type="date"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    isDark
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isDark
                      ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-lg shadow-[#00D1FF]/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  Salvar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR GASTO FIXO */}
      {isFixedModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Adicionar Gasto Fixo Base</h3>
              <button onClick={() => setIsFixedModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddFixedExpense} className="space-y-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Nome da Conta Fixa</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel, Internet, Seguro da Moto, Financiamento..."
                  value={fixedTitle}
                  onChange={(e) => setFixedTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    isDark
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Dia de Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={fixedDueDay}
                    onChange={(e) => setFixedDueDay(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFixedModalOpen(false)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isDark
                      ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-lg shadow-[#00D1FF]/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  Salvar Gasto Fixo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}