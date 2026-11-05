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

// Keep an offline-capable copy of the site after the first visit. Registration
// is deliberately delayed so the title screen is never competing with a
// multi-megabyte background cache fill. The self-contained file has no SW.
const devPwa = new URLSearchParams(location.search).get("pwa") === "1";
if ("serviceWorker" in navigator
  && (location.protocol === "https:" || devPwa)
  && !globalThis.__ONE_AND_ONE_EMBEDDED__) {
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

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const app = new App();
app.boot();
