import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// useful foor debugging Suspense and loading states
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
