import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/* global document, module, require, HTMLElement */

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

root?.render(<App />);

if ((module as any).hot) {
  (module as any).hot.accept("./App", () => {
    const NextApp = require("./App").default;
    root?.render(<NextApp />);
  });
}
