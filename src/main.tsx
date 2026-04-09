import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove inline preloader once React takes over
const inlinePreloader = document.getElementById("inline-preloader");
if (inlinePreloader) {
  inlinePreloader.style.transition = "opacity 0.3s";
  inlinePreloader.style.opacity = "0";
  setTimeout(() => inlinePreloader.remove(), 300);
}

createRoot(document.getElementById("root")!).render(<App />);
