import { useState, useEffect } from "react";

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const handleLoad = () => {
      setFadeOut(true);
      setTimeout(() => setVisible(false), 500);
    };

    if (document.readyState === "complete") {
      // Give a minimum display time
      setTimeout(handleLoad, 600);
    } else {
      window.addEventListener("load", () => setTimeout(handleLoad, 400));
    }

    // Fallback: hide after 4s max
    const fallback = setTimeout(handleLoad, 4000);
    return () => clearTimeout(fallback);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="h-16 w-16 rounded-full border-4 border-muted animate-spin border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="h-7 w-7 text-primary animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse tracking-wide">
        Carregando as melhores ofertas para você…
      </p>
    </div>
  );
}
