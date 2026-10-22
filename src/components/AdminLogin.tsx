import React, { useState, FormEvent } from 'react';
import { authService } from '../lib/authService';
import { Lock, AlertCircle, Phone } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: (identifier: string) => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || !password) {
      setError('Please enter both phone number/email and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(cleanPhone, password);
      onSuccess(result.user.email || cleanPhone);
      setIsLoading(false);
    } catch (err: any) {
      // Offline / development credentials fallback match
      const rawEnvPhone = (import.meta.env.VITE_ADMIN_PHONE || import.meta.env.VITE_ADMIN_EMAIL || '').trim();
      const rawEnvPassword = (import.meta.env.VITE_ADMIN_PASSWORD || '').trim();
      const digitsInput = cleanPhone.replace(/\D/g, '');
      const digitsEnv = rawEnvPhone.replace(/\D/g, '');

      if (
        (cleanPhone === rawEnvPhone || (digitsInput && digitsEnv && digitsInput === digitsEnv)) &&
        password === rawEnvPassword
      ) {
        localStorage.setItem('admin_token', `BypassAdmin:${rawEnvPhone}`);
        localStorage.setItem('noor_admin_session_email', rawEnvPhone);
        onSuccess(cleanPhone);
        setIsLoading(false);
        return;
      }

      setError(err?.message || 'Invalid admin credentials. Please check your phone/email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="p-8">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-wide text-center mb-8 font-serif">
          ADMIN LOGIN
        </h1>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 mb-6 text-xs leading-relaxed text-red-600 border border-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative border-b-2 border-slate-200 focus-within:border-slate-800 transition-colors">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
              <Phone className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Admin Phone Number"
              className="block w-full border-0 bg-transparent py-3.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6 outline-none font-medium"
              autoComplete="tel"
              required
            />
          </div>

          <div className="relative border-b-2 border-slate-200 focus-within:border-slate-800 transition-colors">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="block w-full border-0 bg-transparent py-3.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6 outline-none"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-8 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                Logging in...
              </span>
            ) : (
              'Secure Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
