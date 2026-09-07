'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Target,
  LineChart,
  Wallet,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CreditCard,
  Building2,
  Bike,
  Car,
  Pencil,
  CheckCircle2,
  Trophy,
  LogOut,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import QuickTransactionModal from '@/components/QuickTransactionModal';
import AddAccountAndCardModal from '@/components/AddAccountAndCardModal';
import WorkProfileModal from '@/components/WorkProfileModal';

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  credit_card_id?: string;
  payment_method?: string;
  created_at: string;
  user_id?: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
  user_id?: string;
}

interface CreditCardItem {
  id: string;
  name: string;
  limit_amount: number;
  closing_day?: number;
  due_day?: number;
  user_id?: string;
}

export default function Dashboard() {
  const router = useRouter();

  // Estado do Usuário Autenticado
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | 'goal' | 'investment'>('expense');

  const [isAddAccountCardOpen, setIsAddAccountCardOpen] = useState(false);
  const [addMode, setAddMode] = useState<'account' | 'card'>('account');

  // Perfil e Meta
  const [workProfile, setWorkProfile] = useState<'motoboy' | 'driver' | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<number>(150);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState<string>('150');

  const [activeTab, setActiveTab] = useState<'accounts' | 'cards'>('cards');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    goals: 0,
    investments: 0,
    balance: 0
  });

  // 1. CHECA SESSÃO DE AUTENTICAÇÃO
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        loadUserSettings(session.user.id);
      }
      setAuthChecking(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        loadUserSettings(session.user.id);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Carrega Meta e Perfil isolados por Usuário
  const loadUserSettings = (userId: string) => {
    const savedProfile = localStorage.getItem(`@app:workProfile:${userId}`) as 'motoboy' | 'driver' | null;
    if (savedProfile) {
      setWorkProfile(savedProfile);
    } else {
      setIsProfileModalOpen(true);
    }

    const savedDailyGoal = localStorage.getItem(`@app:dailyGoal:${userId}`);
    if (savedDailyGoal) {
      const parsed = parseFloat(savedDailyGoal);
      if (!isNaN(parsed)) {
        setDailyGoal(parsed);
        setTempGoalInput(parsed.toString());
      }
    }
  };

  const handleSelectProfile = (profile: 'motoboy' | 'driver') => {
    setWorkProfile(profile);
    if (user) {
      localStorage.setItem(`@app:workProfile:${user.id}`, profile);
    }
  };

  const handleSaveDailyGoal = () => {
    const parsed = parseFloat(tempGoalInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && user) {
      setDailyGoal(parsed);
      localStorage.setItem(`@app:dailyGoal:${user.id}`, parsed.toString());
    }
    setIsEditingGoal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 2. BUSCA DADOS APENAS DO USUÁRIO LOGADO
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    const { data: accData } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id);

    const { data: cardData } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id);

    setAccounts(accData || []);
    setCards(cardData || []);

    if (txData) {
      setTransactions(txData);

      let inc = 0;
      let exp = 0;
      let gol = 0;
      let inv = 0;

      txData.forEach((tx) => {
        const val = Number(tx.amount) || 0;
        const desc = tx.description || '';

        if (desc.includes('[GOAL]')) {
          gol += val;
        } else if (desc.includes('[INVESTMENT]')) {
          inv += val;
        } else if (tx.type === 'income') {
          inc += val;
        } else if (tx.type === 'expense') {
          exp += val;
        }
      });

      setTotals({
        income: inc,
        expense: exp,
        goals: gol,
        investments: inv,
        balance: inc - exp - gol - inv
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Filtra ganhos do dia
  const todayIncome = transactions
    .filter((tx) => {
      if (tx.type !== 'income') return false;
      const txDate = new Date(tx.created_at);
      const today = new Date();
      return (
        txDate.getDate() === today.getDate() &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getFullYear() === today.getFullYear()
      );
    })
    .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);

  const goalPercentage = dailyGoal > 0 ? Math.min(100, Math.round((todayIncome / dailyGoal) * 100)) : 0;
  const goalRemaining = Math.max(0, dailyGoal - todayIncome);

  const openQuickModal = (type: 'expense' | 'income' | 'goal' | 'investment') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const openAddModal = (mode: 'account' | 'card') => {
    setAddMode(mode);
    setIsAddAccountCardOpen(true);
  };

  const getCardSpent = (cardId: string) => {
    return transactions
      .filter((tx) => tx.credit_card_id === cardId || (tx.payment_method === 'credit_card' && tx.credit_card_id === cardId))
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Verificando autenticação...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 w-full pb-28 md:pb-12 px-4 md:px-8 pt-6">

      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">

        {/* CABEÇALHO COM EMAIL DO USUÁRIO E BOTÃO DE SAIR */}
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Sua vida financeira</span>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all border flex items-center gap-1 active:scale-95 bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              >
                {workProfile === 'motoboy' ? (
                  <>
                    <Bike size={12} className="text-emerald-400" />
                    <span>Motoboy</span>
                  </>
                ) : workProfile === 'driver' ? (
                  <>
                    <Car size={12} className="text-indigo-400" />
                    <span>Motorista</span>
                  </>
                ) : (
                  <span>+ Perfil</span>
                )}
              </button>
            </div>

            <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 mt-0.5">
              Dashboard <Sparkles size={18} className="text-amber-400 animate-pulse" />
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* EMAIL DO USUÁRIO + BOTÃO SAIR */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs text-slate-300">
              <User size={14} className="text-emerald-400" />
              <span className="max-w-[120px] truncate">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Sair da conta"
              className="p-2.5 bg-slate-900 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 rounded-2xl border border-slate-800 transition-all active:scale-95"
            >
              <LogOut size={16} />
            </button>

            <button
              onClick={() => openQuickModal('expense')}
              className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 hover:scale-105"
            >
              <Plus size={16} strokeWidth={3} />
              Novo Lançamento
            </button>
          </div>
        </div>

        {/* WIDGET DE META DIÁRIA */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Meta Diária de Hoje</h3>
                <p className="text-[11px] text-slate-400">
                  Acompanhe seus ganhos do dia em tempo real
                </p>
              </div>
            </div>

            {isEditingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempGoalInput}
                  onChange={(e) => setTempGoalInput(e.target.value)}
                  className="w-20 bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none"
                  placeholder="Ex: 200"
                />
                <button
                  onClick={handleSaveDailyGoal}
                  className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-extrabold hover:bg-amber-400 transition-all active:scale-95"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingGoal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/60 active:scale-95"
              >
                <span>Meta: R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <Pencil size={12} className="text-amber-400" />
              </button>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-end text-xs">
              <span className="font-extrabold text-amber-400 text-sm">
                R$ {todayIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-slate-400 text-xs font-normal">ganhos hoje</span>
              </span>
              <span className="text-xs font-bold text-slate-300">
                {goalPercentage}%
              </span>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${goalPercentage >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                style={{ width: `${goalPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
              {goalPercentage >= 100 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> 🎉 Parabéns! Meta batida hoje!
                </span>
              ) : (
                <span>
                  Faltam <strong className="text-amber-400 font-bold">R$ {goalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para atingir sua meta
                </span>
              )}
              <span>Objetivo: R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL (SALDO + PILARES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl relative overflow-hidden space-y-6 transition-all hover:border-slate-700/80">
            <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Wallet size={15} className="text-emerald-400" /> Saldo Livre Atual
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => openQuickModal('income')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 p-3.5 rounded-2xl text-left transition-all group hover:scale-[1.02] active:scale-95"
              >
                <div className="flex justify-between items-center text-emerald-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ganhos</span>
                  <TrendingUp size={14} className="group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm md:text-base font-black text-emerald-400 truncate">
                  + R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </button>

              <button
                onClick={() => openQuickModal('expense')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 p-3.5 rounded-2xl text-left transition-all group hover:scale-[1.02] active:scale-95"
              >
                <div className="flex justify-between items-center text-rose-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gastos</span>
                  <TrendingDown size={14} className="group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm md:text-base font-black text-rose-400 truncate">
                  - R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </button>

              <button
                onClick={() => openQuickModal('goal')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 p-3.5 rounded-2xl text-left transition-all group hover:scale-[1.02] active:scale-95"
              >
                <div className="flex justify-between items-center text-indigo-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Metas</span>
                  <Target size={14} className="group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm md:text-base font-black text-indigo-400 truncate">
                  R$ {totals.goals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </button>

              <button
                onClick={() => openQuickModal('investment')}
                className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 p-3.5 rounded-2xl text-left transition-all group hover:scale-[1.02] active:scale-95"
              >
                <div className="flex justify-between items-center text-amber-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Investidos</span>
                  <LineChart size={14} className="group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-sm md:text-base font-black text-amber-400 truncate">
                  R$ {totals.investments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </button>
            </div>
          </div>

          {/* PAINEL DE CONTAS E CARTÕES */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setActiveTab('cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'cards'
                        ? 'bg-slate-800 text-indigo-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <CreditCard size={13} /> Cartões
                  </button>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'accounts'
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Building2 size={13} /> Bancos
                  </button>
                </div>

                <button
                  onClick={() => openAddModal(activeTab === 'cards' ? 'card' : 'account')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-1 border border-slate-700/50"
                >
                  <Plus size={14} className={activeTab === 'cards' ? 'text-indigo-400' : 'text-emerald-400'} />
                  <span className="hidden sm:inline">Novo</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                {activeTab === 'cards' && (
                  cards.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-2">
                      <CreditCard size={24} className="mx-auto text-slate-600" />
                      <p>Nenhum cartão cadastrado.</p>
                      <button
                        onClick={() => openAddModal('card')}
                        className="text-indigo-400 font-bold hover:underline"
                      >
                        + Adicionar primeiro cartão
                      </button>
                    </div>
                  ) : (
                    cards.map((card) => {
                      const spent = getCardSpent(card.id);
                      const limit = Number(card.limit_amount) || 0;
                      const available = Math.max(0, limit - spent);
                      const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                      const progressColor = percentage > 80 ? 'bg-rose-500' : percentage > 50 ? 'bg-amber-500' : 'bg-indigo-500';

                      return (
                        <div
                          key={card.id}
                          className="bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl space-y-2 hover:border-slate-700 transition-all"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-200 flex items-center gap-2">
                              <CreditCard size={14} className="text-indigo-400" />
                              {card.name}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              Fatura: <strong className="text-rose-400 font-extrabold">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full bg-slate-800/90 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                              <span>Livre: <strong className="text-emerald-400">R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                              <span>Limite: R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percentage}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {activeTab === 'accounts' && (
                  accounts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-2">
                      <Wallet size={24} className="mx-auto text-slate-600" />
                      <p>Nenhuma conta cadastrada.</p>
                      <button
                        onClick={() => openAddModal('account')}
                        className="text-emerald-400 font-bold hover:underline"
                      >
                        + Adicionar primeira conta
                      </button>
                    </div>
                  ) : (
                    accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex justify-between items-center bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 text-xs hover:border-slate-700 transition-all"
                      >
                        <span className="flex items-center gap-2 font-bold text-slate-200">
                          <Building2 size={15} className="text-emerald-400" /> {acc.name}
                        </span>
                        <span className="font-black text-emerald-400 text-sm">
                          R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400">
              💡 <strong className="text-slate-200">Dica:</strong> Toque em <strong className="text-indigo-400 font-bold">+ Novo</strong> para incluir faturas e bancos na sua visão.
            </div>
          </div>
        </div>

        {/* ÚLTIMAS TRANSAÇÕES */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-200">Últimos Lançamentos</h3>
            <span className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer flex items-center gap-0.5">
              Ver todos <ChevronRight size={14} />
            </span>
          </div>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500 animate-pulse">Carregando dados...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
              <p className="text-xs text-slate-400">Nenhum lançamento registrado ainda.</p>
              <p className="text-[11px] text-slate-500">Clique no botão (+) para fazer seu primeiro registro em segundos!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isGoal = tx.description?.includes('[GOAL]');
                const isInv = tx.description?.includes('[INVESTMENT]');

                return (
                  <div
                    key={tx.id}
                    className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 flex justify-between items-center transition-all hover:border-slate-700 hover:scale-[1.01] active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-transform hover:scale-110 ${isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isGoal
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : isInv
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                        }`}>
                        {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{tx.category}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {tx.description?.replace(/\[(GOAL|INVESTMENT)\]\s?/, '') || 'Sem descrição'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-extrabold ${isIncome ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                        {isIncome ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* BARRA FIXA MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 p-3 z-40">
        <div className="flex justify-around items-center relative max-w-md mx-auto">
          <button className="flex flex-col items-center gap-0.5 text-emerald-400 text-[10px] font-bold">
            <Wallet size={18} />
            Inicio
          </button>

          <button
            onClick={() => openQuickModal('expense')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-4 rounded-full font-bold shadow-lg shadow-emerald-500/25 transition-all -translate-y-5 border-4 border-slate-950 active:scale-95 hover:scale-110"
          >
            <Plus size={24} strokeWidth={3} />
          </button>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-rose-400 text-[10px] font-semibold"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>

      {/* MODAIS DA APLICAÇÃO */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        initialType={modalType}
      />

      <AddAccountAndCardModal
        isOpen={isAddAccountCardOpen}
        onClose={() => setIsAddAccountCardOpen(false)}
        onSuccess={fetchData}
        defaultMode={addMode}
      />

      <WorkProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={workProfile}
        onSelect={handleSelectProfile}
      />

    </main>
  );
}