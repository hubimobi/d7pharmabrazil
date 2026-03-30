import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

interface FlashSaleBarProps {
  countdownMode: string;
  countdownEndTime?: string | null;
  countdownEndDate?: string | null;
  countdownDurationMinutes?: number;
  className?: string;
}

function getTargetDate(mode: string, endTime?: string | null, endDate?: string | null, durationMinutes?: number): Date {
  const now = new Date();
  switch (mode) {
    case "daily_until": {
      if (!endTime) return getEndOfDay();
      const [h, m] = endTime.split(":").map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      return target;
    }
    case "specific_datetime":
      return endDate ? new Date(endDate) : getEndOfDay();
    case "after_access": {
      const key = `flash_start_${window.location.pathname}`;
      let start = sessionStorage.getItem(key);
      if (!start) {
        start = String(Date.now());
        sessionStorage.setItem(key, start);
      }
      return new Date(Number(start) + (durationMinutes || 60) * 60000);
    }
    default:
      return getEndOfDay();
  }
}

function getEndOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function calcTimeLeft(target: Date) {
  const total = Math.max(0, target.getTime() - Date.now());
  return {
    total,
    hours: Math.floor(total / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  };
}

export default function FlashSaleBar({ countdownMode, countdownEndTime, countdownEndDate, countdownDurationMinutes, className = "" }: FlashSaleBarProps) {
  const [target] = useState<Date>(() => getTargetDate(countdownMode, countdownEndTime, countdownEndDate, countdownDurationMinutes));
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className={`w-full bg-destructive text-destructive-foreground ${className}`}>
      <div className="container flex items-center justify-center gap-3 py-2">
        <Zap className="h-5 w-5 fill-current animate-pulse" />
        <span className="text-sm font-bold uppercase tracking-wide">Oferta Relâmpago</span>
        <span className="text-sm">Termina em</span>
        <div className="flex items-center gap-1">
          <TimeBlock value={timeLeft.hours} />
          <span className="font-bold">:</span>
          <TimeBlock value={timeLeft.minutes} />
          <span className="font-bold">:</span>
          <TimeBlock value={timeLeft.seconds} />
        </div>
        <Zap className="h-5 w-5 fill-current animate-pulse" />
      </div>
    </div>
  );
}

function TimeBlock({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-[32px] items-center justify-center rounded bg-background text-foreground px-1.5 py-0.5 text-sm font-bold tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
  );
}
