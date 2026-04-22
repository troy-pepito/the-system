export const ATMOSPHERE_KEY = "pref:atmosphere";
export const ATMOSPHERE_EVENT = "system:atmosphere-changed";

export function getAtmosphereEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ATMOSPHERE_KEY) !== "off";
}

export function setAtmosphereEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ATMOSPHERE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(ATMOSPHERE_EVENT));
}