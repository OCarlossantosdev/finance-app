'use client';

import { useState } from 'react';
import { X, Wallet, CreditCard, Plus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddAccountAndCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultMode?: 'account' | 'card';
}

export default function AddAccountAndCardModal({
    isOpen,
    onClose,
    onSuccess,
    defaultMode = 'account',
}: AddAccountAndCardModalProps) {
    const [mode, setMode] = useState<'account' | 'card'>(defaultMode);

    // Estado Conta
    const [accountName, setAccountName] = useState('');
    const [accountBalance, setAccountBalance] = useState('');

    // Estado Cartão
    const [cardName, setCardName] = useState('');
    const [cardLimit, setCardLimit] = useState('');
    const [closingDay, setClosingDay] = useState('5');
    const [dueDay, setDueDay] = useState('10');

    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountName) return;

        setLoading(true);
        const balanceNum = parseFloat(accountBalance.replace(',', '.')) || 0;

        const { error } = await supabase.from('accounts').insert([
            {
                name: accountName,
                balance: balanceNum,
            },
        ]);

        setLoading(false);

        if (error) {
            alert('Erro ao salvar conta: ' + error.message);
            return;
        }

        setAccountName('');
        setAccountBalance('');
        onSuccess();
        onClose();
    };

    const handleSaveCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cardName) return;

        setLoading(true);
        const limitNum = parseFloat(cardLimit.replace(',', '.')) || 0;

        const { error } = await supabase.from('credit_cards').insert([
            {
                name: cardName,
                limit_amount: limitNum,
                closing_day: Number(closingDay),
                due_day: Number(dueDay),
            },
        ]);

        setLoading(false);

        if (error) {
            alert('Erro ao salvar cartão: ' + error.message);
            return;
        }

        setCardName('');
        setCardLimit('');
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 space-y-5 shadow-2xl transition-all animate-in slide-in-from-bottom-6 duration-300">

                {/* Cabeçalho */}
                <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        {mode === 'account' ? <Wallet size={18} className="text-emerald-400" /> : <CreditCard size={18} className="text-indigo-400" />}
                        {mode === 'account' ? 'Nova Conta Bancária' : 'Novo Cartão de Crédito'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors active:scale-90"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Chaveador de Abas com Animação */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <button
                        type="button"
                        onClick={() => setMode('account')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'account'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Wallet size={15} /> Conta
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('card')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'card'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <CreditCard size={15} /> Cartão de Crédito
                    </button>
                </div>

                {/* FORMULÁRIO DE CONTA */}
                {mode === 'account' && (
                    <form onSubmit={handleSaveAccount} className="space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium">Nome da Conta / Banco</label>
                            <input
                                type="text"
                                placeholder="Ex: Nubank, Inter, Itaú, Carteira"
                                required
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium">Saldo Inicial (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={accountBalance}
                                onChange={(e) => setAccountBalance(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !accountName}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-900/30 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : <><Check size={16} /> Salvar Conta</>}
                        </button>
                    </form>
                )}

                {/* FORMULÁRIO DE CARTÃO DE CRÉDITO */}
                {mode === 'card' && (
                    <form onSubmit={handleSaveCard} className="space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium">Nome do Cartão</label>
                            <input
                                type="text"
                                placeholder="Ex: Nubank Roxinho, C6 Black"
                                required
                                value={cardName}
                                onChange={(e) => setCardName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium">Limite de Crédito Total (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="5000,00"
                                value={cardLimit}
                                onChange={(e) => setCardLimit(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium">Dia Fechamento</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={closingDay}
                                    onChange={(e) => setClosingDay(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors text-center"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium">Dia Vencimento</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={dueDay}
                                    onChange={(e) => setDueDay(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors text-center"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !cardName}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-900/30 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Salvando...' : <><Check size={16} /> Salvar Cartão</>}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
}