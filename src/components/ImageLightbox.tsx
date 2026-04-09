import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  alt?: string;
}

const ImageLightbox = ({ images, initialIndex, open, onClose, alt = "Produto" }: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoomed(false);
    }
  }, [open, initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
    setZoomed(false);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    setZoomed(false);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, goNext, goPrev]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label="Fechar"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Zoom toggle */}
        <button
          onClick={() => setZoomed((z) => !z)}
          className="absolute right-16 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          aria-label={zoomed ? "Reduzir" : "Ampliar"}
        >
          {zoomed ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
        </button>

        {/* Counter */}
        <span className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
          {currentIndex + 1} / {images.length}
        </span>

        {/* Prev arrow */}
        {images.length > 1 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 md:left-6"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}

        {/* Next arrow */}
        {images.length > 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 md:right-6"
            aria-label="Próxima"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}

        {/* Main image */}
        <div className={`flex items-center justify-center transition-all duration-300 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={() => setZoomed((z) => !z)}
        >
          <img
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            className={`max-h-[85vh] max-w-[90vw] rounded-lg object-contain transition-transform duration-300 select-none ${zoomed ? "scale-150 md:scale-[2]" : "scale-100"}`}
            draggable={false}
          />
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-xl bg-black/50 p-2 backdrop-blur-sm">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setZoomed(false); }}
                className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${i === currentIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"}`}
              >
                <img src={img} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
