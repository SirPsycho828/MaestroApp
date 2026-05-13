import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

// Console branding
if (typeof window !== "undefined") {
  console.log(
    "%c" +
      [
        " _____ _   _ _   _ _____ _____ _____ _     ___ ___  ",
        "|_   _| | | | \\ | | ____|  ___/  _  | |   |_ _/ _ \\ ",
        "  | | | | | |  \\| |  _| | |_  | | | | |    | | | | |",
        "  | | | |_| | |\\  | |___|  _| | |_| | |___ | | |_| |",
        "  |_|  \\___/|_| \\_|_____|_|    \\___/|_____|___\\___/ ",
      ].join("\n"),
    "color: #C19A4B; font-family: monospace; font-size: 12px; line-height: 1.2;"
  );
  console.log(
    "%cEvery great performance starts with the right preparation.",
    "color: #8B7A66; font-size: 12px; font-style: italic;"
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <App />
    </ThemeProvider>
  </StrictMode>
);
