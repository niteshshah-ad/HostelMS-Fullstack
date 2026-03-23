const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export const getApiUrl = (path = "") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const getStaticAssetUrl = (assetPath = "") => {
  if (!assetPath || typeof assetPath !== "string") return "";
  if (
    assetPath.startsWith("http://") ||
    assetPath.startsWith("https://") ||
    assetPath.startsWith("blob:") ||
    assetPath.startsWith("data:")
  ) {
    return assetPath;
  }

  return getApiUrl(`/static/uploads/${assetPath}`);
};
