import React, { useState, useEffect } from 'react';
import { EcomSettings } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { 
  Truck, Check, Save, RefreshCw, Send, AlertCircle, 
  Globe, Copy, CheckCircle2, Zap, ChevronDown
} from 'lucide-react';
import { ApiClient } from '../services/apiClient';
import { FeedbackDialog } from './ui/FeedbackDialog';

export default function CourierSettingsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    gtmId: '',
    deliveryChargeInsideDhaka: 80,
    deliveryChargeOutsideDhaka: 130,
    bkashNumber: '',
    nagadNumber: '',
    defaultCourierProvider: 'pathao'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Steadfast Test State
  const [steadfastTestStatus, setSteadfastTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [steadfastTestMessage, setSteadfastTestMessage] = useState('');

  // Pathao Test State
  const [pathaoTestStatus, setPathaoTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pathaoTestMessage, setPathaoTestMessage] = useState('');
  const [pathaoStoresCount, setPathaoStoresCount] = useState<number | null>(null);

  // Webhook copy
  const [webhookCopied, setWebhookCopied] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await dbService.getEcomSettings();
        if (data) {
          setSettings(prev => ({
            ...prev,
            ...data,
            defaultCourierProvider: data.defaultCourierProvider || 'pathao'
          }));
        }
      } catch (err) {
        console.error('Failed to load courier settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await dbService.saveEcomSettings(settings);
      setSaveSuccess(true);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Courier settings saved!',
        message: 'Default courier service updated successfully.'
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving courier settings:', err);
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'There was an error saving',
        message: 'There was a problem saving courier settings. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSteadfast = async () => {
    setSteadfastTestStatus('testing');
    setSteadfastTestMessage('');
    try {
      const result = await ApiClient.testSteadfast();
      setSteadfastTestStatus('success');
      setSteadfastTestMessage(typeof result.balance === 'number'? `Current Balance: Tk.${result.balance}` : 'Connection verified successfully!');
    } catch (error: any) {
      setSteadfastTestStatus('error');
      setSteadfastTestMessage(error?.message || 'Could not verify connection');
    }
  };

  const handleTestPathao = async () => {
    setPathaoTestStatus('testing');
    setPathaoTestMessage('');
    try {
      const result = await ApiClient.testPathao();
      setPathaoTestStatus('success');
      setPathaoTestMessage('Connection verified successfully!');
      if (typeof result.storesCount === 'number') {
        setPathaoStoresCount(result.storesCount);
      }
    } catch (error: any) {
      setPathaoTestStatus('error');
      setPathaoTestMessage(error?.message || 'Could not verify connection');
    }
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/courier/pathao/webhook` 
    : 'https://nhimport.com/api/courier/pathao/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading courier settings..." size="md" />
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 font-sans w-full pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
              <Truck className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Courier serviceTNs
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Default courier selection and connection Status verify
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4 mr-1.5 text-emerald-300" />
              has been saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              save
            </>
          )}
        </button>
      </div>

      {/* Default Courier Provider Selector (Clean Dropdown - Only Bangla) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="space-y-1 border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Select the default courier service
          </h3>
          <p className="text-xs text-slate-500">
            Which courier service should be the primary choice for orders?
          </p>
        </div>

        <div className="max-w-md pt-1">
          <div className="relative">
            <select
              value={settings.defaultCourierProvider || 'pathao'}
              onChange={(e) => setSettings({ ...settings, defaultCourierProvider: e.target.value as 'pathao' | 'steadfast' })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white appearance-none cursor-pointer pr-10"
            >
              <option value="pathao">send courier</option>
              <option value="steadfast">Steadfast Courier</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Courier Connections List */}
      <div className="space-y-4">
        <div className="px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Courier Connections
          </h3>
        </div>

        {/* 1. PATHAO COURIER ROW */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0">
                P
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">send courier</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {pathaoTestStatus === 'idle' && (
                    <span className="inline-flex items-center text-[11px] font-bold text-slate-400">
                      connection active has
                    </span>
                  )}
                  {pathaoTestStatus === 'testing' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      is being verified...
                    </span>
                  )}
                  {pathaoTestStatus === 'success' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      is connected
                    </span>
                  )}
                  {pathaoTestStatus === 'error' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      TruT
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right test action button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPathao}
                disabled={pathaoTestStatus === 'testing'}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {pathaoTestStatus === 'testing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Testing is going on...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    do the test
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Status Messages */}
          {pathaoTestStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-800 font-semibold animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{pathaoTestMessage}</span>
              </div>
              {typeof pathaoStoresCount === 'number' && (
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                  Merchant Store: {pathaoStoresCount} T
                </span>
              )}
            </div>
          )}

          {pathaoTestStatus === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-rose-800 text-xs font-semibold animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{pathaoTestMessage}</span>
            </div>
          )}

          {/* Webhook copy row */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] flex items-center gap-1 font-medium text-slate-500">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              send Status Webhook link
            </span>
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-1"
            >
              {webhookCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {webhookCopied ? 'Copied' : 'Copy the link'}
            </button>
          </div>
        </div>

        {/* 2. STEADFAST COURIER ROW */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-sm shrink-0">
                <Truck className="h-5 w-5 text-slate-950" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Steadfast Courier</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {steadfastTestStatus === 'idle' && (
                    <span className="inline-flex items-center text-[11px] font-bold text-slate-400">
                      connection active has
                    </span>
                  )}
                  {steadfastTestStatus === 'testing' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      is being verified...
                    </span>
                  )}
                  {steadfastTestStatus === 'success' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      is connected
                    </span>
                  )}
                  {steadfastTestStatus === 'error' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      TruT
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right test action button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSteadfast}
                disabled={steadfastTestStatus === 'testing'}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-extrabold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {steadfastTestStatus === 'testing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Testing is going on...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    do the test
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Status Messages */}
          {steadfastTestStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-in fade-in duration-200">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{steadfastTestMessage}</span>
            </div>
          )}

          {steadfastTestStatus === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-rose-800 text-xs font-semibold animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{steadfastTestMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Reusable Centered Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </form>
  );
}
