import { useStoreSettings } from "@/hooks/useStoreSettings";
import CheckoutPage from "./CheckoutPage";
import CheckoutPageV2 from "./CheckoutPageV2";
import CheckoutPageV3 from "./CheckoutPageV3";

const CheckoutRouter = () => {
  const { data: settings, isLoading } = useStoreSettings();
  const version = (settings as any)?.checkout_version || "v1";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (version === "v3") return <CheckoutPageV3 />;
  if (version === "v2") return <CheckoutPageV2 />;
  return <CheckoutPage />;
};

export default CheckoutRouter;
