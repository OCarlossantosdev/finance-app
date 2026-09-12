'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Landmark, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface EditableItem {
    id: string;
    type: 'account' | 'card';
    name: string;
    balance?: number;
    limit_amount?: number;
    closing_day?: number | null;
    due_day?: number | null;
}

interface ManageAccountOrCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemToEdit?: EditableItem | null;
}

export default function ManageAccountOrCardModal({
    isOpen,
    onClose,
    onSuccess,
    itemToEdit,
}: ManageAccountOrCardModalProps) {
    const [tab, setTab] = useState<'account' | 'card'>('account');
    const [name, setName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [limitAmount, setLimitAmount] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (itemToEdit) {
            setTab(itemToEdit.type);
            setName(itemToEdit.name);
            if (itemToEdit.type === 'account') {
                setInitialBalance(itemToEdit.balance?.toString() || '');
            } else {
                setLimitAmount(itemToEdit.limit_amount?.toString() || '');
                setClosingDay(itemToEdit.closing_day?.toString() || '');
                setDueDay(itemToEdit.due_day?.toString() || '');
            }
        } else {
            setTab('account');
            setName('');
            setInitialBalance('');
            setLimitAmount('');
            setClosingDay('');
            setDueDay('');
        }
    }, [itemToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);

        if (tab === 'account') {
            const val = parseFloat(initialBalance.replace(',', '.') || '0');
            if (itemToEdit) {
                const { error } = await supabase
                    .from('accounts')
                    .update({ name, balance: val })
                    .eq('id', itemToEdit.id);
                if (error) alert('Erro ao editar conta: ' + error.message);
            } else {
                const { error } = await supabase.from('accounts').insert([{ name, balance: val }]);
                if (error) alert('Erro ao cadastrar conta: ' + error.message);
            }
        } else {
            const limit = parseFloat(limitAmount.replace(',', '.') || '0');
            const payload = {
                name,
                limit_amount: limit,
                closing_day: closingDay ? parseInt(closingDay) : null,
                due_day: dueDay ? parseInt(dueDay) : null,
            };

            if (itemToEdit) {
                const { error } = await supabase
                    .from('credit_cards')
                    .update(payload)
                    .eq('id', itemToEdit.id);
                if (error) alert('Erro ao editar cartão: ' + error.message);
            } else {
                const { error } = await supabase.from('credit_cards').insert([payload]);
                if (error) alert('Erro ao cadastrar cartão: ' + error.message);
            }
        }

        setLoading(false);
        onSuccess();
        onClose();
    };

    const handleDelete = async () => {
        if (!itemToEdit) return;
        if (!confirm(`Tem certeza que deseja excluir "${itemToEdit.name}"?`)) return;

        setLoading(true);
        const table = itemToEdit.type === 'account' ? 'accounts' : 'credit_cards';
        const { error } = await supabase.from(table).delete().eq('id', itemToEdit.id);

        setLoading(false);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">
                        {itemToEdit
                            ? `Editar ${itemToEdit.type === 'account' ? 'Conta' : 'Cartão'}`
                            : 'Cadastrar Conta ou Cartão'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Abas Alternadoras (Apenas em modo de criação) */}
                {!itemToEdit && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setTab('account')}
                            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'account' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                                }`}
                        >
                            <Landmark size={16} />
                            Conta / Saldo
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('card')}
                            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                                }`}
                        >
                            <CreditCard size={16} />
                            Cartão de Crédito
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            {tab === 'account' ? 'Nome da Conta / Banco' : 'Nome do Cartão'}
                        </label>
                        <input
                            type="text"
                            placeholder={
                                tab === 'account' ? 'Ex: Nubank, Mercado Pago, Dinheiro' : 'Ex: Cartão Inter, Nubank Roxo'
                            }
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                        />
                    </div>

                    {tab === 'account' ? (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Saldo Atual (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Limite Total do Cartão (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    required
                                    value={limitAmount}
                                    onChange={(e) => setLimitAmount(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Dia Fechamento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="Ex: 5"
                                        value={closingDay}
                                        onChange={(e) => setClosingDay(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Dia Vencimento</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="Ex: 12"
                                        value={dueDay}
                                        onChange={(e) => setDueDay(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-2">
                        {itemToEdit && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${tab === 'account'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                        >
                            {loading
                                ? 'Salvando...'
                                : itemToEdit
                                    ? 'Salvar Alterações'
                                    : tab === 'account'
                                        ? 'Cadastrar Conta'
                                        : 'Cadastrar Cartão'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}