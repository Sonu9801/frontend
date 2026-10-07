import { cn } from "@/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface SparklineProps {
  data: number[];
  color?: string;
}

function Sparkline({ data, color = "currentColor" }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      className="opacity-70"
      role="img"
      aria-label="Trend sparkline"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - (1 - t) ** 3;
      setCount(Math.round(ease * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return count;
}

export type TrendDirection = "up" | "down" | "neutral";
export type SemanticColor = "primary" | "success" | "warning" | "destructive" | "neutral";

interface KPICardProps {
  title: string;
  value: number | string;
  subtext?: string;
  description?: string;
  trend?: TrendDirection;
  trendValue?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  accentClass?: string;
  semantic?: SemanticColor;
  icon?: React.ReactNode;
  className?: string;
  "data-ocid"?: string;
}

export function KPICard({
  title,
  value,
  subtext,
  description,
  trend = "neutral",
  trendValue,
  sparklineData,
  sparklineColor,
  accentClass,
  semantic,
  icon,
  className,
  "data-ocid": ocid,
}: KPICardProps) {
  const isNumeric = typeof value === "number";
  const numericCount = useCountUp(isNumeric ? (value as number) : 0);
  const displayValue = isNumeric ? numericCount : value;

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  
  const trendColorClass =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      : trend === "down"
        ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
        : "text-muted-foreground bg-muted";

  const semanticAccentClass =
    semantic === "primary"
      ? "text-primary"
      : semantic === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : semantic === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : semantic === "destructive"
            ? "text-rose-600 dark:text-rose-400"
            : semantic === "neutral"
              ? "text-muted-foreground"
              : accentClass || "text-foreground";

  const helperText = subtext || description;

  return (
    <motion.div
      data-ocid={ocid}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col justify-between gap-2.5 hover:shadow-subtle hover:border-border/80 transition-smooth cursor-default",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center text-muted-foreground flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span
          className={cn(
            "text-2xl sm:text-3xl font-bold font-display tabular-nums tracking-tight",
            semanticAccentClass,
          )}
        >
          {displayValue}
        </span>
        {trendValue && (
          <span
            className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0",
              trendColorClass,
            )}
          >
            <TrendIcon size={12} />
            {trendValue}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 min-h-[16px]">
        {helperText ? (
          <p className="text-[11px] text-muted-foreground truncate leading-tight">
            {helperText}
          </p>
        ) : (
          <div />
        )}
        {sparklineData && sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            color={sparklineColor ?? "oklch(var(--primary))"}
          />
        )}
      </div>
    </motion.div>
  );
}
