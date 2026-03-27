import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Instagram } from "lucide-react";
import { useState } from "react";

const PLACEHOLDER_POSTS = Array.from({ length: 9 }, (_, i) => ({
  id: `post-${i}`,
  image: `https://picsum.photos/seed/insta${i + 1}/400/400`,
}));

export default function InstagramFeed() {
  const { data: settings } = useStoreSettings();
  const instagramUrl = settings?.instagram;
  const [page, setPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.ceil(PLACEHOLDER_POSTS.length / perPage);
  const visiblePosts = PLACEHOLDER_POSTS.slice(page * perPage, page * perPage + perPage);

  if (!instagramUrl) return null;

  return (
    <section className="py-10 md:py-14 bg-muted/30">
      <div className="container">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Instagram className="h-5 w-5 text-primary" />
            <h2 className="text-lg md:text-xl font-bold text-foreground">Siga-nos no Instagram</h2>
          </div>
          <p className="text-sm text-muted-foreground">Acompanhe nossas novidades e dicas</p>
        </div>

        {/* Carousel */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-2xl mx-auto">
          {visiblePosts.map((post) => (
            <a
              key={post.id}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-xl overflow-hidden group relative"
            >
              <img
                src={post.image}
                alt="Post Instagram"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                <Instagram className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>

        {/* Dots */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2 rounded-full transition-all ${
                  i === page ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-6">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Instagram className="h-4 w-4" />
            Ver no Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
