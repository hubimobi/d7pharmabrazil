import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  /** Target date or hours from now (default: end of today) */
  targetDate?: Date;
  hoursFromNow?: number;
  label?: string;
  className?: string;
}

function getEndOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function CountdownTimer({
  targetDate,
  hoursFromNow,
  label = "Oferta expira em",
  className = "",
}: CountdownTimerProps) {
  const [target] = useState<Date>(() => {
    if (targetDate) return targetDate;
    if (hoursFromNow) return new Date(Date.now() + hoursFromNow * 3600000);
    return getEndOfDay();
  });

  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(target));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className={`flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 ${className}`}>
      <Clock className="h-4 w-4 text-destructive animate-pulse" />
      <span className="text-xs font-medium text-destructive">{label}</span>
      <div className="flex items-center gap-1">
        <TimeBlock value={timeLeft.hours} unit="h" />
        <span className="text-xs font-bold text-destructive">:</span>
        <TimeBlock value={timeLeft.minutes} unit="m" />
        <span className="text-xs font-bold text-destructive">:</span>
        <TimeBlock value={timeLeft.seconds} unit="s" />
      </div>
    </div>
  );
}

function TimeBlock({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex min-w-[28px] items-center justify-center rounded bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground tabular-nums">
      {String(value).padStart(2, "0")}
      <span className="ml-0.5 text-2xs font-normal opacity-80">{unit}</span>
    </span>
  );
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
