import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function TrackingScripts() {
  const { data: settings } = useStoreSettings();

  // Sanitize IDs to prevent script injection
  const sanitizeId = (id: string | undefined | null): string => {
    const raw = id || "";
    return /^[a-zA-Z0-9_-]+$/.test(raw) ? raw : "";
  };

  const metaPixelId = sanitizeId((settings as any)?.meta_pixel_id);
  const gtmId = sanitizeId((settings as any)?.gtm_id);
  const hotjarId = sanitizeId((settings as any)?.hotjar_id);

  // Meta Pixel
  useEffect(() => {
    if (!metaPixelId) return;
    if (document.getElementById("meta-pixel-script")) return;

    const script = document.createElement("script");
    script.id = "meta-pixel-script";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${metaPixelId}');fbq('track','PageView');
    `;
    document.head.appendChild(script);

    // noscript goes in body (HTML5 spec: noscript with img not allowed in head)
    const noscript = document.createElement("noscript");
    noscript.id = "meta-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);

    return () => {
      document.getElementById("meta-pixel-script")?.remove();
      document.getElementById("meta-pixel-noscript")?.remove();
    };
  }, [metaPixelId]);

  // GTM
  useEffect(() => {
    if (!gtmId) return;
    if (document.getElementById("gtm-script")) return;

    const script = document.createElement("script");
    script.id = "gtm-script";
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement("noscript");
    noscript.id = "gtm-noscript";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${gtmId}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);

    return () => {
      document.getElementById("gtm-script")?.remove();
      document.getElementById("gtm-noscript")?.remove();
    };
  }, [gtmId]);

  // Hotjar
  useEffect(() => {
    if (!hotjarId) return;
    if (document.getElementById("hotjar-script")) return;

    const script = document.createElement("script");
    script.id = "hotjar-script";
    script.innerHTML = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${hotjarId},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `;
    document.head.appendChild(script);

    return () => {
      document.getElementById("hotjar-script")?.remove();
    };
  }, [hotjarId]);

  return null;
}
