import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import OriginalSite from "./OriginalSite";
const Admin = lazy(async () => {
  await import("./styles.css");
  return import("./Admin");
});
createRoot(document.getElementById("root")).render(
  window.location.pathname.startsWith("/admin") ? (
    <BrowserRouter>
      <Suspense fallback={<p>Loading admin…</p>}>
        <Admin />
      </Suspense>
    </BrowserRouter>
  ) : (
    <OriginalSite />
  ),
);
