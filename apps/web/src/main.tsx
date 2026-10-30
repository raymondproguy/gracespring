import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APP_NAME } from "@gracespring/shared";
import "./style.css";

function App() {
  return (
    <main>
      <p className="eyebrow">Welcome</p>
      <h1>{APP_NAME}</h1>
      <p>The GraceSpring web app is being prepared.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
