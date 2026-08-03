const KEY = "desec_demo";

export function isDemo() {
  return localStorage.getItem(KEY) === "1";
}
export function enableDemo() {
  localStorage.setItem(KEY, "1");
}
export function disableDemo() {
  localStorage.removeItem(KEY);
}
