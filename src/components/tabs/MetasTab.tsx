'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, Plus, Trash2, CheckCircle2, Clock, Sparkles, X, Loader2,
  ArrowUpCircle, ArrowDownCircle, Flame, Edit3, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MetasTabProps {
  userId?: string;
  monthlySavingsBase?: number;
}

interface GoalItem {
  id: string;
  user_id?: string;
  title: string;
  target_amount: number;
  current_amount: number;
  category: 'viagem' | 'bem' | 'reserva' | 'outro';
  priority: number; // 1 = Alta, 2 = Média, 3 = Baixa
  target_date?: string;
}

interface DebtItem {
  id: string;
  title: string;
  total_amount: number;
  paid_amount: number;
  debt_type: string;
}

const GOAL_CATEGORIES = [
  { id: 'bem', label: 'Aquisição / Bem (Moto, Carro, Equipamento)' },
  { id: 'viagem', label: 'Viagem & Lazer' },
  { id: 'reserva', label: 'Reserva & Segurança' },
  { id: 'outro', label: 'Outro Sonho' },
];

const PRIORITIES = [
  { id: 1, label: 'Alta (Foco Principal)', weight: 3 },
  { id: 2, label: 'Média (Equilibrado)', weight: 2 },
  { id: 3, label: 'Baixa (Longo Prazo)', weight: 1 },
];

export default function MetasTab({ userId: propUserId, monthlySavingsBase = 1200 }: MetasTabProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(propUserId || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Estados de Dados
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);

  // Estados do Modal de Criar/Editar Meta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmountRaw, setTargetAmountRaw] = useState('');
  const [currentAmountRaw, setCurrentAmountRaw] = useState('');
  const [category, setCategory] = useState<'viagem' | 'bem' | 'reserva' | 'outro'>('bem');
  const [priority, setPriority] = useState<number>(2);

  // Estados do Modal de Transação (Aporte/Resgate)
  const [txModal, setTxModal] = useState<{ isOpen: boolean, goal: GoalItem | null, type: 'deposit' | 'withdraw' }>({
    isOpen: false, goal: null, type: 'deposit'
  });
  const [txAmountRaw, setTxAmountRaw] = useState('');

  // Função auxiliar para formatar inputs monetários automaticamente (R$)
  const handleCurrencyInput = (value: string, setter: (val: string) => void) => {
    const onlyDigits = value.replace(/\D/g, '');
    if (!onlyDigits) {
      setter('');
      return;
    }
    const numberValue = Number(onlyDigits) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setter(formatted);
  };

  const parseCurrencyToNumber = (formattedStr: string) => {
    if (!formattedStr) return 0;
    const clean = formattedStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let uid = currentUserId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { uid = user.id; setCurrentUserId(user.id); }
      }
      if (!uid) { setLoading(false); return; }

      // 1. Carregar Metas
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', uid)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (goalsError && goalsError.code !== '42P01') {
        console.error('Erro ao buscar metas:', goalsError);
      } else if (goalsData) {
        setGoals(goalsData.map((g: any) => ({
          id: g.id,
          title: g.title,
          target_amount: Number(g.target_amount || 0),
          current_amount: Number(g.current_amount || 0),
          category: g.category || 'bem',
          priority: g.priority || 2
        })));
      }

      // 2. Carregar Dívidas da tabela debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', uid);

      if (debtsError && debtsError.code !== '42P01') {
        console.error('Erro ao buscar dívidas:', debtsError);
      } else if (debtsData) {
        setDebts(debtsData.map((d: any) => ({
          id: d.id,
          title: d.title,
          total_amount: Number(d.total_amount || 0),
          paid_amount: Number(d.paid_amount || 0),
          debt_type: d.debt_type || 'long_term'
        })));
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ABRIR MODAL PARA CRIAR
  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setTitle('');
    setTargetAmountRaw('');
    setCurrentAmountRaw('');
    setCategory('bem');
    setPriority(2);
    setIsModalOpen(true);
  };

  // ABRIR MODAL PARA EDITAR
  const handleOpenEditModal = (goal: GoalItem) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setTargetAmountRaw(goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCurrentAmountRaw(goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCategory(goal.category);
    setPriority(goal.priority);
    setIsModalOpen(true);
  };

  // SALVAR OU ATUALIZAR META
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmountRaw || !currentUserId) return;

    const targetNum = parseCurrencyToNumber(targetAmountRaw);
    const currentNum = parseCurrencyToNumber(currentAmountRaw);

    try {
      if (editingGoalId) {
        const { error } = await supabase.from('goals').update({
          title,
          target_amount: targetNum,
          current_amount: currentNum,
          category,
          priority
        }).eq('id', editingGoalId);

        if (error) throw error;

        setGoals(prev => prev.map(g => g.id === editingGoalId ? {
          ...g, title, target_amount: targetNum, current_amount: currentNum, category, priority
        } : g).sort((a, b) => a.priority - b.priority));

      } else {
        const { data, error } = await supabase.from('goals').insert([{
          user_id: currentUserId,
          title,
          target_amount: targetNum,
          current_amount: currentNum,
          category,
          priority
        }]).select().single();

        if (error) throw error;
        if (data) {
          setGoals(prev => {
            const newGoals = [...prev, {
              id: data.id,
              title: data.title,
              target_amount: Number(data.target_amount),
              current_amount: Number(data.current_amount),
              category: data.category,
              priority: data.priority
            }];
            return newGoals.sort((a, b) => a.priority - b.priority);
          });
        }
      }

      setIsModalOpen(false);
      setEditingGoalId(null);
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) setGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txModal.goal || !txAmountRaw) return;

    const amountValue = parseCurrencyToNumber(txAmountRaw);
    if (isNaN(amountValue) || amountValue <= 0) return;

    const newAmount = txModal.type === 'deposit'
      ? txModal.goal.current_amount + amountValue
      : Math.max(0, txModal.goal.current_amount - amountValue);

    try {
      const { error } = await supabase.from('goals')
        .update({ current_amount: newAmount })
        .eq('id', txModal.goal.id);

      if (error) throw error;

      setGoals(prev => prev.map(g => g.id === txModal.goal!.id ? { ...g, current_amount: newAmount } : g));
      setTxModal({ isOpen: false, goal: null, type: 'deposit' });
      setTxAmountRaw('');
    } catch (err) {
      console.error('Erro ao atualizar valor:', err);
    }
  };

  // INTELIGÊNCIA FINANCEIRA UNIFICADA (Dívidas x Metas)
  // Total pendente de todas as dívidas
  const totalRemainingDebts = debts.reduce((sum, d) => sum + Math.max(0, (d.total_amount - d.paid_amount)), 0);

  // Quanto sobra de verdade após abater as dívidas do total base mensal
  // (Caso as dívidas superem o ganho, o excedente líquido para metas fica 0 por segurança)
  const netAvailableForGoals = Math.max(0, monthlySavingsBase - totalRemainingDebts);

  const activeGoals = goals.filter(g => g.current_amount < g.target_amount);
  const totalWeight = activeGoals.reduce((sum, g) => {
    const weight = PRIORITIES.find(p => p.id === g.priority)?.weight || 1;
    return sum + weight;
  }, 0);

  const getAllocatedMonthlyAmount = (goal: GoalItem) => {
    if (goal.current_amount >= goal.target_amount || totalWeight === 0 || netAvailableForGoals <= 0) return 0;
    const weight = PRIORITIES.find(p => p.id === goal.priority)?.weight || 1;
    return (netAvailableForGoals * weight) / totalWeight;
  };

  const calculateEstimatedMonths = (goal: GoalItem) => {
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return 0;
    const monthlyAllocation = getAllocatedMonthlyAmount(goal);
    if (monthlyAllocation <= 0) return 999;
    return Math.ceil(remaining / monthlyAllocation);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
        <Loader2 className={`animate-spin ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} size={32} />
        <p className="text-xs font-semibold">Sincronizando suas dívidas e metas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER DA ABA COM INTELIGÊNCIA DE DÍVIDAS */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
        }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20 shadow-lg shadow-[#00D1FF]/10' : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}>
            <Target size={24} />
          </div>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              Distribuição Inteligente de Caixa <Sparkles size={16} className="text-amber-400" />
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
              Base Total: <strong className={isDark ? 'text-white' : 'text-slate-900'}>R$ {monthlySavingsBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> |
              Comprometido com Dívidas: <strong className="text-rose-400">R$ {totalRemainingDebts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> |
              Livre para Metas: <strong className="text-emerald-400">R$ {netAvailableForGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 shrink-0 ${isDark ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-[#00D1FF]/20' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {/* AVISO CASO AS DÍVIDAS CONSUMAM TUDO */}
      {netAvailableForGoals <= 0 && totalRemainingDebts > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
          <ShieldAlert size={20} className="shrink-0" />
          <span>Atenção: Suas dívidas cadastradas atualmente consomem todo ou mais do que o seu saldo base mensal. O sistema priorizou 100% o pagamento das suas obrigações para que você não acumule juros. Assim que quitar parte das dívidas, o fluxo liberará automaticamente para suas metas!</span>
        </div>
      )}

      {/* LISTA DE METAS */}
      {goals.length === 0 ? (
        <div className={`backdrop-blur-xl border rounded-3xl p-12 text-center space-y-3 shadow-xl ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-slate-200'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${isDark ? 'bg-white/[0.04] border-white/10 text-[#C7B8FF]/70' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
            <Target size={24} />
          </div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Nenhuma meta cadastrada ainda</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Adicione uma viagem, bem ou reserva para planejar seu futuro de forma integrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.current_amount / (goal.target_amount || 1)) * 100));
            const estimatedMonths = calculateEstimatedMonths(goal);
            const allocatedAmount = getAllocatedMonthlyAmount(goal);
            const isCompleted = goal.current_amount >= goal.target_amount;

            return (
              <div key={goal.id} className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 flex flex-col justify-between relative overflow-hidden group shadow-2xl ${isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
                }`}>
                {/* Detalhe Superior */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border flex items-center gap-1 ${goal.priority === 1 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                            goal.priority === 2 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                          {goal.priority === 1 && <Flame size={10} />} Prioridade {goal.priority === 1 ? 'Alta' : goal.priority === 2 ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <h3 className={`text-sm font-bold mt-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{goal.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEditModal(goal)} className="text-slate-400 hover:text-blue-400 p-1.5 transition-colors" title="Editar meta">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors" title="Excluir meta">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className={`border p-3 rounded-2xl ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <span className={`text-[10px] block ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Guardado Atual</span>
                      <span className={`text-xs font-black ${isDark ? 'text-[#00D1FF]' : 'text-emerald-600'}`}>
                        R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`border p-3 rounded-2xl ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <span className={`text-[10px] block ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Valor do Sonho</span>
                      <span className={`text-xs font-black ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className={isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}>Progresso</span>
                    <span className={isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}>{percentage}%</span>
                  </div>
                  <div className={`w-full h-2.5 rounded-full overflow-hidden border ${isDark ? 'bg-white/10 border-white/10' : 'bg-slate-200 border-slate-200'}`}>
                    <div className={`h-full transition-all duration-500 rounded-full ${isDark ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6]' : 'bg-gradient-to-r from-blue-600 to-indigo-500'}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>

                {/* Estimativa de Tempo e Distribuição Inteligente */}
                <div className={`border p-3.5 rounded-2xl flex items-center justify-between ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'}`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                        {isCompleted ? 'Previsão' : `Alocação líq.: R$ ${allocatedAmount.toFixed(0)}/mês`}
                      </p>
                      <p className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        {isCompleted ? 'Meta Concluída! 🎉' : estimatedMonths >= 999 ? 'Aguardando folga nas dívidas' : estimatedMonths === 1 ? 'Aprox. 1 mês restante' : `Aprox. ${estimatedMonths} meses`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button onClick={() => setTxModal({ isOpen: true, goal, type: 'deposit' })} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                    <ArrowUpCircle size={14} /> Depositar
                  </button>
                  <button onClick={() => setTxModal({ isOpen: true, goal, type: 'withdraw' })} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all border ${isDark ? 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                    <ArrowDownCircle size={14} /> Resgatar
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ADICIONAR / EDITAR META */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold">{editingGoalId ? 'Editar Meta ou Sonho' : 'Adicionar Novo Sonho ou Meta'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Título da Meta</label>
                <input type="text" placeholder="Ex: Viagem para o Nordeste" value={title} onChange={(e) => setTitle(e.target.value)} required className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Categoria</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}>
                    {GOAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Prioridade (Foco)</label>
                  <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}>
                    {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Valor Total (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={targetAmountRaw}
                    onChange={(e) => handleCurrencyInput(e.target.value, setTargetAmountRaw)}
                    required
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Já tem guardado? (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={currentAmountRaw}
                    onChange={(e) => handleCurrencyInput(e.target.value, setCurrentAmountRaw)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${isDark ? 'bg-white/[0.04] text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>Cancelar</button>
                <button type="submit" className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B]' : 'bg-blue-600 text-white'}`}>Salvar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE TRANSAÇÃO (Aporte / Resgate) */}
      {txModal.isOpen && txModal.goal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-sm rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'}`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                {txModal.type === 'deposit' ? <ArrowUpCircle className="text-emerald-400" size={18} /> : <ArrowDownCircle className="text-rose-400" size={18} />}
                {txModal.type === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
              </h3>
              <button onClick={() => setTxModal({ isOpen: false, goal: null, type: 'deposit' })} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-[10px] text-slate-400 mb-1">Meta selecionada:</p>
                <p className="text-sm font-bold truncate">{txModal.goal.title}</p>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Valor (R$)</label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={txAmountRaw}
                  onChange={(e) => handleCurrencyInput(e.target.value, setTxAmountRaw)}
                  required
                  autoFocus
                  className={`w-full border rounded-xl px-3 py-3 text-sm focus:outline-none ${isDark ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${txModal.type === 'deposit'
                    ? (isDark ? 'bg-emerald-500 text-emerald-950' : 'bg-emerald-600 text-white')
                    : (isDark ? 'bg-rose-500 text-rose-950' : 'bg-rose-600 text-white')
                  }`}>
                  Confirmar {txModal.type === 'deposit' ? 'Aporte' : 'Resgate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}