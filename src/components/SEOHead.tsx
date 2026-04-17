import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface SEOHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  keywords?: string;
  url?: string;
}

export default function SEOHead({ title, description, canonical, image, keywords, url }: SEOHeadProps) {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    const storeName = settings?.store_name || "Loja";
    const fullTitle = `${title} | ${storeName}`;
    document.title = fullTitle;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (name.startsWith("og:") || name.startsWith("twitter:")) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const finalDescription = description || (settings as any)?.seo_default_description;
    if (finalDescription) {
      setMeta("description", finalDescription);
      setMeta("og:description", finalDescription);
      setMeta("twitter:description", finalDescription);
    }
    setMeta("og:title", fullTitle);
    setMeta("og:type", "website");
    setMeta("og:site_name", storeName);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);

    const finalImage =
      image ||
      (settings as any)?.seo_default_og_image ||
      settings?.logo_url;
    if (finalImage) {
      setMeta("og:image", finalImage);
      setMeta("twitter:image", finalImage);
    }

    if (url) {
      setMeta("og:url", url);
    }

    const finalKeywords = keywords || (settings as any)?.seo_keywords;
    if (finalKeywords) {
      setMeta("keywords", finalKeywords);
    }

    const canonicalUrl = canonical || url;
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    }
  }, [title, description, canonical, image, keywords, url, settings]);

  return null;
}
