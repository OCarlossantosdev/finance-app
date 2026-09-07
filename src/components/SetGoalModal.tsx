'use client';

import { useState } from 'react';
import { X, Target } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SetGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTarget: number;
    onSuccess: () => void;
}

export default function SetGoalModal({
    isOpen,
    onClose,
    currentTarget,
    onSuccess,
}: SetGoalModalProps) {
    const [target, setTarget] = useState(currentTarget.toString());
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!target) return;

        setLoading(true);

        const { error } = await supabase.from('daily_goals').insert([
            { target_amount: parseFloat(target.replace(',', '.')) },
        ]);

        setLoading(false);

        if (!error) {
            onSuccess();
            onClose();
        } else {
            alert('Erro ao atualizar meta: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Target size={20} className="text-emerald-400" />
                        Ajustar Meta Diária
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">
                            Nova Meta para Hoje (R$)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        {loading ? 'Salvando...' : 'Atualizar Meta'}
                    </button>
                </form>
            </div>
        </div>
    );
}