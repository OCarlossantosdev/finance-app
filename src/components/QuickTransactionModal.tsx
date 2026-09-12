'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Target, LineChart, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
        const { data: accData } = await supabase.from('accounts').select('*');
        const { data: cardData } = await supabase.from('credit_cards').select('*');
        setAccounts(accData || []);
        setCards(cardData || []);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) return;

        setLoading(true);
        const val = parseFloat(amount.replace(',', '.'));

        const { error: txError } = await supabase.from('transactions').insert([
            {
                type: type === 'goal' || type === 'investment' ? 'expense' : type,
                category,
                amount: val,
                description: `[${type.toUpperCase()}] ${description}`.trim(),
                payment_method: paymentMethod,
                account_id: selectedAccountId || null,
                credit_card_id: type === 'expense' && paymentMethod === 'credit_card' ? selectedCardId || null : null,
                installments: type === 'expense' && paymentMethod === 'credit_card' ? installments : 1,
            },
        ]);

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

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 space-y-5 shadow-2xl transition-all animate-in slide-in-from-bottom-6 duration-300">

                    {/* Cabeçalho */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-300">Novo Lançamento</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors active:scale-90"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Abas dos 4 Pilares */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                        <button
                            type="button"
                            onClick={() => { setType('expense'); setCategory(''); }}
                            className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${type === 'expense' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <TrendingDown size={15} className="mb-0.5" />
                            Gasto
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('income'); setCategory(''); }}
                            className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <TrendingUp size={15} className="mb-0.5" />
                            Ganho
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('goal'); setCategory(''); }}
                            className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${type === 'goal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <Target size={15} className="mb-0.5" />
                            Meta
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('investment'); setCategory(''); }}
                            className={`flex flex-col items-center py-2 rounded-xl text-[11px] font-semibold transition-all active:scale-95 ${type === 'investment' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            <LineChart size={15} className="mb-0.5" />
                            Invest.
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Display de Valor */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1 shadow-inner">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Valor Total</span>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-xl font-bold text-slate-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    required
                                    autoFocus
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-transparent text-3xl font-extrabold text-white text-center w-48 focus:outline-none placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Categorias em 1 Toque com Animação */}
                        <div className="space-y-1.5">
                            <label className="block text-xs text-slate-400 font-medium">Categoria</label>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`py-2 px-2 rounded-xl text-xs font-medium border text-center truncate transition-all active:scale-95 ${category === cat
                                            ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-md scale-[1.02]'
                                            : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SELEÇÃO DE CONTA / CARTÃO DE CRÉDITO */}
                        {type === 'expense' ? (
                            <div className="space-y-3 pt-2 border-t border-slate-800">
                                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('account')}
                                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${paymentMethod === 'account' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
                                            }`}
                                    >
                                        Saldo em Conta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${paymentMethod === 'credit_card' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'
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
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map((acc) => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={handleOpenAddAccount}
                                            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
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
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500"
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
                                                className="bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                <Plus size={15} /> Cartão
                                            </button>
                                        </div>

                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                                        >
                                            <option value={1}>À vista (1x)</option>
                                            {[2, 3, 4, 5, 6, 10, 12, 18, 24].map((i) => (
                                                <option key={i} value={i}>{i}x parcelas</option>
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
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="">Conta de destino/origem...</option>
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={handleOpenAddAccount}
                                    className="bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
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
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                        />

                        {/* Botão de Salvar */}
                        <button
                            type="submit"
                            disabled={loading || !amount || !category}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 active:scale-98 hover:scale-[1.01]"
                        >
                            {loading ? 'Salvando...' : 'Salvar Lançamento'}
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