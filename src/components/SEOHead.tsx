import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  keywords?: string;
  url?: string;
}

export default function SEOHead({ title, description, canonical, image, keywords, url }: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = `${title} | D7 Pharma Brazil`;
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

    if (description) {
      setMeta("description", description);
      setMeta("og:description", description);
      setMeta("twitter:description", description);
    }
    setMeta("og:title", fullTitle);
    setMeta("og:type", "website");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);

    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image);
    }

    if (url) {
      setMeta("og:url", url);
    }

    if (keywords) {
      setMeta("keywords", keywords);
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
  }, [title, description, canonical, image, keywords, url]);

  return null;
}
