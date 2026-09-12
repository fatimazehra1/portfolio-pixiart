"use client";

import { useEffect } from "react";

export default function RemoveNetlifyBadge() {
  useEffect(() => {
    const removeBadge = () => {
      document.getElementById("nl-badge-frame")?.remove();
    };

    removeBadge();

    const observer = new MutationObserver(removeBadge);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}