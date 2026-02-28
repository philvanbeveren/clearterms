export function track(event: string, payload?: any) {
  try {
    const key = "clearterms_events";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({
      event,
      payload,
      at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}
