"use client";

import dynamic from "next/dynamic";
import { ThemeProvider } from "../src/context/ThemeContext";

const App = dynamic(() => import("../src/App"), {
  ssr: false
});

export default function ClientApp() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
