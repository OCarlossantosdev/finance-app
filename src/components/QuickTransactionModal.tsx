'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Target, LineChart, Plus, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import AddAccountAndCardModal from './AddAccountAndCardModal';

interface Account {
    id: string;
    name: string;
    balance: number;
}

interface CreditCardItem {
    id: string;
    name: string;
}

interface QuickTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'expense' | 'income' | 'goal' | 'investment';
}

// Mapeamento de cores do pilar ativo para a paleta Fluxo Pay
const PILLAR_COLORS = {
    expense: {
        gradient: 'from-rose-500 to-rose-600',
        bg: 'bg-rose-500',
        bgSubtle: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        shadow: 'shadow-rose-500/20',
        focusBorder: 'focus:border-rose-400',
        ring: 'ring-rose-500/30',
    },
    income: {
        gradient: 'from-[#00D1FF] to-[#3B82F6]',
        bg: 'bg-[#00D1FF]',
        bgSubtle: 'bg-[#00D1FF]/10',
        border: 'border-[#00D1FF]/30',
        text: 'text-[#00D1FF]',
        shadow: 'shadow-[#00D1FF]/20',
        focusBorder: 'focus:border-[#00D1FF]',
        ring: 'ring-[#00D1FF]/30',
    },
    goal: {
        gradient: 'from-[#7C3AED] to-[#a855f7]',
        bg: 'bg-[#7C3AED]',
        bgSubtle: 'bg-[#7C3AED]/10',
        border: 'border-[#7C3AED]/30',
        text: 'text-[#7C3AED]',
        shadow: 'shadow-[#7C3AED]/20',
        focusBorder: 'focus:border-[#7C3AED]',
        ring: 'ring-[#7C3AED]/30',
    },
    investment: {
        gradient: 'from-[#3B82F6] to-[#00D1FF]',
        bg: 'bg-[#3B82F6]',
        bgSubtle: 'bg-[#3B82F6]/10',
        border: 'border-[#3B82F6]/30',
        text: 'text-[#3B82F6]',
        shadow: 'shadow-[#3B82F6]/20',
        focusBorder: 'focus:border-[#3B82F6]',
        ring: 'ring-[#3B82F6]/30',
    },
} as const;

export default function QuickTransactionModal({
    isOpen,
    onClose,
    onSuccess,
    initialType = 'expense',
}: QuickTransactionModalProps) {
    const [type, setType] = useState<'expense' | 'income' | 'goal' | 'investment'>(initialType);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [installments, setInstallments] = useState(1);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [cards, setCards] = useState<CreditCardItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Controle de modal filho (Add Conta/Cartão)
    const [isAddAccountCardOpen, setIsAddAccountCardOpen] = useState(false);
    const [addMode, setAddMode] = useState<'account' | 'card'>('account');

    const loadAccountsAndCards = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: accData } = await supabase.from('accounts').select('*').eq('user_id', user.id);
            const { data: cardData } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
            setAccounts(accData || []);
            setCards(cardData || []);
        } else {
            const { data: accData } = await supabase.from('accounts').select('*');
            const { data: cardData } = await supabase.from('credit_cards').select('*');
            setAccounts(accData || []);
            setCards(cardData || []);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setType(initialType);
            loadAccountsAndCards();
        }
    }, [isOpen, initialType]);

    if (!isOpen) return null;

    const categoriesMap = {
        expense: ['Alimentação', 'Combustível', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Outros'],
        income: ['Salário', 'Freelance / Apps', 'Vendas', 'Rendimento', 'Outros'],
        goal: ['Reserva de Emergência', 'Viagem', 'Carro Novo', 'Casa Própria', 'Outros'],
        investment: ['Ações / FIIs', 'Renda Fixa', 'Cripto', 'Tesouro Direto', 'Outros'],
    };

    const categories = categoriesMap[type] || [];
    const colors = PILLAR_COLORS[type];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) return;

        setLoading(true);
        const val = parseFloat(amount.replace(',', '.'));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            alert('Erro: Usuário não autenticado.');
            return;
        }

        const formattedTitle = description
            ? (type === 'goal' || type === 'investment' ? `[${type.toUpperCase()}] ${description}`.trim() : description.trim())
            : category;

        const payload = {
            user_id: user.id,
            title: formattedTitle,
            category,
            amount: val,
            type: type === 'goal' || type === 'investment' ? 'expense' : type,
            date: new Date().toISOString().split('T')[0],
        };

        const { error: txError } = await supabase.from('transactions').insert([payload]);

        if (txError) {
            setLoading(false);
            alert('Erro ao salvar: ' + txError.message);
            return;
        }

        if (selectedAccountId) {
            const acc = accounts.find((a) => a.id === selectedAccountId);
            if (acc) {
                const balanceChange = type === 'income' ? val : -val;
                await supabase
                    .from('accounts')
                    .update({ balance: Number(acc.balance) + balanceChange })
                    .eq('id', selectedAccountId);
            }
        }

        setLoading(false);
        setAmount('');
        setCategory('');
        setDescription('');
        setSelectedAccountId('');
        setSelectedCardId('');
        setInstallments(1);
        onSuccess();
        onClose();
    };

    const handleOpenAddAccount = () => {
        setAddMode('account');
        setIsAddAccountCardOpen(true);
    };

    const handleOpenAddCard = () => {
        setAddMode('card');
        setIsAddAccountCardOpen(true);
    };

    // Valor formatado exibido em tempo real como preview
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    const displayAmount = !isNaN(parsedAmount) && parsedAmount > 0
        ? formatCurrency(parsedAmount)
        : null;

    return (
        <>
            <div className="fixed inset-0 bg-[#0A1F5B]/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-[#0A1F5B] border border-white/10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 text-[#F8FAFF] space-y-5 shadow-2xl transition-all animate-in slide-in-from-bottom-6 duration-300 relative overflow-hidden">

                    {/* Background Glow — pillar-colored */}
                    <div className={`absolute top-[-30%] right-[-20%] w-[50%] h-[50%] rounded-full blur-[80px] pointer-events-none opacity-20 ${colors.bg}`} />
                    <div className="absolute bottom-[-20%] left-[-15%] w-[40%] h-[40%] rounded-full blur-[80px] pointer-events-none bg-[#7C3AED]/10" />

                    {/* Cabeçalho */}
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-xl ${colors.bgSubtle} ${colors.border} border`}>
                                <Sparkles size={14} className={colors.text} />
                            </div>
                            <h2 className="text-sm font-black text-[#F8FAFF]">Novo Lançamento</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-white/[0.05] hover:bg-white/[0.12] text-[#C7B8FF] hover:text-[#F8FAFF] rounded-xl border border-white/10 transition-all active:scale-90"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Abas dos 4 Pilares — Fluxo Pay Style */}
                    <div className="grid grid-cols-4 gap-1.5 bg-[#0A1F5B]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 relative z-10">
                        <button
                            type="button"
                            onClick={() => { setType('expense'); setCategory(''); }}
                            className={`flex flex-col items-center py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${type === 'expense'
                                ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 border border-rose-400/30'
                                : 'text-[#C7B8FF]/70 hover:text-[#F8FAFF] hover:bg-white/[0.05]'
                                }`}
                        >
                            <TrendingDown size={15} className="mb-0.5" />
                            Gasto
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('income'); setCategory(''); }}
                            className={`flex flex-col items-center py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${type === 'income'
                                ? 'bg-gradient-to-b from-[#00D1FF] to-[#3B82F6] text-[#0A1F5B] shadow-lg shadow-[#00D1FF]/30 border border-[#00D1FF]/30'
                                : 'text-[#C7B8FF]/70 hover:text-[#F8FAFF] hover:bg-white/[0.05]'
                                }`}
                        >
                            <TrendingUp size={15} className="mb-0.5" />
                            Ganho
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('goal'); setCategory(''); }}
                            className={`flex flex-col items-center py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${type === 'goal'
                                ? 'bg-gradient-to-b from-[#7C3AED] to-[#a855f7] text-white shadow-lg shadow-[#7C3AED]/30 border border-[#7C3AED]/30'
                                : 'text-[#C7B8FF]/70 hover:text-[#F8FAFF] hover:bg-white/[0.05]'
                                }`}
                        >
                            <Target size={15} className="mb-0.5" />
                            Meta
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('investment'); setCategory(''); }}
                            className={`flex flex-col items-center py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${type === 'investment'
                                ? 'bg-gradient-to-b from-[#3B82F6] to-[#00D1FF] text-[#0A1F5B] shadow-lg shadow-[#3B82F6]/30 border border-[#3B82F6]/30'
                                : 'text-[#C7B8FF]/70 hover:text-[#F8FAFF] hover:bg-white/[0.05]'
                                }`}
                        >
                            <LineChart size={15} className="mb-0.5" />
                            Invest.
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">

                        {/* Display de Valor — Glassmorphism */}
                        <div className={`bg-white/[0.03] backdrop-blur-md border rounded-2xl p-5 text-center space-y-1.5 shadow-inner ${colors.border}`}>
                            <span className="text-[10px] text-[#C7B8FF]/70 uppercase tracking-wider font-bold">Valor Total</span>
                            <div className="flex items-center justify-center gap-1">
                                <span className={`text-xl font-bold ${colors.text}`}>R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    required
                                    autoFocus
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-transparent text-3xl font-extrabold text-[#F8FAFF] text-center w-48 focus:outline-none placeholder:text-[#C7B8FF]/20"
                                />
                            </div>
                            {displayAmount && (
                                <p className={`text-[11px] font-medium ${colors.text} animate-in fade-in duration-200`}>
                                    {displayAmount}
                                </p>
                            )}
                        </div>

                        {/* Categorias em 1 Toque */}
                        <div className="space-y-2">
                            <label className="block text-xs text-[#C7B8FF]/80 font-semibold">Categoria</label>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center truncate transition-all active:scale-95 ${category === cat
                                            ? `bg-white/[0.08] ${colors.border} ${colors.text} shadow-md scale-[1.02]`
                                            : 'bg-white/[0.02] border-white/10 text-[#C7B8FF]/70 hover:border-white/20 hover:text-[#F8FAFF]'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SELEÇÃO DE CONTA / CARTÃO DE CRÉDITO */}
                        {type === 'expense' ? (
                            <div className="space-y-3 pt-3 border-t border-white/10">
                                <div className="grid grid-cols-2 gap-2 bg-white/[0.03] backdrop-blur-md p-1 rounded-xl border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('account')}
                                        className={`py-2 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'account'
                                            ? `bg-white/[0.08] ${colors.text} border ${colors.border}`
                                            : 'text-[#C7B8FF]/60 hover:text-[#C7B8FF]'
                                            }`}
                                    >
                                        Saldo em Conta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`py-2 text-xs font-bold rounded-lg transition-all ${paymentMethod === 'credit_card'
                                            ? 'bg-white/[0.08] text-[#7C3AED] border border-[#7C3AED]/30'
                                            : 'text-[#C7B8FF]/60 hover:text-[#C7B8FF]'
                                            }`}
                                    >
                                        Cartão de Crédito
                                    </button>
                                </div>

                                {paymentMethod === 'account' ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => setSelectedAccountId(e.target.value)}
                                            className={`flex-1 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3 text-[#F8FAFF] text-xs focus:outline-none ${colors.focusBorder} transition-colors`}
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} ({formatCurrency(Number(acc.balance))})
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleOpenAddAccount}
                                            className={`${colors.bgSubtle} hover:bg-white/[0.08] ${colors.text} px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border ${colors.border}`}
                                        >
                                            <Plus size={15} /> Conta
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <select
                                                required
                                                value={selectedCardId}
                                                onChange={(e) => setSelectedCardId(e.target.value)}
                                                className="flex-1 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3 text-[#F8FAFF] text-xs focus:outline-none focus:border-[#7C3AED] transition-colors"
                                            >
                                                <option value="">Selecione o cartão...</option>
                                                {cards.map((card) => (
                                                    <option key={card.id} value={card.id}>
                                                        {card.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                onClick={handleOpenAddCard}
                                                className="bg-[#7C3AED]/10 hover:bg-white/[0.08] text-[#7C3AED] px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border border-[#7C3AED]/30"
                                            >
                                                <Plus size={15} /> Cartão
                                            </button>
                                        </div>

                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-2.5 text-[#F8FAFF] text-xs focus:outline-none focus:border-[#7C3AED] transition-colors"
                                        >
                                            <option value={1}>À vista (1x)</option>
                                            {[2, 3, 4, 5, 6, 10, 12, 18, 24].map((i) => (
                                                <option key={i} value={i}>
                                                    {i}x parcelas
                                                    {!isNaN(parsedAmount) && parsedAmount > 0
                                                        ? ` — ${formatCurrency(parsedAmount / i)}/mês`
                                                        : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className={`flex-1 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3 text-[#F8FAFF] text-xs focus:outline-none ${colors.focusBorder} transition-colors`}
                                >
                                    <option value="">Conta de destino/origem...</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({formatCurrency(Number(acc.balance))})
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={handleOpenAddAccount}
                                    className={`${colors.bgSubtle} hover:bg-white/[0.08] ${colors.text} px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border ${colors.border}`}
                                >
                                    <Plus size={15} /> Conta
                                </button>
                            </div>
                        )}

                        {/* Descrição Opcional */}
                        <input
                            type="text"
                            placeholder="Descrição ou observação (opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3 text-[#F8FAFF] text-xs placeholder:text-[#C7B8FF]/30 focus:outline-none ${colors.focusBorder} transition-all`}
                        />

                        {/* Botão de Salvar — Gradiente Fluxo Pay */}
                        <button
                            type="submit"
                            disabled={loading || !amount || !category}
                            className={`w-full py-3.5 bg-gradient-to-r ${colors.gradient} disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all shadow-lg ${colors.shadow} active:scale-[0.98] hover:scale-[1.01] hover:opacity-95 border border-white/20 flex items-center justify-center gap-2`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Lançamento'
                            )}
                        </button>

                    </form>
                </div>
            </div>

            {/* MODAL DE ADICIONAR CONTA / CARTÃO */}
            <AddAccountAndCardModal
                isOpen={isAddAccountCardOpen}
                onClose={() => setIsAddAccountCardOpen(false)}
                onSuccess={loadAccountsAndCards}
                defaultMode={addMode}
            />
        </>
    );
}