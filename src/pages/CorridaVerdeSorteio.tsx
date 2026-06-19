import { useState, useCallback, useRef, useEffect } from "react";
import { Trophy, Medal, Award, Users, Upload, ChevronDown, ChevronUp, RotateCcw, Star, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Brand constants ───────────────────────────────────────────────
const PINK = "#EC1B82";
const DARK_BG = "#050505";
const CARD_BG = "#111111";
const CARD_BORDER = "#222222";

// ─── Prize definitions ─────────────────────────────────────────────
const PRIZES = [
  {
    position: 1,
    label: "1º PRÊMIO",
    sponsor: "R Gubert Construtora",
    icon: Trophy,
    borderColor: "#FFD700",
    glowColor: "rgba(255,215,0,0.35)",
    badgeColor: "#FFD700",
  },
  {
    position: 2,
    label: "2º PRÊMIO",
    sponsor: "Remax Imóveis",
    icon: Medal,
    borderColor: "#C0C0C0",
    glowColor: "rgba(192,192,192,0.3)",
    badgeColor: "#C0C0C0",
  },
  {
    position: 3,
    label: "3º PRÊMIO",
    sponsor: "NOW Residence",
    icon: Award,
    borderColor: "#CD7F32",
    glowColor: "rgba(205,127,50,0.3)",
    badgeColor: "#CD7F32",
  },
] as const;

// ─── Types ─────────────────────────────────────────────────────────
interface Participant {
  id: string;
  name: string;
  phone?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────
function parseParticipants(text: string): Participant[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      // Support "Name;Phone" or "Name,Phone" or just "Name"
      const parts = line.split(/[;,]/).map((s) => s.trim());
      return { id: `p-${i}-${Date.now()}`, name: parts[0], phone: parts[1] };
    })
    .filter((p) => p.name.length > 0);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Logo components ───────────────────────────────────────────────
function NowResidenceLogo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", fontFamily: "sans-serif" }}>
        NO<span style={{ color: PINK }}>W</span>
      </span>
      <span style={{ fontSize: 8, letterSpacing: "0.25em", color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginTop: 1 }}>
        RESIDENCE
      </span>
      <span style={{ fontSize: 7, letterSpacing: "0.15em", color: "#666", textTransform: "uppercase", marginTop: 1 }}>
        VIVA O AGORA!
      </span>
    </div>
  );
}

function RemaxLogo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#cc0000", letterSpacing: "-0.02em" }}>RE</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#003da5", letterSpacing: "-0.02em" }}>/</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: "#cc0000", letterSpacing: "-0.02em" }}>MAX</span>
      </div>
      <span style={{ fontSize: 7, letterSpacing: "0.18em", color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>
        IMÓVEIS
      </span>
      <span style={{ fontSize: 6, letterSpacing: "0.12em", color: "#666", marginTop: 1 }}>
        Dream On I
      </span>
    </div>
  );
}

function RGubertLogo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>R GUBERT</span>
      <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>
        CONSTRUTORA
      </span>
    </div>
  );
}

// ─── Prize card ────────────────────────────────────────────────────
interface PrizeCardProps {
  prize: (typeof PRIZES)[number];
  displayName: string;
  winner: Participant | null;
  spinning: boolean;
  active: boolean; // currently being drawn
}

function PrizeCard({ prize, displayName, winner, spinning, active }: PrizeCardProps) {
  const Icon = prize.icon;
  const isWon = !!winner;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `2px solid ${isWon ? prize.borderColor : active ? PINK : CARD_BORDER}`,
        borderRadius: 16,
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 240,
        maxWidth: 340,
        boxShadow: isWon
          ? `0 0 32px ${prize.glowColor}, 0 0 8px ${prize.glowColor}`
          : active
          ? `0 0 20px rgba(236,27,130,0.25)`
          : "none",
        transition: "all 0.4s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Position badge */}
      <div
        style={{
          position: "absolute",
          top: -1,
          left: -1,
          background: isWon ? prize.badgeColor : active ? PINK : "#333",
          color: isWon ? "#000" : "#fff",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          padding: "4px 12px",
          borderRadius: "14px 0 12px 0",
          transition: "all 0.4s ease",
        }}
      >
        {prize.label}
      </div>

      {/* Icon */}
      <div style={{ marginTop: 18 }}>
        <Icon
          size={32}
          style={{
            color: isWon ? prize.borderColor : active ? PINK : "#444",
            transition: "color 0.4s ease",
            filter: isWon ? `drop-shadow(0 0 8px ${prize.borderColor})` : "none",
          }}
        />
      </div>

      {/* Sponsor */}
      <div
        style={{
          fontSize: 12,
          color: "#777",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {prize.sponsor}
      </div>

      {/* Slot display */}
      <div
        style={{
          background: "#0a0a0a",
          border: `1px solid ${active ? PINK : isWon ? prize.borderColor : "#2a2a2a"}`,
          borderRadius: 10,
          padding: "14px 16px",
          width: "100%",
          minHeight: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 0.3s ease",
          boxShadow: spinning ? `inset 0 0 16px rgba(236,27,130,0.15)` : "none",
        }}
      >
        {/* Scanlines effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 3px,
              rgba(0,0,0,0.06) 3px,
              rgba(0,0,0,0.06) 4px
            )`,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div
          style={{
            textAlign: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          {winner ? (
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: prize.borderColor,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                  textShadow: `0 0 12px ${prize.glowColor}`,
                  animation: "winnerReveal 0.5s ease-out forwards",
                }}
              >
                {winner.name}
              </div>
              {winner.phone && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{winner.phone}</div>
              )}
            </div>
          ) : spinning || (active && displayName) ? (
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: PINK,
                letterSpacing: "0.02em",
                filter: spinning ? "blur(0.5px)" : "none",
                transition: "filter 0.1s",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 200,
              }}
            >
              {displayName || "..."}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#333", letterSpacing: "0.05em", fontWeight: 500 }}>
              {active ? "Pronto para sortear" : "Aguardando..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GHL fetch ─────────────────────────────────────────────────────
type GhlStatus = "idle" | "loading" | "success" | "error" | "unauth";

// ─── Main page ─────────────────────────────────────────────────────
export default function CorridaVerdeSorteio() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<(Participant | null)[]>([null, null, null]);
  const [displayNames, setDisplayNames] = useState<string[]>(["", "", ""]);
  const [spinningIdx, setSpinningIdx] = useState<number>(-1);
  const [currentPrize, setCurrentPrize] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [ghlStatus, setGhlStatus] = useState<GhlStatus>("idle");
  const [ghlError, setGhlError] = useState("");
  const [ghlTag, setGhlTag] = useState("corrida-verde");
  const [ghlTotal, setGhlTotal] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drawnIds = winners.filter(Boolean).map((w) => w!.id);
  const available = participants.filter((p) => !drawnIds.includes(p.id));
  const allDone = currentPrize >= 3;

  // Confetti particles
  const [confettiParticles] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: [PINK, "#FFD700", "#fff", "#EC1B82", "#ff6b6b", "#4fc3f7"][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 6,
    }))
  );

  const handleImport = useCallback(() => {
    const parsed = parseParticipants(importText);
    if (parsed.length === 0) {
      setImportError("Nenhum participante encontrado. Digite um nome por linha.");
      return;
    }
    setParticipants(parsed);
    setImportError("");
    setShowImport(false);
    setWinners([null, null, null]);
    setCurrentPrize(0);
    setDisplayNames(["", "", ""]);
    setShowConfetti(false);
  }, [importText]);

  const handleGhlFetch = useCallback(async () => {
    setGhlStatus("loading");
    setGhlError("");
    try {
      const { data, error } = await supabase.functions.invoke("corrida-verde-contacts", {
        method: "POST",
        body: { tag: ghlTag || "corrida-verde" },
      });

      if (error) {
        const msg: string = error.message || String(error);
        if (msg.includes("401") || msg.toLowerCase().includes("autorizado") || msg.toLowerCase().includes("unauthorized")) {
          setGhlStatus("unauth");
          setGhlError("Faça login como admin para buscar participantes do GHL.");
        } else {
          setGhlStatus("error");
          setGhlError(msg);
        }
        return;
      }

      if (data?.error) {
        const msg: string = data.error;
        if (msg.toLowerCase().includes("autorizado") || msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
          setGhlStatus("unauth");
          setGhlError("Faça login como admin para buscar participantes do GHL.");
        } else {
          setGhlStatus("error");
          setGhlError(msg);
        }
        return;
      }

      const list: Participant[] = (data?.participants ?? []).map((p: { id: string; name: string; phone?: string; email?: string }) => ({
        id: p.id,
        name: p.name,
        phone: p.phone || p.email || "",
      }));

      if (list.length === 0) {
        setGhlStatus("error");
        setGhlError(`Nenhum contato encontrado com a tag "${ghlTag || "corrida-verde"}". Verifique a tag no GHL.`);
        return;
      }

      setParticipants(list);
      setGhlTotal(data.total);
      setGhlStatus("success");
      setWinners([null, null, null]);
      setCurrentPrize(0);
      setDisplayNames(["", "", ""]);
      setShowConfetti(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGhlStatus("error");
      setGhlError(msg);
    }
  }, [ghlTag]);

  const runDraw = useCallback(() => {
    if (isDrawing || available.length === 0 || currentPrize >= 3) return;
    const prizeIdx = currentPrize;
    setIsDrawing(true);
    setSpinningIdx(prizeIdx);

    const winner = pickRandom(available);
    let step = 0;
    const totalSteps = 80;
    let delay = 35;

    const animate = () => {
      const random = pickRandom(available);
      setDisplayNames((prev) => {
        const n = [...prev];
        n[prizeIdx] = random.name;
        return n;
      });
      step++;

      if (step < totalSteps) {
        // Gradual slowdown after step 50
        if (step > 50) {
          delay = Math.min(delay * 1.12, 400);
        }
        intervalRef.current = setTimeout(animate, delay);
      } else {
        // Reveal winner
        setDisplayNames((prev) => {
          const n = [...prev];
          n[prizeIdx] = winner.name;
          return n;
        });
        setTimeout(() => {
          setWinners((prev) => {
            const n = [...prev];
            n[prizeIdx] = winner;
            return n;
          });
          setSpinningIdx(-1);
          setIsDrawing(false);
          setCurrentPrize((prev) => {
            const next = prev + 1;
            if (next >= 3) {
              setTimeout(() => setShowConfetti(true), 300);
            }
            return next;
          });
        }, 200);
      }
    };

    animate();
  }, [isDrawing, available, currentPrize]);

  const handleReset = useCallback(() => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    setWinners([null, null, null]);
    setDisplayNames(["", "", ""]);
    setCurrentPrize(0);
    setSpinningIdx(-1);
    setIsDrawing(false);
    setShowConfetti(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: DARK_BG,
        color: "#fff",
        fontFamily: "'Inter', 'Space Grotesk', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── CSS animations ── */}
      <style>{`
        @keyframes winnerReveal {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulsePink {
          0%, 100% { box-shadow: 0 0 0 0 rgba(236,27,130,0.5); }
          50%       { box-shadow: 0 0 0 12px rgba(236,27,130,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .draw-btn {
          animation: pulsePink 2s infinite;
          transition: transform 0.15s, opacity 0.15s;
        }
        .draw-btn:hover:not(:disabled) { transform: scale(1.03); }
        .draw-btn:active:not(:disabled) { transform: scale(0.97); }
        .draw-btn:disabled { opacity: 0.5; cursor: not-allowed; animation: none; }
        .card-anim { animation: fadeInUp 0.6s ease-out both; }
      `}</style>

      {/* ── Confetti ── */}
      {showConfetti &&
        confettiParticles.map((p) => (
          <div
            key={p.id}
            style={{
              position: "fixed",
              top: 0,
              left: `${p.x}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: 2,
              animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
              pointerEvents: "none",
              zIndex: 9999,
            }}
          />
        ))}

      {/* ── Header pink banner ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PINK} 0%, #c41568 100%)`,
          padding: "10px 24px",
          textAlign: "center",
          letterSpacing: "0.18em",
          fontWeight: 800,
          fontSize: 13,
          textTransform: "uppercase",
          color: "#fff",
          boxShadow: `0 4px 20px rgba(236,27,130,0.5)`,
        }}
      >
        CADASTRE E CONCORRA · CORRIDA VERDE BLUMENAU
      </div>

      {/* ── Logos row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: "24px 24px 16px",
          borderBottom: `1px solid #1a1a1a`,
          flexWrap: "wrap",
        }}
      >
        <NowResidenceLogo />
        <div style={{ width: 1, height: 40, background: "#2a2a2a" }} />
        <RGubertLogo />
        <div style={{ width: 1, height: 40, background: "#2a2a2a" }} />
        <RemaxLogo />
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* Event title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            SORTEIO{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${PINK}, #ff6bb5)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AO VIVO
            </span>
          </h1>
          <p style={{ color: "#555", fontSize: 14, marginTop: 8, letterSpacing: "0.08em" }}>
            CORRIDA VERDE · BLUMENAU, SC
          </p>
        </div>

        {/* Participants count */}
        {participants.length > 0 && (
          <div
            className="card-anim"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#111",
              border: `1px solid #222`,
              borderRadius: 12,
              padding: "12px 24px",
              marginBottom: 32,
              width: "fit-content",
              margin: "0 auto 32px",
            }}
          >
            <Users size={18} style={{ color: PINK }} />
            <span style={{ fontSize: 14, color: "#aaa" }}>Total de participantes:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
              {participants.length.toLocaleString("pt-BR")}
            </span>
            {available.length < participants.length && (
              <span style={{ fontSize: 12, color: "#555", marginLeft: 4 }}>
                ({available.length} disponíveis)
              </span>
            )}
          </div>
        )}

        {/* ── Prize cards grid ── */}
        <div
          style={{
            display: "flex",
            gap: 20,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          {PRIZES.map((prize, idx) => (
            <div
              key={prize.position}
              className="card-anim"
              style={{ animationDelay: `${idx * 0.12}s` }}
            >
              <PrizeCard
                prize={prize}
                displayName={displayNames[idx]}
                winner={winners[idx]}
                spinning={spinningIdx === idx}
                active={currentPrize === idx && participants.length > 0}
              />
            </div>
          ))}
        </div>

        {/* ── Draw button ── */}
        {participants.length > 0 && !allDone && (
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <button
              className="draw-btn"
              onClick={runDraw}
              disabled={isDrawing || available.length === 0}
              style={{
                background: `linear-gradient(135deg, ${PINK} 0%, #c41568 100%)`,
                color: "#fff",
                border: "none",
                borderRadius: 50,
                padding: "18px 56px",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {isDrawing
                ? "SORTEANDO..."
                : `SORTEAR ${PRIZES[currentPrize]?.label || ""}`}
            </button>
            {available.length === 0 && participants.length > 0 && (
              <p style={{ color: "#555", fontSize: 13, marginTop: 10 }}>
                Todos os participantes já foram sorteados.
              </p>
            )}
          </div>
        )}

        {/* ── All done celebration ── */}
        {allDone && (
          <div
            className="card-anim"
            style={{ textAlign: "center", marginBottom: 32 }}
          >
            <div
              style={{
                background: "#111",
                border: `2px solid ${PINK}`,
                borderRadius: 16,
                padding: "24px 32px",
                display: "inline-block",
                boxShadow: `0 0 40px rgba(236,27,130,0.3)`,
              }}
            >
              <Star size={32} style={{ color: PINK, marginBottom: 10 }} />
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  color: PINK,
                  marginBottom: 4,
                }}
              >
                SORTEIO CONCLUÍDO!
              </div>
              <p style={{ color: "#777", fontSize: 14, margin: 0 }}>
                Parabéns a todos os vencedores!
              </p>
            </div>
          </div>
        )}

        {/* ── Reset button (after done) ── */}
        {(allDone || winners.some(Boolean)) && (
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <button
              onClick={handleReset}
              style={{
                background: "transparent",
                color: "#555",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={14} />
              Reiniciar sorteio
            </button>
          </div>
        )}

        {/* ── GHL integration card ── */}
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${ghlStatus === "success" ? "#22c55e55" : ghlStatus === "error" || ghlStatus === "unauth" ? "#ef444455" : CARD_BORDER}`,
            borderRadius: 16,
            padding: "20px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                background: ghlStatus === "success" ? "#22c55e22" : "#ffffff0a",
                border: `1px solid ${ghlStatus === "success" ? "#22c55e" : "#333"}`,
                borderRadius: 8,
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {ghlStatus === "success" ? (
                <Wifi size={13} style={{ color: "#22c55e" }} />
              ) : (
                <WifiOff size={13} style={{ color: "#666" }} />
              )}
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: ghlStatus === "success" ? "#22c55e" : "#666" }}>
                GO HIGH LEVEL
              </span>
            </div>
            {ghlStatus === "success" && ghlTotal !== null && (
              <span style={{ fontSize: 12, color: "#22c55e" }}>
                {ghlTotal.toLocaleString("pt-BR")} participantes carregados
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: "#666", margin: "0 0 14px", lineHeight: 1.5 }}>
            Busca automaticamente os cadastrados no evento com a tag GHL.
            Verifique que os contatos no GHL possuem a tag abaixo.
          </p>

          {/* Tag + button row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap" }}>Tag GHL:</span>
              <input
                value={ghlTag}
                onChange={(e) => setGhlTag(e.target.value)}
                placeholder="corrida-verde"
                style={{
                  flex: 1,
                  background: "#0a0a0a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 6,
                  color: "#fff",
                  padding: "6px 10px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
            </div>

            <button
              onClick={handleGhlFetch}
              disabled={ghlStatus === "loading"}
              style={{
                background: ghlStatus === "loading" ? "#222" : PINK,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: ghlStatus === "loading" ? "not-allowed" : "pointer",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: ghlStatus === "loading" ? "spin 0.8s linear infinite" : "none",
                }}
              />
              {ghlStatus === "loading" ? "BUSCANDO..." : "BUSCAR DO GHL"}
            </button>
          </div>

          {/* Error / unauth message */}
          {(ghlStatus === "error" || ghlStatus === "unauth") && (
            <div
              style={{
                marginTop: 12,
                background: "#ef444411",
                border: "1px solid #ef444433",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#fca5a5",
                lineHeight: 1.5,
              }}
            >
              {ghlStatus === "unauth" ? (
                <>
                  Acesso negado.{" "}
                  <a href="/login" style={{ color: PINK, textDecoration: "underline" }}>
                    Faça login como admin
                  </a>{" "}
                  para buscar do GHL.
                </>
              ) : (
                ghlError
              )}
            </div>
          )}

          {/* Success refresh note */}
          {ghlStatus === "success" && (
            <p style={{ fontSize: 11, color: "#22c55e99", margin: "10px 0 0", lineHeight: 1.4 }}>
              Lista sincronizada. Clique novamente em "Buscar do GHL" para atualizar antes do sorteio.
            </p>
          )}
        </div>

        {/* ── Import participants section ── */}
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Toggle header */}
          <button
            onClick={() => setShowImport((v) => !v)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#fff",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Upload size={16} style={{ color: PINK }} />
              IMPORTAR PARTICIPANTES
            </span>
            {showImport ? (
              <ChevronUp size={18} style={{ color: "#555" }} />
            ) : (
              <ChevronDown size={18} style={{ color: "#555" }} />
            )}
          </button>

          {showImport && (
            <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${CARD_BORDER}` }}>
              <p style={{ color: "#666", fontSize: 13, margin: "14px 0 10px", lineHeight: 1.6 }}>
                Cole a lista de participantes abaixo — um por linha. Formato aceito:
                <br />
                <code style={{ color: PINK, fontSize: 12 }}>Nome Completo</code> ou{" "}
                <code style={{ color: PINK, fontSize: 12 }}>Nome Completo;Telefone</code>
              </p>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"João Silva\nMaria Oliveira;(47) 99999-0000\nCarlos Souza"}
                rows={10}
                style={{
                  width: "100%",
                  background: "#0a0a0a",
                  border: `1px solid #2a2a2a`,
                  borderRadius: 8,
                  color: "#fff",
                  padding: "12px 14px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {importError && (
                <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{importError}</p>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <span style={{ color: "#555", fontSize: 13 }}>
                  {importText.trim()
                    ? `${parseParticipants(importText).length} participante(s) detectado(s)`
                    : "Nenhum participante ainda"}
                </span>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  style={{
                    background: importText.trim() ? PINK : "#333",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: importText.trim() ? "pointer" : "not-allowed",
                    letterSpacing: "0.06em",
                    transition: "background 0.2s",
                  }}
                >
                  CARREGAR LISTA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* No participants yet */}
        {participants.length === 0 && !showImport && (
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <div style={{ color: "#333", fontSize: 48, marginBottom: 16 }}>🏃</div>
            <p style={{ color: "#555", fontSize: 15, marginBottom: 20 }}>
              Importe a lista de participantes para iniciar o sorteio
            </p>
            <button
              onClick={() => setShowImport(true)}
              style={{
                background: PINK,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.08em",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Upload size={16} />
              IMPORTAR PARTICIPANTES
            </button>
            <p style={{ color: "#333", fontSize: 12, marginTop: 16 }}>
              Link de cadastro:{" "}
              <a
                href="https://corrida.nowresidence.com.br"
                target="_blank"
                rel="noreferrer"
                style={{ color: PINK }}
              >
                corrida.nowresidence.com.br
              </a>
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: "1px solid #111",
          padding: "16px 24px",
          textAlign: "center",
          color: "#2a2a2a",
          fontSize: 11,
          letterSpacing: "0.1em",
        }}
      >
        CORRIDA VERDE · BLUMENAU · R GUBERT CONSTRUTORA · REMAX IMÓVEIS · NOW RESIDENCE
      </div>
    </div>
  );
}
