'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck, Bike, Car, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                // Em vez do alert(), define a mensagem de sucesso na interface
                setSuccessMessage('Conta criada com sucesso! Você já pode fazer o login.');
                setIsSignUp(false);
                setPassword('');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Ocorreu um erro ao autenticar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Luz de fundo decorativa */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md space-y-6 relative z-10">

                {/* LOGO E TÍTULO */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-emerald-400">
                        <Sparkles size={14} className="animate-pulse" /> Gestão Financeira Inteligente
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                        FinanceApp <span className="text-emerald-400">.</span>
                    </h1>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Feito para motoboys e motoristas de aplicativo organizarem seus ganhos com precisão.
                    </p>
                </div>

                {/* CARD DO FORMULÁRIO */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-5">

                    {/* ABAS ENTRAR / CADASTRAR */}
                    <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-2xl border border-slate-800/80 text-xs font-bold">
                        <button
                            onClick={() => { setIsSignUp(false); setErrorMessage(''); setSuccessMessage(''); }}
                            className={`py-2.5 rounded-xl transition-all ${!isSignUp ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            Entrar
                        </button>
                        <button
                            onClick={() => { setIsSignUp(true); setErrorMessage(''); setSuccessMessage(''); }}
                            className={`py-2.5 rounded-xl transition-all ${isSignUp ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            Criar Conta
                        </button>
                    </div>

                    {/* MENSAGEM DE SUCESSO (ESTILIZADA) */}
                    {successMessage && (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                            <span className="font-semibold">{successMessage}</span>
                        </div>
                    )}

                    {/* MENSAGEM DE ERRO */}
                    {errorMessage && (
                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="shrink-0 text-rose-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seuemail@exemplo.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                'Carregando...'
                            ) : isSignUp ? (
                                <>Criar Minha Conta <ArrowRight size={16} /></>
                            ) : (
                                <>Entrar no App <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>

                    <div className="pt-2 border-t border-slate-800/80 text-center">
                        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-400" /> Seus dados estão seguros e isolados
                        </p>
                    </div>
                </div>

                {/* ÍCONES ILUSTRATIVOS */}
                <div className="flex justify-center gap-6 text-slate-600 text-xs">
                    <span className="flex items-center gap-1.5"><Bike size={14} /> Motoboys</span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5"><Car size={14} /> Motoristas de App</span>
                </div>

            </div>
        </main>
    );
}