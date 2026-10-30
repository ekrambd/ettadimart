import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { initPixelAndGtm, trackEvent } from './lib/pixelGtmService';
import { ErrorBoundary } from './components/ErrorBoundary';

const LoginPage = lazy(() => import('./components/LoginPage'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ShopLoginPage = lazy(() => import('./components/ShopLoginPage'));
const ShopsListPage = lazy(() => import('./components/ShopsListPage'));
const ShopProfilePage = lazy(() => import('./components/ShopProfilePage'));

const loadBookLandingPage = () => import('./components/BookLandingPage');
const BookLandingPage = lazy(loadBookLandingPage);
const EttadiStorePage = lazy(() => import('./components/EttadiStorePage'));

// Fix: Only preload landing page chunk if visiting a known landing path
if (typeof window !== 'undefined') {
  const path = window.location.pathname;
  if (path.startsWith('/book') || path.startsWith('/landing') || path === '/boi' || path === '/smart-land-survey-book') {
    loadBookLandingPage();
  }
}

function DynamicFaviconSync({ ecomSettings }: { ecomSettings: any }) {
  useEffect(() => {
    const faviconUrl = ecomSettings?.storeFavicon || ecomSettings?.favicon || '/placeholder-favicon.svg';
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [ecomSettings?.storeFavicon, ecomSettings?.favicon]);

  return null;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminEmail, setAdminEmail, logoutAdmin, ecomSettings } = useAppStore();
  
  useEffect(() => {
    // Globally initialize the Meta Pixel as soon as settings load
    const pixelId = (ecomSettings?.pixelId || import.meta.env.VITE_META_PIXEL_ID || '').trim();
    const gtmId = (ecomSettings?.gtmId || import.meta.env.VITE_GTM_ID || '').trim();
    if (pixelId || gtmId) {
      initPixelAndGtm(pixelId, gtmId);
    }
  }, [ecomSettings?.pixelId, ecomSettings?.gtmId]);

  useEffect(() => {
    // Track PageView on route change (SPA support)
    trackEvent('PageView', {
      page_path: location.pathname,
      page_location: window.location.href,
      page_title: document.title
    });
  }, [location.pathname]);

  useEffect(() => {
    // Check initial cached admin session
    const storedEmail = localStorage.getItem('noor_admin_session_email');
    if (storedEmail && !adminEmail) {
      setAdminEmail(storedEmail);
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    // Native background auth check
    const timer = setTimeout(() => {
      void import('./lib/authService').then(({ authService }) => {
        if (cancelled) return;
        unsubscribe = authService.onAuthStateChanged((user) => {
          if (cancelled) return;
          if (user) {
            localStorage.setItem('noor_admin_session_email', user.email || '');
            setAdminEmail(user.email);
          } else {
            const email = localStorage.getItem('noor_admin_session_email');
            setAdminEmail(email || null);
          }
        });
      }).catch((error) => {
        console.warn('Background admin auth check completed:', error);
      });
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, [adminEmail, setAdminEmail]);

  useEffect(() => {
    // Defer session visitor ping so initial paint & load finish first
    let sessionId = sessionStorage.getItem('noor_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('noor_session_id', sessionId);
    }
    
    let isPinging = false;
    const ping = async () => {
      if (isPinging) return;
      isPinging = true;
      try {
        const { dbService } = await import('./lib/dbService');
        await dbService.pingLiveVisitor(sessionId!, window.location.pathname);
      } catch (err) {
        // fail silently
      } finally {
        isPinging = false;
      }
    };

    // Initial ping after 3 seconds idle, then every 30s
    const initTimer = setTimeout(() => {
      void ping();
    }, 3000);
    const interval = setInterval(ping, 30000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (email: string) => {
    localStorage.setItem('noor_admin_session_email', email);
    setAdminEmail(email);
    navigate('/admin/dashboard');
  };

  const handleLogout = async () => {
    try {
      const { authService } = await import('./lib/authService');
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('noor_admin_session_email');
      localStorage.removeItem('admin_token');
      logoutAdmin();
      navigate('/');
    }
  };

  return (
    <div className="bg-[#faf9f6] min-h-screen text-slate-900">
      <DynamicFaviconSync ecomSettings={ecomSettings} />
      <Suspense fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-[3.5px] border-[#F37022]/20 border-t-[#F37022] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/ettadimart-favicon.svg" alt="EttadiMart" className="w-8 h-8 object-contain" />
            </div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="text-sm font-black text-slate-900 tracking-wide">
              ETTADI <span className="text-[#F37022]">MART</span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">Loading store...</div>
          </div>
        </div>
      }>
        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={
              <EttadiStorePage
                onGoToLogin={() => navigate('/login')}
                onGoToLanding={() => navigate('/book')}
              />
            } />
            
            {/* Proper SEO setup: Core app sections continue rendering the app */}
            <Route path="/shop" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/shops" element={<ShopsListPage onGoToShop={(s) => navigate(`/shops/${s}`)} />} />
            <Route path="/shops/:slug" element={<ShopProfilePage />} />
            <Route path="/shop/login" element={<ShopLoginPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/contact" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/about" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/quiz" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/checkout" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/product/:slug" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/product/:slug/:id" element={<EttadiStorePage onGoToLogin={() => navigate('/login')} onGoToLanding={() => navigate('/book')} />} />
            <Route path="/fantine" element={<Navigate to="/" replace />} />
            
            {/* Fix Duplicate Content: Canonical Redirects for legacy .html routes */}
            <Route path="/store" element={<Navigate to="/shop" replace />} />
            <Route path="/news" element={<Navigate to="/" replace />} />
            <Route path="/shop.html" element={<Navigate to="/shop" replace />} />
            <Route path="/contact.html" element={<Navigate to="/contact" replace />} />
            <Route path="/product_385231.html" element={<Navigate to="/product/rapid-acne-treatment-toner/product_385231" replace />} />
            <Route path="/product_*.html" element={<Navigate to="/shop" replace />} />

            {/* Policy, Legal & Support Canonical Redirects (Prevents falling back to book landing) */}
            <Route path="/privacy-policy" element={<Navigate to="/about" replace />} />
            <Route path="/privacy" element={<Navigate to="/about" replace />} />
            <Route path="/terms" element={<Navigate to="/about" replace />} />
            <Route path="/terms-and-conditions" element={<Navigate to="/about" replace />} />
            <Route path="/terms-of-service" element={<Navigate to="/about" replace />} />
            <Route path="/return-policy" element={<Navigate to="/about" replace />} />
            <Route path="/refund-policy" element={<Navigate to="/about" replace />} />
            <Route path="/shipping-policy" element={<Navigate to="/about" replace />} />
            <Route path="/faq" element={<Navigate to="/about" replace />} />
            <Route path="/support" element={<Navigate to="/contact" replace />} />
            <Route path="/help" element={<Navigate to="/contact" replace />} />

            {/* Customer Account & Order Tracking */}
            <Route path="/track-order" element={
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onNavigateHome={() => navigate('/')}
              />
            } />
            <Route path="/my-orders" element={
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onNavigateHome={() => navigate('/')}
              />
            } />
            
            <Route path="/book" element={
              <BookLandingPage 
                onNavigateHome={() => navigate('/')}
                onNavigateToLogin={() => navigate('/login')}
              />
            } />
            <Route path="/boi" element={<Navigate to="/book" replace />} />
            <Route path="/smart-land-survey-book" element={<Navigate to="/book" replace />} />
            
            <Route path="/login" element={
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onNavigateHome={() => navigate('/')}
              />
            } />
            <Route path="/admin" element={
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onNavigateHome={() => navigate('/')}
              />
            } />
            
            <Route path="/admin/dashboard" element={
              adminEmail ? (
                <AdminDashboard 
                  adminEmail={adminEmail}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } />
            
            {/* Landing Page Routes */}
            <Route path="/landing/:slug" element={
              <BookLandingPage 
                onNavigateHome={() => navigate('/')}
                onNavigateToLogin={() => navigate('/login')}
              />
            } />

            {/* Direct Product Landing Route (Only catches 1-level deep unrecognized slugs) */}
            <Route path="/:slug" element={
              <BookLandingPage 
                onNavigateHome={() => navigate('/')}
                onNavigateToLogin={() => navigate('/login')}
              />
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
