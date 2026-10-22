import React from 'react';
import { EcomSettings } from '../types';

interface Props {
  settings: EcomSettings;
  onChange: (newSettings: EcomSettings) => void;
}

export function DeliveryAdvancedSettings({ settings, onChange }: Props) {
  const handleSettingChange = (key: keyof EcomSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Delivery Charge Block */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-slate-900 mb-6">Delivery Charge</h3>
        
        <div className="space-y-4">
          {/* Inside Dhaka */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Inside Dhaka</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Regular</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeInsideDhaka || 0}
                    onChange={e => handleSettingChange('deliveryChargeInsideDhaka', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Express</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeInsideExpress || 0}
                    onChange={e => handleSettingChange('deliveryChargeInsideExpress', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outside Dhaka */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Outside Dhaka</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Regular</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeOutsideDhaka || 0}
                    onChange={e => handleSettingChange('deliveryChargeOutsideDhaka', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Express</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.deliveryChargeOutsideExpress || 0}
                    onChange={e => handleSettingChange('deliveryChargeOutsideExpress', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Free Delivery */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center mb-4">
              <h4 className="text-sm font-bold text-slate-800 mr-4">Free Delivery</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings.freeDeliveryEnabled}
                  onChange={(e) => handleSettingChange('freeDeliveryEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#52c41a]"></div>
              </label>
            </div>
            
            {settings.freeDeliveryEnabled && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Minimum Purchase Value:</label>
                <div className="flex max-w-xs">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs">Tk</span>
                  <input 
                    type="number" 
                    value={settings.freeDeliveryMinPurchase || 0}
                    onChange={e => handleSettingChange('freeDeliveryMinPurchase', Number(e.target.value))}
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
