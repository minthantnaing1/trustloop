"use client";

import { useEffect, useState } from "react";

function formatCountdown(target, nowTs) {
  if (!target) return "";
  const diff = new Date(target).getTime() - nowTs;

  if (diff <= 0) return "0d 0h 0m 0s";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function DeadlineCountdown({
  target,
  prefix = "Ends in",
  className = "",
}) {
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    if (!target) return;

    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [target]);

  if (!target) return null;

  return (
    <span className={className}>
      {prefix} {formatCountdown(target, nowTs)}
    </span>
  );
}
