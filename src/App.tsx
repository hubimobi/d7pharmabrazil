import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetail from "./pages/ProductDetail";
import CheckoutRouter from "./pages/CheckoutRouter";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MFASetupPage from "./pages/MFASetupPage";
import MFAVerifyPage from "./pages/MFAVerifyPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import RepresentativesPage from "./pages/admin/RepresentativesPage";
import DoctorsPage from "./pages/admin/DoctorsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminProductsPage from "./pages/admin/ProductsPage";
import CommissionsPage from "./pages/admin/CommissionsPage";
import RepCommissionsPage from "./pages/admin/RepCommissionsPage";
import StoreSettingsPage from "./pages/admin/StoreSettingsPage";
import DesignSettingsPage from "./pages/admin/DesignSettingsPage";
import IntegrationsPage from "./pages/admin/IntegrationsPage";
import RecoveryPage from "./pages/admin/RecoveryPage";
import CouponsPage from "./pages/admin/CouponsPage";
import BannerPage from "./pages/admin/BannerPage";
import PopupsPage from "./pages/admin/PopupsPage";
import LeadsPage from "./pages/admin/LeadsPage";
import PagesPage from "./pages/admin/PagesPage";
import OrdersPage from "./pages/admin/OrdersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import CheckoutSettingsPage from "./pages/admin/CheckoutSettingsPage";
import AIAgentsPage from "./pages/admin/AIAgentsPage";
import UsersPage from "./pages/admin/UsersPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import PrescritorPage from "./pages/PrescritorPage";
import StaticPage from "./pages/StaticPage";
import RecentPurchasePopup from "./components/RecentPurchasePopup";
import WebchatWidget from "./components/WebchatWidget";
import PopupBanner from "./components/PopupBanner";
import DesignTokenApplier from "./components/DesignTokenApplier";
import TrackingScripts from "./components/TrackingScripts";
import LinkRedirectPage from "./pages/LinkRedirectPage";
import LinksPage from "./pages/admin/LinksPage";
import CombosPage from "./pages/admin/CombosPage";
import ScrollToTop from "./components/ScrollToTop";
import FloatingCheckoutButton from "./components/FloatingCheckoutButton";
const queryClient = new QueryClient();

// Detect Bling OAuth callback and redirect to edge function
const BlingRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) {
    const edgeUrl = `https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/bling-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    window.location.href = edgeUrl;
    return <div className="flex items-center justify-center min-h-screen"><p>Conectando ao Bling...</p></div>;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <DesignTokenApplier />
            <TrackingScripts />
            <RecentPurchasePopup />
            <WebchatWidget />
            <PopupBanner />
            <FloatingCheckoutButton />
            <Routes>
              <Route path="/" element={<BlingRedirect />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/produto/:slug" element={<ProductDetail />} />
              <Route path="/checkout" element={<CheckoutRouter />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/mfa-setup" element={<MFASetupPage />} />
              <Route path="/mfa-verify" element={<MFAVerifyPage />} />
              <Route path="/pedido-confirmado/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/acompanhar-pedido" element={<TrackOrderPage />} />
              <Route path="/prescritor" element={<PrescritorPage />} />
              <Route path="/politica-de-privacidade" element={<StaticPage />} />
              <Route path="/termos-de-uso" element={<StaticPage />} />
              <Route path="/trocas-e-devolucoes" element={<StaticPage />} />
              <Route path="/quem-somos" element={<StaticPage />} />
              <Route path="/admin" element={<AdminLayout><DashboardPage /></AdminLayout>} />
              <Route path="/admin/representantes" element={<AdminLayout><RepresentativesPage /></AdminLayout>} />
              <Route path="/admin/representantes/:repId/comissoes" element={<AdminLayout><RepCommissionsPage /></AdminLayout>} />
              <Route path="/admin/produtos" element={<AdminLayout><AdminProductsPage /></AdminLayout>} />
              <Route path="/admin/prescritores" element={<AdminLayout><DoctorsPage /></AdminLayout>} />
              <Route path="/admin/comissoes" element={<AdminLayout><CommissionsPage /></AdminLayout>} />
              <Route path="/admin/relatorios" element={<AdminLayout><ReportsPage /></AdminLayout>} />
              <Route path="/admin/configuracoes" element={<AdminLayout><StoreSettingsPage /></AdminLayout>} />
              <Route path="/admin/design" element={<AdminLayout><DesignSettingsPage /></AdminLayout>} />
              <Route path="/admin/integracoes" element={<AdminLayout><IntegrationsPage /></AdminLayout>} />
              <Route path="/admin/recuperacao" element={<AdminLayout><RecoveryPage /></AdminLayout>} />
              <Route path="/admin/cupons" element={<AdminLayout><CouponsPage /></AdminLayout>} />
              <Route path="/admin/banner" element={<AdminLayout><BannerPage /></AdminLayout>} />
              <Route path="/admin/popups" element={<AdminLayout><PopupsPage /></AdminLayout>} />
              <Route path="/admin/leads" element={<AdminLayout><LeadsPage /></AdminLayout>} />
              <Route path="/admin/paginas" element={<AdminLayout><PagesPage /></AdminLayout>} />
              <Route path="/admin/vendas" element={<AdminLayout><OrdersPage /></AdminLayout>} />
              <Route path="/admin/clientes" element={<AdminLayout><CustomersPage /></AdminLayout>} />
              <Route path="/admin/checkout" element={<AdminLayout><CheckoutSettingsPage /></AdminLayout>} />
              <Route path="/admin/agentes-ia" element={<AdminLayout><AIAgentsPage /></AdminLayout>} />
              <Route path="/admin/usuarios" element={<AdminLayout><UsersPage /></AdminLayout>} />
              <Route path="/admin/links" element={<AdminLayout><LinksPage /></AdminLayout>} />
              <Route path="/admin/combos" element={<AdminLayout><CombosPage /></AdminLayout>} />
              <Route path="/l/:code" element={<LinkRedirectPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
