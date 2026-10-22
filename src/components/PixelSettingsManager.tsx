import React, { useState, useEffect } from 'react';
import { EcomSettings } from '../types';
import { dbService } from '../lib/dbService';
import { CircularProgress } from './LoadingSkeleton';
import { Check, Code, Save, Eye, ShieldCheck, RefreshCw } from 'lucide-react';

export default function PixelSettingsManager() {
  const [settings, setSettings] = useState<EcomSettings>({
    gtmId: '',
    deliveryChargeInsideDhaka: 60,
    deliveryChargeOutsideDhaka: 120,
    bkashNumber: '',
    nagadNumber: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await dbService.getEcomSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load pixel settings:', err);
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
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('There was a problem saving pixel settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <CircularProgress label="Loading GTM Settings..." size="md" />
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 font-sans max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Code className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              GTM
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Google Analytics and ad tracking configuration
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </span>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-300" />
                Saved successfully!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                heTSave all
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Google Tag Manager & Web Analytics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">GTM</h3>
              <p className="text-[11px] text-slate-500">Google Analytics 4 and GADS Tracking</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GTM Container ID
              </label>
              <input
                type="text"
                placeholder="Ex: GTM-XXXXXXX"
                value={settings.gtmId || ''}
                onChange={(e) => setSettings({ ...settings, gtmId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                your GTM All tracking tags will be automatically loaded into Headex when the container ID is set।
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-blue-900">
              <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>Automatic data layer events:</span>
              </div>
              <ul className="list-disc list-inside text-[10px] space-y-0.5 text-blue-800">
                <li><code>purchase</code> - Triggered upon order confirmation</li>
                <li><code>begin_checkout</code> - Checkout opening time</li>
                <li><code>view_item</code> - While browsing product details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Google Search Console & SEO Verification */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Google Search Console & SEO Verification</h3>
              <p className="text-[11px] text-slate-500">Google site verification tag for instant indexing & top search rankings</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Site Verification Tag / Code
              </label>
              <input
                type="text"
                placeholder='e.g. google-site-verification code or <meta name="google-site-verification" content="..." />'
                value={settings.googleSiteVerification || ''}
                onChange={(e) => setSettings({ ...settings, googleSiteVerification: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                From Google Search Console (https://search.google.com/search-console). Automatically injected into your site's &lt;head&gt; for 1-click verification.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Extra Custom SEO Keywords
              </label>
              <input
                type="text"
                placeholder="e.g. shostir bazar, স্বস্তির বাজার, ajwa dates, raw almonds, organic honey"
                value={settings.metaKeywords || ''}
                onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Comma-separated brand & product keywords to help Google understand your primary search terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
