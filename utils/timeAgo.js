// utils/timeAgo.js
export default function timeAgo(createdAt) {
  const date = new Date(createdAt);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (let i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count > 0) {
      return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}

// ---- Add these:
export function fmtBKK(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
    timeZone: "Asia/Bangkok",
  }).format(d);
}

export function toLocalInputValue(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
