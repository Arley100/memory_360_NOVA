"use client";
import { useEffect } from "react";
export function ScrollToMark() {
  useEffect(() => {
    document.querySelector("[data-hit='1']")?.scrollIntoView({ block: "center" });
  }, []);
  return null;
}
