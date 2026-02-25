import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if (window.innerWidth <= 960) {
  const mobileRoot = document.getElementById("mobile-hero-3d-root");
  if (mobileRoot) {
    import("./components/MobileHero3D").then(({ default: MobileHero3D }) => {
      createRoot(mobileRoot).render(<MobileHero3D />);
    });
  }
}
