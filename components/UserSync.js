"use client";

import { useEffect } from "react";

function UserSync({ session }) {
  useEffect(() => {
    const syncUser = async () => {
      if (!session?.user?.email) return;

      try {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
          }),
        });
      } catch (err) {
        console.error("❌ Failed to sync user:", err);
      }
    };

    syncUser();
  }, [session]);

  return null;
}

export default UserSync;
