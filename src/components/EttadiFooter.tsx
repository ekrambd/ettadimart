import React from 'react';
import { ArrowUp, Phone, Mail, MapPin } from 'lucide-react';

interface FantineFooterProps {
  displayStoreLogo: string;
  displayStoreName: string;
  displayTagline: string;
  displayAddress?: string;
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
  displayAddress,
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
  const activeHotline = (hotlinePhone && hotlinePhone !== '09678812525' && hotlinePhone !== '+8809613444455') ? hotlinePhone : (displayPhone || '01726275850');
  const activeWhatsApp = whatsappNumber || socialLinks?.whatsapp || displayPhone || '01726275850';
  const activePhone = displayPhone || activeHotline || '01726275850';
  const storeEmail = displayEmail || 'contact@ettadimart.com';
  const storeAddress = displayAddress || 'Dhaka, Bangladesh';

  return (
    <>
      <footer className="bg-white text-slate-600 pt-14 pb-8 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Main 4-Column Full-Width Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-100">
            
            {/* Column 1: Brand & Contact Info (4 cols) */}
            <div className="sm:col-span-1 lg:col-span-4 space-y-4">
              <div className="mb-2">
                <img 
                  src={displayStoreLogo || '/ettadimart-logo.svg'} 
                  alt={displayStoreName} 
                  className="h-10 sm:h-11 w-auto max-w-[210px] object-contain" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/ettadimart-logo.svg';
                  }}
                />
              </div>

              <div className="space-y-3 text-xs sm:text-[13px] text-slate-600 leading-relaxed pt-1 max-w-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{storeAddress}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <a href={`tel:${activePhone.replace(/[^\d+]/g, '')}`} className="font-medium text-slate-800 hover:text-[#F37022] transition-colors">
                      {activePhone}
                    </a>
                    <div className="text-[11px] text-slate-400 mt-0.5">9 am - 9 pm (Everyday)</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${storeEmail}`} className="text-slate-700 hover:text-[#F37022] transition-colors">
                    {storeEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Follow Us & Social Links (3 cols - positioned in the empty middle space) */}
            <div className="sm:col-span-1 lg:col-span-3 space-y-4 lg:pl-4">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Follow Us</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Follow {displayStoreName} on social media for new drops, special deals & updates.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Facebook */}
                <a 
                  href={socialLinks?.facebook || "https://facebook.com"} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:border-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Facebook"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>

                {/* TikTok */}
                <a 
                  href="https://tiktok.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:border-black hover:bg-black hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="TikTok"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>

                {/* YouTube */}
                <a 
                  href={socialLinks?.youtube || "https://youtube.com"} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:border-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="YouTube"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>

                {/* LinkedIn */}
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:border-blue-700 hover:bg-blue-700 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="LinkedIn"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>

                {/* Instagram */}
                <a 
                  href={socialLinks?.instagram || "https://instagram.com"} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full border border-slate-200 text-slate-600 hover:border-pink-600 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Instagram"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            {/* Column 3: About Us (2.5 cols) */}
            <div className="sm:col-span-1 lg:col-span-2 lg:pl-4">
              <h4 className="text-sm font-bold text-slate-900 mb-4">About Us</h4>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('shop'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Ettadi Mart Blog
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('contact'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Join the Affiliate Program
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Cookies Policy
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('contact'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left font-medium text-slate-800"
                  >
                    Sell with Ettadi Mart
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Customer Care (3 cols) */}
            <div className="sm:col-span-1 lg:col-span-3 lg:pl-4">
              <h4 className="text-sm font-bold text-slate-900 mb-4">Customer Care</h4>
              <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Return & Refund Policy
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Warranty Policy
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('contact'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={() => { setActiveNav('about'); scrollToTop(); }} 
                    className="hover:text-[#F37022] transition-colors cursor-pointer text-left"
                  >
                    EMI Policy
                  </button>
                </li>
              </ul>
            </div>

          </div>


          {/* Bottom Copyright Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
              <span>© Copyright {new Date().getFullYear()} {displayStoreName}. All Rights Reserved.</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <span>Developed by</span>
              <a
                href="https://corbincore.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-900 hover:text-[#F37022] transition-colors underline underline-offset-2 decoration-slate-300 hover:decoration-[#F37022] cursor-pointer"
              >
                Corbin Core
              </a>
            </div>
          </div>

        </div>
      </footer>

      {/* FLOATING SCROLL TO TOP BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
        <button 
          onClick={scrollToTop}
          className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 rounded-full flex items-center justify-center shadow-lg border border-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </>
  );
}
