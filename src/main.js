import { App } from "./app.js";

const stage = document.getElementById("stage");

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

const app = new App();
app.boot();
