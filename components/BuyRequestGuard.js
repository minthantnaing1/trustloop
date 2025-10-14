// components/BuyRequestGuard.js
"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";

export default function BuyRequestGuard({
  href,
  guard, // { ok: boolean, missing: string[] }
  text,
  variant = "buyPrimaryClick",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const missing = Array.isArray(guard?.missing) ? guard.missing : [];

  function onClick() {
    if (disabled) return;
    if (guard?.ok) {
      window.location.href = href;
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <ActionButton
        text={text}
        variant={variant}
        className={className}
        onClick={onClick}
        disabled={disabled}
      />

      <ConfirmModal
        isOpen={open}
        message={
          `Before continuing, please add the following in your profile:\n\n` +
          (missing.length ? "• " + missing.join(",\n• ") + "." : "—") +
          `\n\nYou'll be redirected to update them.`
        }
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          const next =
            window.location.pathname +
            window.location.search +
            window.location.hash;
          window.location.href = `/profile/edit?next=${encodeURIComponent(
            next
          )}`;
        }}
        variant="default"
      />
    </>
  );
}
