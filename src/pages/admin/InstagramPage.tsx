import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Instagram, Users, Eye, Heart, MessageCircle, Bookmark, Share2,
  TrendingUp, Search, RefreshCw, ExternalLink, Hash, BarChart3,
  Loader2, Star, CheckCircle, Globe, Image, Film,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface AccountProfile {
  name: string;
  username: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
  website: string;
}

interface AccountInsights {
  follower_count?: number[];
  impressions?: number[];
  reach?: number[];
  profile_views?: number[];
}

interface Post {
  id: string;
  caption?: string;
  media_type: string;
  timestamp: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count: number;
  comments_count: number;
}

interface PostInsights {
  impressions?: number;
  reach?: number;
  saved?: number;
  shares?: number;
  likes?: number;
  comments?: number;
  total_interactions?: number;
  follows?: number;
  profile_visits?: number;
}

interface CompetitorProfile {
  username: string;
  full_name: string;
  biography: string;
  followers: number;
  following: number;
  posts_count: number;
  is_verified: boolean;
  profile_pic_url: string;
  external_url: string;
  avg_likes: number | null;
  avg_comments: number | null;
  engagement_rate: number | null;
  latest_posts: Record<string, unknown>[];
}

interface HashtagPost {
  id: string;
  shortcode: string;
  url: string;
  caption: string;
  likes: number;
  comments: number;
  timestamp: string;
  display_url: string;
  owner_username: string;
  media_type: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function sum(arr: number[] | undefined): number {
  return (arr || []).reduce((a, b) => a + b, 0);
}

function engagementColor(rate: number | null): string {
  if (rate == null) return "text-muted-foreground";
  if (rate >= 5) return "text-green-600";
  if (rate >= 2) return "text-yellow-600";
  return "text-red-500";
}

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-pink-50 text-pink-600">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PostCard({ post, onSelect, selected }: { post: Post; onSelect: () => void; selected: boolean }) {
  const thumb = post.thumbnail_url || post.media_url;
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border overflow-hidden transition-all ${selected ? "ring-2 ring-pink-500 border-pink-400" : "hover:border-pink-300"}`}
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          {post.media_type === "VIDEO" ? <Film className="w-8 h-8 text-muted-foreground" /> : <Image className="w-8 h-8 text-muted-foreground" />}
        </div>
      )}
      <div className="p-2 space-y-1">
        <p className="text-xs text-muted-foreground truncate">{post.caption?.slice(0, 60) || "(sem legenda)"}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(post.like_count)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{fmt(post.comments_count)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function InstagramPage() {
  // Credentials
  const [igToken, setIgToken] = useState("");
  const [igUserId, setIgUserId] = useState("");
  const [apifyToken, setApifyToken] = useState("");

  // My account tab
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [insights, setInsights] = useState<AccountInsights | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postInsights, setPostInsights] = useState<PostInsights | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingPostDetail, setLoadingPostDetail] = useState(false);

  // Competitors tab
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);

  // Hashtag tab
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtagPosts, setHashtagPosts] = useState<HashtagPost[]>([]);
  const [loadingHashtag, setLoadingHashtag] = useState(false);

  async function callFn(fnName: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke(fnName, {
      body,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  }

  // ── My Account ──────────────────────────────────────────────

  async function loadAccount() {
    if (!igToken || !igUserId) { toast.error("Informe o Token e o ID do usuário"); return; }
    setLoadingAccount(true);
    setLoadingPosts(true);
    setProfile(null); setInsights(null); setPosts([]); setSelectedPost(null); setPostInsights(null);
    try {
      const [accData, postsData] = await Promise.all([
        callFn("instagram-insights", { source: "account", access_token: igToken, ig_user_id: igUserId }),
        callFn("instagram-insights", { source: "posts", access_token: igToken, ig_user_id: igUserId }),
      ]);
      setProfile(accData.profile);
      setInsights(accData.insights);
      setPosts(postsData.posts || []);
    } catch (e: unknown) {
      toast.error(`Erro: ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoadingAccount(false);
      setLoadingPosts(false);
    }
  }

  async function loadPostDetail(post: Post) {
    setSelectedPost(post);
    setPostInsights(null);
    setLoadingPostDetail(true);
    try {
      const data = await callFn("instagram-insights", { source: "post_detail", access_token: igToken, media_id: post.id });
      setPostInsights(data.insights);
    } catch (e: unknown) {
      toast.error(`Erro ao carregar insights: ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoadingPostDetail(false);
    }
  }

  // ── Competitors ─────────────────────────────────────────────

  async function loadCompetitors() {
    if (!apifyToken) { toast.error("Informe o Apify Token"); return; }
    const names = competitorInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!names.length) { toast.error("Informe pelo menos um @username"); return; }
    setLoadingCompetitors(true);
    setCompetitors([]);
    try {
      const data = await callFn("instagram-competitor", {
        source: "profiles",
        apify_token: apifyToken,
        usernames: names,
      });
      setCompetitors(data.profiles || []);
      if (!data.profiles?.length) toast.info("Nenhum perfil encontrado");
    } catch (e: unknown) {
      toast.error(`Erro Apify: ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoadingCompetitors(false);
    }
  }

  // ── Hashtag ─────────────────────────────────────────────────

  async function loadHashtag() {
    if (!apifyToken) { toast.error("Informe o Apify Token"); return; }
    if (!hashtagInput.trim()) { toast.error("Informe uma hashtag"); return; }
    setLoadingHashtag(true);
    setHashtagPosts([]);
    try {
      const tag = hashtagInput.trim().replace(/^#/, "");
      const data = await callFn("instagram-competitor", {
        source: "hashtag",
        apify_token: apifyToken,
        hashtags: [tag],
        results_limit: 20,
      });
      setHashtagPosts(data.posts || []);
      if (!data.posts?.length) toast.info("Nenhum post encontrado para essa hashtag");
    } catch (e: unknown) {
      toast.error(`Erro Apify: ${e instanceof Error ? e.message : e}`);
    } finally {
      setLoadingHashtag(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
          <Instagram className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Instagram Analytics</h1>
          <p className="text-sm text-muted-foreground">Analytics da sua conta + pesquisa de concorrentes</p>
        </div>
      </div>

      {/* Credentials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Credenciais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Instagram Access Token <span className="text-pink-500">*</span></Label>
            <Input
              type="password"
              placeholder="IGQVJ..."
              value={igToken}
              onChange={e => setIgToken(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Graph API — Meta for Developers</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Instagram User ID <span className="text-pink-500">*</span></Label>
            <Input
              placeholder="17841400..."
              value={igUserId}
              onChange={e => setIgUserId(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Necessário para sua conta</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Apify Token</Label>
            <Input
              type="password"
              placeholder="apify_api_..."
              value={apifyToken}
              onChange={e => setApifyToken(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Necessário para concorrentes e hashtags</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="account">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="account">Minha Conta</TabsTrigger>
          <TabsTrigger value="competitors">Concorrentes</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
        </TabsList>

        {/* ── Minha Conta ──────────────────────────────────── */}
        <TabsContent value="account" className="space-y-4 mt-4">
          <Button onClick={loadAccount} disabled={loadingAccount || loadingPosts} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            {(loadingAccount || loadingPosts) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Carregar Dados da Conta
          </Button>

          {profile && (
            <>
              {/* Profile header */}
              <Card>
                <CardContent className="p-4 flex gap-4 items-start">
                  {profile.profile_picture_url && (
                    <img src={profile.profile_picture_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-pink-300" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg">{profile.name}</h2>
                      <span className="text-muted-foreground text-sm">@{profile.username}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.biography}</p>
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" />{profile.website}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Users className="w-4 h-4" />} label="Seguidores" value={fmt(profile.followers_count)} />
                <StatCard icon={<Heart className="w-4 h-4" />} label="Seguindo" value={fmt(profile.follows_count)} />
                <StatCard icon={<Image className="w-4 h-4" />} label="Posts" value={fmt(profile.media_count)} />
                {insights && (
                  <StatCard icon={<Eye className="w-4 h-4" />} label="Alcance (30d)" value={fmt(sum(insights.reach))} sub="soma dos últimos 30 dias" />
                )}
              </div>

              {insights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Impressões (30d)" value={fmt(sum(insights.impressions))} />
                  <StatCard icon={<Eye className="w-4 h-4" />} label="Visitas ao Perfil (30d)" value={fmt(sum(insights.profile_views))} />
                  <StatCard icon={<Users className="w-4 h-4" />} label="Novos Seguidores (30d)" value={fmt(sum(insights.follower_count))} />
                </div>
              )}

              <Separator />

              {/* Posts grid */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-500" />
                  Posts recentes — clique para ver insights
                </h3>
                {loadingPosts ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {posts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        selected={selectedPost?.id === post.id}
                        onSelect={() => loadPostDetail(post)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Post detail */}
              {selectedPost && (
                <Card className="border-pink-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-pink-500" />
                      Insights do post selecionado
                      {loadingPostDetail && <Loader2 className="w-3 h-3 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{selectedPost.caption || "(sem legenda)"}</p>
                    {postInsights && (
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {[
                          { icon: <Eye className="w-3 h-3" />, label: "Alcance", value: postInsights.reach },
                          { icon: <TrendingUp className="w-3 h-3" />, label: "Impressões", value: postInsights.impressions },
                          { icon: <Heart className="w-3 h-3" />, label: "Curtidas", value: postInsights.likes },
                          { icon: <MessageCircle className="w-3 h-3" />, label: "Comentários", value: postInsights.comments },
                          { icon: <Bookmark className="w-3 h-3" />, label: "Salvamentos", value: postInsights.saved },
                          { icon: <Share2 className="w-3 h-3" />, label: "Compartilhamentos", value: postInsights.shares },
                          { icon: <Users className="w-3 h-3" />, label: "Novos seguidores", value: postInsights.follows },
                          { icon: <Eye className="w-3 h-3" />, label: "Visitas ao perfil", value: postInsights.profile_visits },
                          { icon: <Star className="w-3 h-3" />, label: "Interações totais", value: postInsights.total_interactions },
                        ].map(({ icon, label, value }) => (
                          <div key={label} className="bg-muted/50 rounded-lg p-2 text-center">
                            <div className="flex items-center justify-center gap-1 text-pink-500 mb-1">{icon}</div>
                            <p className="text-base font-bold">{fmt(value)}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Concorrentes ─────────────────────────────────── */}
        <TabsContent value="competitors" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Analise perfis públicos de concorrentes. Informe os @usernames (um por linha ou separados por vírgula).
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Usernames dos concorrentes</Label>
                <textarea
                  className="w-full border rounded-md text-sm p-2 min-h-[80px] font-mono resize-none focus:outline-none focus:ring-1 focus:ring-pink-400"
                  placeholder={"@farmaciaexemplo\n@outraplataforma\nconcorrente3"}
                  value={competitorInput}
                  onChange={e => setCompetitorInput(e.target.value)}
                />
              </div>
              <Button onClick={loadCompetitors} disabled={loadingCompetitors || !apifyToken} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                {loadingCompetitors ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Analisar Perfis
              </Button>
              {!apifyToken && <p className="text-xs text-amber-600">⚠ Informe o Apify Token nas credenciais acima</p>}
            </CardContent>
          </Card>

          {loadingCompetitors && (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <p className="text-sm">Buscando dados via Apify... pode levar até 90 segundos</p>
            </div>
          )}

          {competitors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitors.map(c => (
                <Card key={c.username} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {c.profile_pic_url ? (
                        <img src={c.profile_pic_url} alt="" className="w-12 h-12 rounded-full object-cover border" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {c.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">@{c.username}</span>
                          {c.is_verified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                        </div>
                        {c.full_name && <p className="text-sm text-muted-foreground">{c.full_name}</p>}
                        {c.external_url && (
                          <a href={c.external_url} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 flex items-center gap-1">
                            <Globe className="w-3 h-3" />{c.external_url.slice(0, 40)}
                          </a>
                        )}
                      </div>
                      <a
                        href={`https://instagram.com/${c.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-pink-500"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {c.biography && (
                      <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-pink-200 pl-2">{c.biography}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="font-bold">{fmt(c.followers)}</p>
                        <p className="text-[10px] text-muted-foreground">Seguidores</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="font-bold">{fmt(c.posts_count)}</p>
                        <p className="text-[10px] text-muted-foreground">Posts</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className={`font-bold ${engagementColor(c.engagement_rate)}`}>
                          {c.engagement_rate != null ? `${c.engagement_rate.toFixed(1)}%` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Engajamento</p>
                      </div>
                    </div>

                    {(c.avg_likes != null || c.avg_comments != null) && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {c.avg_likes != null && (
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{fmt(c.avg_likes)} likes/post</span>
                        )}
                        {c.avg_comments != null && (
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{fmt(c.avg_comments)} coment./post</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Hashtags ─────────────────────────────────────── */}
        <TabsContent value="hashtags" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Monitore os posts mais recentes de uma hashtag. Útil para acompanhar tendências do setor.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="farmacia, manipulacao, suplementos..."
                    value={hashtagInput}
                    onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadHashtag()}
                  />
                </div>
                <Button onClick={loadHashtag} disabled={loadingHashtag || !apifyToken} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  {loadingHashtag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {!apifyToken && <p className="text-xs text-amber-600">⚠ Informe o Apify Token nas credenciais acima</p>}
            </CardContent>
          </Card>

          {loadingHashtag && (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <p className="text-sm">Buscando posts via Apify... pode levar até 90 segundos</p>
            </div>
          )}

          {hashtagPosts.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">{hashtagPosts.length} posts encontrados para <strong>#{hashtagInput.replace(/^#/, "")}</strong></p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {hashtagPosts.map(post => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-lg border overflow-hidden hover:border-pink-300 transition-colors"
                  >
                    {post.display_url ? (
                      <img src={post.display_url} alt="" className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <Hash className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">@{post.owner_username}</p>
                      <p className="text-xs text-muted-foreground truncate">{post.caption || "(sem legenda)"}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{fmt(post.likes)}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{fmt(post.comments)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
