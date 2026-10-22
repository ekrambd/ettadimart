import React from 'react';
import SimpleAuth from './SimpleAuth';
import AdminLogin from './AdminLogin';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

interface LoginPageProps {
  onLoginSuccess: (identifier: string) => void;
  onNavigateHome: () => void;
}

export default function LoginPage({ onLoginSuccess, onNavigateHome }: LoginPageProps) {
  const location = useLocation();
  const isAdminPath = location.pathname.toLowerCase().includes('/admin');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <button 
        onClick={onNavigateHome}
        className="absolute top-6 left-6 p-3 bg-white shadow-sm hover:bg-slate-50 rounded-full transition-colors text-slate-600 flex items-center gap-2"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium pr-1">Back to Store</span>
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px]"
      >
        {isAdminPath ? (
          <AdminLogin onSuccess={onLoginSuccess} />
        ) : (
          <SimpleAuth onSuccess={onLoginSuccess} />
        )}
      </motion.div>
    </div>
  );
}
