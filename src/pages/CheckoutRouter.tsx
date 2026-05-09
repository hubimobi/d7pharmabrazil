import { useSearchParams } from "react-router-dom";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import CheckoutPage from "./CheckoutPage";
import CheckoutPageV2 from "./CheckoutPageV2";
import CheckoutPageV3 from "./CheckoutPageV3";

const CheckoutRouter = () => {
  const { data: settings, isLoading } = useStoreSettings();
  const [searchParams] = useSearchParams();

  // URL param override: ?ck=1, ?ck=2, ?ck=3
  const ckParam = searchParams.get("ck");
  const forceMobile = searchParams.has("m");

  const version = ckParam
    ? `v${ckParam}`
    : (settings as any)?.checkout_version || "v1";

  // Render immediately. If settings change the version later, it will smoothly swap.

  const wrapperClass = forceMobile ? "force-mobile-layout" : "";

  return (
    <div className={wrapperClass}>
      {version === "v3" ? <CheckoutPageV3 /> :
       version === "v2" ? <CheckoutPageV2 /> :
       <CheckoutPage />}
    </div>
  );
};

export default CheckoutRouter;
