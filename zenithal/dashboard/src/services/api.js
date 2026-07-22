import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const WS_BASE = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000";

const KEY_STORAGE = "zenithal_api_key";

// The Login page writes a key here at runtime (a build-time VITE_API_KEY is
// still honored as a fallback for the extension/dev workflows). Read fresh on
// every request via an interceptor so Login can take effect without reload.
export const getStoredKey = () => localStorage.getItem(KEY_STORAGE) || "";
export const setStoredKey = (key) => {
  if (key) localStorage.setItem(KEY_STORAGE, key);
  else localStorage.removeItem(KEY_STORAGE);
};

const client = axios.create({ baseURL: API_BASE, timeout: 30000 });

client.interceptors.request.use((config) => {
  const key = getStoredKey() || import.meta.env.VITE_API_KEY || "";
  if (key) config.headers["X-API-Key"] = key;
  return config;
});

export const analyzeUrl = (url) =>
  client.post("/api/v1/analyze/url", { url }).then((r) => r.data);

export const analyzeUrls = (urls) =>
  client.post("/api/v1/analyze/urls", { urls }).then((r) => r.data);

export const analyzeMessage = (text, sender) =>
  client.post("/api/v1/analyze/message", { text, sender }).then((r) => r.data);

export const analyzeLogFile = (file) => {
  const form = new FormData();
  form.append("file", file);
  return client.post("/api/v1/analyze/logfile", form).then((r) => r.data);
};

export const analyzeLogText = (text) =>
  client.post("/api/v1/analyze/logtext", { text }).then((r) => r.data);

export const getStats = () =>
  client.get("/api/v1/dashboard/stats").then((r) => r.data);

export const getDetections = (limit = 100) =>
  client.get(`/api/v1/dashboard/detections?limit=${limit}`).then((r) => r.data);

export const getAttackers = (limit = 25) =>
  client.get(`/api/v1/dashboard/attackers?limit=${limit}`).then((r) => r.data);

export const getHealth = () =>
  client.get("/api/v1/health").then((r) => r.data);

export const getAnalystReport = (detection) =>
  client.post("/api/v1/analyst", { detection }).then((r) => r.data);

// Login flow: probes whether the backend actually enforces API keys (per
// /health's `auth` field) and, if so, verifies the given key against a real
// guarded endpoint. If auth is open, any/no key is accepted — matches the
// backend's own "no key? runs open by default" behavior (see PRODUCTION.md).
export const verifyAccess = async (key) => {
  const health = await getHealth();
  if (health.auth !== "required") return { ok: true, open: true, health };
  const prevKey = getStoredKey();
  setStoredKey(key);
  try {
    await client.get(`/api/v1/ip/127.0.0.1`);
    return { ok: true, open: false, health };
  } catch (e) {
    if (e?.response?.status === 401) {
      setStoredKey(prevKey);
      return { ok: false, open: false, health };
    }
    // Non-auth failure (network etc.) — don't block login on it.
    return { ok: true, open: false, health };
  }
};
