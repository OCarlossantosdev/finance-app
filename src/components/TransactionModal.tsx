'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Account {
    id: string;
    name: string;
    balance: number;
}

interface CreditCard {
    id: string;
    name: string;
}

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'income' | 'expense';
    driverType: 'motoboy' | 'driver';
    onSuccess: () => void;
}

export default function TransactionModal({
    isOpen,
    onClose,
    type,
    driverType,
    onSuccess,
}: TransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [installments, setInstallments] = useState(1);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            supabase.from('accounts').select('*').then(({ data }) => setAccounts(data || []));
            supabase.from('credit_cards').select('*').then(({ data }) => setCards(data || []));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isIncome = type === 'income';

    const categories = !isIncome
        ? ['Combustível', 'Alimentação', 'Manutenção', 'Lava-Jato', 'Equipamentos', 'Outros']
        : driverType === 'motoboy'
            ? ['Particular', '99', 'iFood', 'Keeta', 'Outros']
            : ['Uber', '99', 'Outros'];

    const numericAmount = parseFloat(amount.replace(',', '.') || '0');
    const installmentValue = numericAmount > 0 && installments > 0 ? numericAmount / installments : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) return;

        setLoading(true);

        const val = parseFloat(amount.replace(',', '.'));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return alert('Erro: Usuário não autenticado.');
        }

        const payload = {
            user_id: user.id,
            title: description?.trim() || category,
            category,
            amount: val,
            type,
            date: new Date().toISOString().split('T')[0],
        };

        const { error: txError } = await supabase.from('transactions').insert([payload]);

        if (txError) {
            setLoading(false);
            return alert('Erro ao salvar lançamento: ' + txError.message);
        }

        // Atualiza saldo da conta se debitado direto
        if (isIncome && selectedAccountId) {
            const acc = accounts.find((a) => a.id === selectedAccountId);
            if (acc) {
                await supabase.from('accounts').update({ balance: Number(acc.balance) + val }).eq('id', selectedAccountId);
            }
        } else if (!isIncome && paymentMethod === 'account' && selectedAccountId) {
            const acc = accounts.find((a) => a.id === selectedAccountId);
            if (acc) {
                await supabase.from('accounts').update({ balance: Number(acc.balance) - val }).eq('id', selectedAccountId);
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

    return (
        <div className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">
                        {isIncome ? 'Novo Ganho 💰' : 'Novo Gasto 💸'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Valor Total (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Categoria / App</label>
                        <select
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        >
                            <option value="">Selecione...</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Seleção de Forma de Pagamento */}
                    {isIncome ? (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Depositar em qual Conta?</label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                            >
                                <option value="">Sem conta específica</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('account')}
                                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${paymentMethod === 'account' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                                            }`}
                                    >
                                        Saldo / Conta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${paymentMethod === 'credit_card' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                            }`}
                                    >
                                        Cartão Crédito
                                    </button>
                                </div>
                            </div>

                            {paymentMethod === 'account' ? (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Debitar de qual Conta?</label>
                                    <select
                                        value={selectedAccountId}
                                        onChange={(e) => setSelectedAccountId(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                                    >
                                        <option value="">Sem conta específica</option>
                                        {accounts.map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} (R$ {Number(acc.balance).toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Qual Cartão de Crédito?</label>
                                        <select
                                            required
                                            value={selectedCardId}
                                            onChange={(e) => setSelectedCardId(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                                        >
                                            <option value="">Selecione o cartão...</option>
                                            {cards.map((card) => (
                                                <option key={card.id} value={card.id}>
                                                    {card.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Campo de Parcelamento */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Parcelamento</label>
                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                                        >
                                            <option value={1}>À vista (1x)</option>
                                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((i) => (
                                                <option key={i} value={i}>
                                                    {i}x parcelas
                                                </option>
                                            ))}
                                        </select>

                                        {installments > 1 && numericAmount > 0 && (
                                            <p className="text-xs text-indigo-400 font-semibold mt-1">
                                                👉 {installments}x de R$ {installmentValue.toFixed(2)} / mês
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Descrição (opcional)</label>
                        <input
                            type="text"
                            placeholder="Ex: Pneu novo, Abastecimento, Almoço"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold transition-colors ${isIncome
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                    >
                        {loading ? 'Salvando...' : 'Salvar Lançamento'}
                    </button>
                </form>
            </div>
        </div>
    );
}