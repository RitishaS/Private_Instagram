const trimTrailingSlash = (value) => (typeof value === "string" ? value.replace(/\/$/, "") : "");

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_URL || "http://localhost:3000");
export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";
