'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FixedExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function FixedExpenseModal({
    isOpen,
    onClose,
    onSuccess,
}: FixedExpenseModalProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        setLoading(true);

        const { error } = await supabase.from('fixed_expenses').insert([
            {
                description,
                amount: parseFloat(amount.replace(',', '.')),
                due_day: dueDay ? parseInt(dueDay) : null,
            },
        ]);

        setLoading(false);

        if (!error) {
            setDescription('');
            setAmount('');
            setDueDay('');
            onSuccess();
            onClose();
        } else {
            alert('Erro ao salvar gasto fixo: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Novo Gasto Fixo Mensal 📌</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Descrição</label>
                        <input
                            type="text"
                            placeholder="Ex: Aluguel do veículo, Seguro, MEI, Plano Celular"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Valor Mensal (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 font-bold text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Dia Vencimento (1 a 31)</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                placeholder="Ex: 10"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        {loading ? 'Salvando...' : 'Cadastrar Gasto Fixo'}
                    </button>
                </form>
            </div>
        </div>
    );
}