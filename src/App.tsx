import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import DesignTokenApplier from "./components/DesignTokenApplier";
import TrackingScripts from "./components/TrackingScripts";

// Lazy-loaded storefront pages
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CheckoutRouter = lazy(() => import("./pages/CheckoutRouter"));
const ComboDetail = lazy(() => import("./pages/ComboDetail"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const MFASetupPage = lazy(() => import("./pages/MFASetupPage"));
const MFAVerifyPage = lazy(() => import("./pages/MFAVerifyPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const CustomerFeedbackPage = lazy(() => import("./pages/CustomerFeedbackPage"));
const PrescritorPage = lazy(() => import("./pages/PrescritorPage"));
const PrescriberSignupPage = lazy(() => import("./pages/PrescriberSignupPage"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const LinkRedirectPage = lazy(() => import("./pages/LinkRedirectPage"));

// Lazy-loaded global widgets (non-critical, load after main content)
const RecentPurchasePopup = lazy(() => import("./components/RecentPurchasePopup"));
const WebchatWidget = lazy(() => import("./components/WebchatWidget"));
const PopupBanner = lazy(() => import("./components/PopupBanner"));
const FloatingCheckoutButton = lazy(() => import("./components/FloatingCheckoutButton"));

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const RepresentativesPage = lazy(() => import("./pages/admin/RepresentativesPage"));
const DoctorsPage = lazy(() => import("./pages/admin/DoctorsPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const CommissionsPage = lazy(() => import("./pages/admin/CommissionsPage"));
const RepCommissionsPage = lazy(() => import("./pages/admin/RepCommissionsPage"));
const StoreSettingsPage = lazy(() => import("./pages/admin/StoreSettingsPage"));
const DesignSettingsPage = lazy(() => import("./pages/admin/DesignSettingsPage"));
const IntegrationsPage = lazy(() => import("./pages/admin/IntegrationsPage"));
const RecoveryPage = lazy(() => import("./pages/admin/RecoveryPage"));
const CouponsPage = lazy(() => import("./pages/admin/CouponsPage"));
const BannerPage = lazy(() => import("./pages/admin/BannerPage"));
const PopupsPage = lazy(() => import("./pages/admin/PopupsPage"));
const LeadsPage = lazy(() => import("./pages/admin/LeadsPage"));
const PagesPage = lazy(() => import("./pages/admin/PagesPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const CheckoutSettingsPage = lazy(() => import("./pages/admin/CheckoutSettingsPage"));
const AIAgentsPage = lazy(() => import("./pages/admin/AIAgentsPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const LinksPage = lazy(() => import("./pages/admin/LinksPage"));
const CombosPage = lazy(() => import("./pages/admin/CombosPage"));
const ToolsPage = lazy(() => import("./pages/admin/ToolsPage"));
const RepurchasePage = lazy(() => import("./pages/admin/RepurchasePage"));
const WhatsAppPage = lazy(() => import("./pages/admin/WhatsAppPage"));
const FeedbackApprovalPage = lazy(() => import("./pages/admin/FeedbackApprovalPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Detect Bling OAuth callback and redirect to edge function
const BlingRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (code && state) {
    const edgeUrl = `https://xufiemrhlmirkrdrcxox.supabase.co/functions/v1/bling-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    window.location.href = edgeUrl;
    return <PageLoader />;
  }
  return <Index />;
};

// Helper for admin routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    <AdminLayout>{children}</AdminLayout>
  </Suspense>
);

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
            <Suspense fallback={null}>
              <RecentPurchasePopup />
              <WebchatWidget />
              <PopupBanner />
              <FloatingCheckoutButton />
            </Suspense>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<BlingRedirect />} />
                <Route path="/produtos" element={<ProductsPage />} />
                <Route path="/produto/:slug" element={<ProductDetail />} />
                <Route path="/combo/:slug" element={<ComboDetail />} />
                <Route path="/checkout" element={<CheckoutRouter />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/mfa-setup" element={<MFASetupPage />} />
                <Route path="/mfa-verify" element={<MFAVerifyPage />} />
                <Route path="/pedido-confirmado/:orderId" element={<OrderConfirmationPage />} />
                <Route path="/acompanhar-pedido" element={<TrackOrderPage />} />
                <Route path="/feedback" element={<CustomerFeedbackPage />} />
                <Route path="/prescritor" element={<PrescritorPage />} />
                <Route path="/cadastrar" element={<PrescriberSignupPage />} />
                <Route path="/politica-de-privacidade" element={<StaticPage />} />
                <Route path="/termos-de-uso" element={<StaticPage />} />
                <Route path="/trocas-e-devolucoes" element={<StaticPage />} />
                <Route path="/quem-somos" element={<StaticPage />} />
                <Route path="/admin" element={<AdminRoute><DashboardPage /></AdminRoute>} />
                <Route path="/admin/representantes" element={<AdminRoute><RepresentativesPage /></AdminRoute>} />
                <Route path="/admin/representantes/:repId/comissoes" element={<AdminRoute><RepCommissionsPage /></AdminRoute>} />
                <Route path="/admin/produtos" element={<AdminRoute><AdminProductsPage /></AdminRoute>} />
                <Route path="/admin/prescritores" element={<AdminRoute><DoctorsPage /></AdminRoute>} />
                <Route path="/admin/comissoes" element={<AdminRoute><CommissionsPage /></AdminRoute>} />
                <Route path="/admin/relatorios" element={<AdminRoute><ReportsPage /></AdminRoute>} />
                <Route path="/admin/configuracoes" element={<AdminRoute><StoreSettingsPage /></AdminRoute>} />
                <Route path="/admin/design" element={<AdminRoute><DesignSettingsPage /></AdminRoute>} />
                <Route path="/admin/integracoes" element={<AdminRoute><IntegrationsPage /></AdminRoute>} />
                <Route path="/admin/recuperacao" element={<AdminRoute><RecoveryPage /></AdminRoute>} />
                <Route path="/admin/cupons" element={<AdminRoute><CouponsPage /></AdminRoute>} />
                <Route path="/admin/banner" element={<AdminRoute><BannerPage /></AdminRoute>} />
                <Route path="/admin/popups" element={<AdminRoute><PopupsPage /></AdminRoute>} />
                <Route path="/admin/leads" element={<AdminRoute><LeadsPage /></AdminRoute>} />
                <Route path="/admin/paginas" element={<AdminRoute><PagesPage /></AdminRoute>} />
                <Route path="/admin/vendas" element={<AdminRoute><OrdersPage /></AdminRoute>} />
                <Route path="/admin/clientes" element={<AdminRoute><CustomersPage /></AdminRoute>} />
                <Route path="/admin/checkout" element={<AdminRoute><CheckoutSettingsPage /></AdminRoute>} />
                <Route path="/admin/agentes-ia" element={<AdminRoute><AIAgentsPage /></AdminRoute>} />
                <Route path="/admin/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
                <Route path="/admin/links" element={<AdminRoute><LinksPage /></AdminRoute>} />
                <Route path="/admin/combos" element={<AdminRoute><CombosPage /></AdminRoute>} />
                <Route path="/admin/ferramentas" element={<AdminRoute><ToolsPage /></AdminRoute>} />
                <Route path="/admin/recompra" element={<AdminRoute><RepurchasePage /></AdminRoute>} />
                <Route path="/admin/whatsapp" element={<AdminRoute><WhatsAppPage /></AdminRoute>} />
                <Route path="/admin/feedbacks" element={<AdminRoute><FeedbackApprovalPage /></AdminRoute>} />
                <Route path="/l/:code" element={<LinkRedirectPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
