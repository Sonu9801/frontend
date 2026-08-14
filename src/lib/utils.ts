import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function parseUTCDate(timestamp: string | Date | undefined | null): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  const str = String(timestamp);
  const formattedStr =
    str.endsWith("Z") || str.includes("+") || (str.includes("-") && str.indexOf("-", 10) > 0)
      ? str
      : `${str}Z`;
  return new Date(formattedStr);
}
