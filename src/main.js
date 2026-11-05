import { App } from "./app.js";

const stage = document.getElementById("stage");

// Cheap devices do better with a slightly lighter soft-focus pass.
const deviceMemory = navigator.deviceMemory;
const cores = navigator.hardwareConcurrency;
if ((deviceMemory && deviceMemory <= 4) || (cores && cores <= 4)) {
  document.documentElement.classList.add("low-power");
}

function fitStage() {
  if (!stage) return;
  const height = stage.clientHeight;
  if (height > 0) stage.style.setProperty("--u", `${height / 480}px`);
}

fitStage();
window.addEventListener("resize", fitStage);
window.addEventListener("orientationchange", fitStage);
if (window.ResizeObserver && stage) {
  new ResizeObserver(fitStage).observe(stage);
}

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const app = new App();

// Register the offline cache only after the title (or a direct level) has
// painted. Precache traffic must never compete with the first screen.
const devPwa = new URLSearchParams(location.search).get("pwa") === "1";
const canCache = "serviceWorker" in navigator
  && (location.protocol === "https:" || devPwa)
  && !globalThis.__ONE_AND_ONE_EMBEDDED__;

function registerOfflineCache() {
  if (!canCache || app.ui.screenName === "error") return;
  const register = () => {
    navigator.serviceWorker
      .register(new URL("sw.js", location.href))
      .catch((error) => console.warn("Offline cache is unavailable.", error));
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(register, { timeout: 5000 });
  } else {
    setTimeout(register, 1800);
  }
}

app.boot().then(registerOfflineCache);
