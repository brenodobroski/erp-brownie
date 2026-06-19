const CACHE_KEY = "brownie:data2";
const URL_KEY = "brownie:sheetUrl";

export function getSheetUrl() {
  return localStorage.getItem(URL_KEY) || "";
}
export function setSheetUrl(url) {
  localStorage.setItem(URL_KEY, url || "");
}

export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

// Puxa do Sheets. Retorna {ok, data} ou {ok:false, error}
export async function pull(url) {
  if (!url) return { ok: false, error: "sem url" };
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const text = await res.text();
    const json = JSON.parse(text);
    if (json.ok && json.data) return { ok: true, data: json.data };
    return { ok: false, error: "resposta inválida" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Empurra o estado completo para o Sheets.
export async function push(url, data) {
  if (!url) return { ok: false, error: "sem url" };
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ data }),
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.ok ? { ok: true } : { ok: false, error: json.error || "erro" };
    } catch {
      return { ok: true }; // algumas respostas vêm sem JSON; consideramos ok
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}