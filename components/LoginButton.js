"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn("microsoft-entra-id");
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 border border-gray-300 bg-white px-4 py-3 rounded-md text-[14px] font-medium w-full hover:bg-gray-100 transition"
    >
      <img
        src="https://purepng.com/public/uploads/large/purepng.com-microsoft-logo-iconlogobrand-logoiconslogos-251519939091wmudn.png"
        alt="Microsoft logo"
        className="h-[20px] w-[20px]"
      />
      {isLoading ? "Signing in..." : "Login with Microsoft"}
    </button>
  );
}
