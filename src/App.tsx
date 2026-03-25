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
import CheckoutPage from "./pages/CheckoutPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import RepresentativesPage from "./pages/admin/RepresentativesPage";
import DoctorsPage from "./pages/admin/DoctorsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminProductsPage from "./pages/admin/ProductsPage";
import CommissionsPage from "./pages/admin/CommissionsPage";
import StoreSettingsPage from "./pages/admin/StoreSettingsPage";
import IntegrationsPage from "./pages/admin/IntegrationsPage";

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
            <Routes>
              <Route path="/" element={<BlingRedirect />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/produto/:slug" element={<ProductDetail />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin" element={<AdminLayout><DashboardPage /></AdminLayout>} />
              <Route path="/admin/representantes" element={<AdminLayout><RepresentativesPage /></AdminLayout>} />
              <Route path="/admin/produtos" element={<AdminLayout><AdminProductsPage /></AdminLayout>} />
              <Route path="/admin/doutores" element={<AdminLayout><DoctorsPage /></AdminLayout>} />
              <Route path="/admin/comissoes" element={<AdminLayout><CommissionsPage /></AdminLayout>} />
              <Route path="/admin/relatorios" element={<AdminLayout><ReportsPage /></AdminLayout>} />
              <Route path="/admin/configuracoes" element={<AdminLayout><StoreSettingsPage /></AdminLayout>} />
              <Route path="/admin/integracoes" element={<AdminLayout><IntegrationsPage /></AdminLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
