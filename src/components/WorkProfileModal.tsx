'use client';

import { X, Bike, Car, Check } from 'lucide-react';

interface WorkProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentProfile: 'motoboy' | 'driver' | null;
    onSelect: (profile: 'motoboy' | 'driver') => void;
}

export default function WorkProfileModal({
    isOpen,
    onClose,
    currentProfile,
    onSelect,
}: WorkProfileModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 space-y-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-300">

                {/* Cabeçalho */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-bold text-white">Qual é a sua rotina de trabalho?</h2>
                        <p className="text-xs text-slate-400">Isso ajuda a adaptar os atalhos e categorias para você.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors active:scale-90"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Opções de Seleção */}
                <div className="grid grid-cols-1 gap-3">

                    {/* MOTOBOY / ENTREGADOR */}
                    <button
                        type="button"
                        onClick={() => {
                            onSelect('motoboy');
                            onClose();
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 hover:scale-[1.01] ${currentProfile === 'motoboy'
                                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <Bike size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-white">Motoboy / Entregador</p>
                                <p className="text-[11px] text-slate-400">iFood, Rappi, Zé Delivery, Entregas diretas</p>
                            </div>
                        </div>
                        {currentProfile === 'motoboy' && (
                            <div className="p-1 bg-emerald-500 text-slate-950 rounded-full">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        )}
                    </button>

                    {/* MOTORISTA DE APP */}
                    <button
                        type="button"
                        onClick={() => {
                            onSelect('driver');
                            onClose();
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-98 hover:scale-[1.01] ${currentProfile === 'driver'
                                ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                <Car size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-white">Motorista de App</p>
                                <p className="text-[11px] text-slate-400">Uber, 99, InDrive, Táxi, Particular</p>
                            </div>
                        </div>
                        {currentProfile === 'driver' && (
                            <div className="p-1 bg-indigo-500 text-slate-950 rounded-full">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        )}
                    </button>

                </div>

            </div>
        </div>
    );
}