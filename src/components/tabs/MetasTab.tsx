'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  X,
  Loader2,
  DollarSign,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MetasTabProps {
  userId?: string;
  monthlySavingsBase?: number; // Base mensal estimada de sobra/poupança para calcular os prazos
}

interface GoalItem {
  id: string;
  user_id?: string;
  title: string;
  target_amount: number;
  current_amount: number;
  category: 'viagem' | 'bem' | 'reserva' | 'outro';
  target_date?: string;
}

const GOAL_CATEGORIES = [
  { id: 'bem', label: 'Aquisição / Bem (Moto, Carro, Equipamento)' },
  { id: 'viagem', label: 'Viagem & Lazer' },
  { id: 'reserva', label: 'Reserva & Segurança' },
  { id: 'outro', label: 'Outro Sonho' },
];

export default function MetasTab({ userId: propUserId, monthlySavingsBase = 1200 }: MetasTabProps) {
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
  const [goals, setGoals] = useState<GoalItem[]>([]);

  // Estados do Modal de Nova Meta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState<'viagem' | 'bem' | 'reserva' | 'outro'>('bem');

  // 1. CARREGAR METAS DO SUPABASE
  const loadGoals = useCallback(async () => {
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
        .from('goals')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.error('Erro ao buscar metas:', error);
      } else if (data) {
        setGoals(data.map((g: any) => ({
          id: g.id,
          title: g.title,
          target_amount: Number(g.target_amount || 0),
          current_amount: Number(g.current_amount || 0),
          category: g.category || 'bem'
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // 2. ADICIONAR NOVA META
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{
          user_id: currentUserId,
          title,
          target_amount: parseFloat(targetAmount),
          current_amount: currentAmount ? parseFloat(currentAmount) : 0,
          category
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setGoals(prev => [{
          id: data.id,
          title: data.title,
          target_amount: Number(data.target_amount),
          current_amount: Number(data.current_amount),
          category: data.category
        }, ...prev]);

        // Limpar e fechar
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
    }
  };

  // 3. EXCLUIR META
  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  // CÁLCULO DE TEMPO ESTIMADO (Baseado na sobra mensal estimada)
  const calculateEstimatedMonths = (target: number, current: number) => {
    const remaining = target - current;
    if (remaining <= 0) return 0;
    const savings = monthlySavingsBase > 0 ? monthlySavingsBase : 500;
    const months = Math.ceil(remaining / savings);
    return months;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
        <Loader2 className={`animate-spin ${isDark ? 'text-[#00D1FF]' : 'text-blue-600'}`} size={32} />
        <p className="text-xs font-semibold">Carregando seus sonhos e metas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* HEADER DA ABA */}
      <div className={`backdrop-blur-xl border p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl ${
        isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl border ${
            isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20 shadow-lg shadow-[#00D1FF]/10' : 'bg-blue-50 text-blue-600 border-blue-200'
          }`}>
            <Target size={24} />
          </div>
          <div>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
              Planejador de Metas & Sonhos <Sparkles size={16} className="text-amber-400" />
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Defina o que deseja conquistar e descubra em quanto tempo poderá realizá-lo.</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 shrink-0 ${
            isDark
              ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] hover:opacity-90 shadow-[#00D1FF]/20'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <Plus size={16} /> Nova Meta ou Sonho
        </button>
      </div>

      {/* LISTA DE METAS */}
      {goals.length === 0 ? (
        <div className={`backdrop-blur-xl border rounded-3xl p-12 text-center space-y-3 shadow-xl ${
          isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/70 border-slate-200'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
            isDark ? 'bg-white/[0.04] border-white/10 text-[#C7B8FF]/70' : 'bg-slate-100 border-slate-200 text-slate-400'
          }`}>
            <Target size={24} />
          </div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Nenhuma meta cadastrada ainda</h3>
          <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
            Adicione uma viagem dos sonhos, a compra de um bem ou uma reserva financeira para planejar seu futuro.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`mt-2 inline-flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isDark
                ? 'bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 text-[#00D1FF] border-[#00D1FF]/30'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
            }`}
          >
            <Plus size={15} /> Criar minha primeira meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const remaining = Math.max(0, goal.target_amount - goal.current_amount);
            const percentage = Math.min(100, Math.round((goal.current_amount / (goal.target_amount || 1)) * 100));
            const estimatedMonths = calculateEstimatedMonths(goal.target_amount, goal.current_amount);
            const isCompleted = goal.current_amount >= goal.target_amount;

            return (
              <div
                key={goal.id}
                className={`backdrop-blur-xl border p-6 rounded-3xl space-y-5 flex flex-col justify-between relative overflow-hidden group shadow-2xl ${
                  isDark ? 'bg-white/[0.03] border-white/10 text-[#F8FAFF]' : 'bg-white/70 border-slate-200 text-[#0A1F5B]'
                }`}
              >
                {/* Detalhe Superior */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                        goal.category === 'viagem' ? (isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF] border-[#00D1FF]/20' : 'bg-cyan-50 text-cyan-600 border-cyan-200') :
                        goal.category === 'bem' ? (isDark ? 'bg-[#7C3AED]/10 text-[#C7B8FF] border-[#7C3AED]/20' : 'bg-purple-50 text-purple-600 border-purple-200') :
                        goal.category === 'reserva' ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200') :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {goal.category}
                      </span>
                      <h3 className={`text-sm font-bold mt-2 ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>{goal.title}</h3>
                    </div>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
                      title="Excluir meta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className={`border p-3 rounded-2xl ${
                      isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-[10px] block ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Guardado Atual</span>
                      <span className={`text-xs font-black ${isDark ? 'text-[#00D1FF]' : 'text-emerald-600'}`}>
                        R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`border p-3 rounded-2xl ${
                      isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
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
                  <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                    isDark ? 'bg-white/10 border-white/10' : 'bg-slate-200 border-slate-200'
                  }`}>
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isDark
                          ? 'bg-gradient-to-r from-[#00D1FF] to-[#3B82F6]'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Estimativa de Tempo */}
                <div className={`border p-3.5 rounded-2xl flex items-center justify-between ${
                  isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${
                      isDark ? 'bg-[#00D1FF]/10 text-[#00D1FF]' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <p className={`text-[10px] ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>Previsão estimada</p>
                      <p className={`text-xs font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>
                        {isCompleted
                          ? 'Meta Concluída! 🎉'
                          : estimatedMonths === 1
                            ? 'Aprox. 1 mês guardando'
                            : `Aprox. ${estimatedMonths} meses`}
                      </p>
                    </div>
                  </div>

                  {!isCompleted && (
                    <span className={`text-[10px] text-right font-medium ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-500'}`}>
                      Faltam R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ADICIONAR META */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border shadow-2xl w-full max-w-md rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200 ${
            isDark ? 'bg-[#0A1F5B] border-white/10 text-[#F8FAFF]' : 'bg-white border-slate-200 text-[#0A1F5B]'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-[#F8FAFF]' : 'text-[#0A1F5B]'}`}>Adicionar Novo Sonho ou Meta</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-3">
              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>O que você quer conquistar?</label>
                <input
                  type="text"
                  placeholder="Ex: Comprar uma moto nova, Viagem para o Nordeste..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    isDark
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                    isDark
                      ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                >
                  {GOAL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 15000.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-slate-950/60 border-white/10 text-white focus:border-[#00D1FF]'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-[#C7B8FF]/70' : 'text-slate-600'}`}>Já tem guardado? (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
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
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}