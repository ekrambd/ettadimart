import React from 'react';
import { ArrowUp, Phone, Mail, Headphones, ShieldCheck } from 'lucide-react';

interface FantineFooterProps {
  displayStoreLogo: string;
  displayStoreName: string;
  displayTagline: string;
  displayEmail: string;
  displayPhone: string;
  hotlinePhone?: string;
  whatsappNumber?: string;
  shopCategories: string[];
  socialLinks: Record<string, string> | undefined;
  setActiveNav: (nav: 'home' | 'shop' | 'about' | 'contact' | 'product_detail' | 'checkout' | 'quiz') => void;
  setSelectedCategoryCheckbox: (cat: string) => void;
  scrollToTop: () => void;
}

export default function FantineFooter({
  displayStoreLogo,
  displayStoreName,
  displayTagline,
  displayEmail,
  displayPhone,
  hotlinePhone,
  whatsappNumber,
  shopCategories,
  socialLinks,
  setActiveNav,
  setSelectedCategoryCheckbox,
  scrollToTop
}: FantineFooterProps) {
  const activeHotline = (hotlinePhone && hotlinePhone !== '09678812525') ? hotlinePhone : null;
  const activeWhatsApp = (whatsappNumber && whatsappNumber !== '01700000000' && whatsappNumber !== '09678812525') 
    ? whatsappNumber 
    : (socialLinks?.whatsapp && socialLinks.whatsapp !== '01700000000' && socialLinks.whatsapp !== '09678812525' ? socialLinks.whatsapp : null);
  const activePhone = (displayPhone && displayPhone !== '09678812525') ? displayPhone : null;

  const validCategories = (shopCategories || []).filter(c => c && c.toLowerCase() !== 'all').slice(0, 5);

  const hasSocials = Boolean(
    socialLinks?.facebook || 
    socialLinks?.instagram || 
    socialLinks?.youtube
  );

  return (
    <>
      <footer className="bg-[#FDD305] text-slate-900 pt-12 pb-10 border-t border-amber-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Column 1: Brand & Contact Info */}
          <div className="space-y-4">
            <div className="mb-3">
              <div className="bg-white rounded-lg px-2.5 py-1.5 shadow-xs inline-flex items-center justify-center border border-amber-300/50">
                <img 
                  src={displayStoreLogo} 
                  alt={displayStoreName} 
                  className="h-9 sm:h-11 max-h-11 max-w-[220px] sm:max-w-[260px] object-contain" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/placeholder-logo.svg';
                  }}
                />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {displayTagline || 'Authentic, pure & lab-tested quality products delivered directly to your doorstep.'}
            </p>
            {(displayEmail || activePhone || activeHotline) && (
              <div className="text-xs sm:text-sm text-slate-800 space-y-2 pt-1 font-medium">
                {displayEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <a href={`mailto:${displayEmail}`} className="hover:text-black hover:underline transition-colors">{displayEmail}</a>
                  </div>
                )}
                {activePhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <a href={`tel:${activePhone.replace(/[^\d+]/g, '')}`} className="hover:text-black hover:underline transition-colors">
                      Customer Care: <strong className="font-bold text-slate-950">{activePhone}</strong>
                    </a>
                  </div>
                )}
                {activeHotline && (
                  <div className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <a href={`tel:${activeHotline.replace(/[^\d+]/g, '')}`} className="hover:text-black hover:underline transition-colors">
                      Hotline: <strong className="font-bold text-slate-950">{activeHotline}</strong>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Quick Links (All 100% Working) */}
          <div>
            <h4 className="text-sm font-black tracking-wider uppercase text-slate-950 mb-4 pb-1 border-b-2 border-slate-950/20 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-800 font-medium">
              <li>
                <button 
                  type="button"
                  onClick={() => { setActiveNav('home'); scrollToTop(); }} 
                  className="hover:text-black hover:underline transition-colors cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => { setActiveNav('shop'); scrollToTop(); }} 
                  className="hover:text-black hover:underline transition-colors cursor-pointer text-left"
                >
                  Shop Products
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                  className="hover:text-black hover:underline transition-colors cursor-pointer text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => { setActiveNav('contact'); scrollToTop(); }} 
                  className="hover:text-black hover:underline transition-colors cursor-pointer text-left"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Categories & Connect */}
          <div className="space-y-4">
            {validCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-black tracking-wider uppercase text-slate-950 mb-3 pb-1 border-b-2 border-slate-950/20 inline-block">
                  Categories
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-800 font-medium">
                  {validCategories.map(cat => (
                    <li key={cat}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNav('shop');
                          setSelectedCategoryCheckbox(cat);
                          scrollToTop();
                        }}
                        className="hover:text-black hover:underline transition-colors cursor-pointer text-left"
                      >
                        {cat}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Direct WhatsApp Chat if number is configured */}
            {activeWhatsApp && (
              <div className="pt-2">
                <a 
                  href={`https://wa.me/${activeWhatsApp.replace(/[^\d]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-[#20ba5a] text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <span>Chat on WhatsApp →</span>
                </a>
              </div>
            )}

            {/* Social Media Links (Only if actual URLs are set) */}
            {hasSocials && (
              <div className="pt-2">
                <div className="text-xs text-slate-900 mb-2 font-bold">Follow us on social media:</div>
                <div className="flex items-center gap-2.5">
                  {socialLinks?.facebook && (
                    <a 
                      href={socialLinks.facebook} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-8 h-8 rounded-full bg-slate-950/10 hover:bg-[#1877f2] hover:text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer text-slate-900"
                      title="Facebook"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  )}
                  {socialLinks?.instagram && (
                    <a 
                      href={socialLinks.instagram} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-8 h-8 rounded-full bg-slate-950/10 hover:bg-[#e4405f] hover:text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer text-slate-900"
                      title="Instagram"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                  )}
                  {socialLinks?.youtube && (
                    <a 
                      href={socialLinks.youtube} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="w-8 h-8 rounded-full bg-slate-950/10 hover:bg-[#ff0000] hover:text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer text-slate-900"
                      title="YouTube"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* SSLCommerz Verified Payment Methods & Bottom Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-10 pt-6 border-t border-slate-900/15 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <span className="text-[11px] text-slate-800 font-semibold flex items-center gap-1.5 mr-1">
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              Verified & Secured by SSLCommerz:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="bg-white text-[#e2136e] px-2 py-0.5 rounded shadow-xs font-black">bKash</span>
              <span className="bg-white text-[#f7941d] px-2 py-0.5 rounded shadow-xs font-black">Nagad</span>
              <span className="bg-white text-[#8c3494] px-2 py-0.5 rounded shadow-xs font-black">Rocket</span>
              <span className="bg-white text-[#00579f] px-2 py-0.5 rounded shadow-xs font-bold">VISA</span>
              <span className="bg-white text-[#eb001b] px-2 py-0.5 rounded shadow-xs font-bold">Mastercard</span>
              <span className="bg-white text-[#0066b2] px-2 py-0.5 rounded shadow-xs font-bold">Nexus</span>
            </div>
          </div>

          <div className="text-xs text-slate-800 font-medium text-center md:text-right">
            © {new Date().getFullYear()} {displayStoreName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* FLOATING SCROLL TO TOP BUTTON */}
      <div className="fixed bottom-6 left-6 z-40 hidden sm:block">
        <button 
          onClick={scrollToTop}
          className="w-10 h-10 bg-slate-950 hover:bg-slate-900 text-[#FDD305] rounded-full flex items-center justify-center shadow-lg border border-slate-800 transition-transform hover:scale-110 active:scale-95 cursor-pointer font-bold"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 text-[#FDD305] font-bold" />
        </button>
      </div>
    </>
  );
}
