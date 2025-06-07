"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn("microsoft-entra-id");
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleLogin}
      className="microsoft-btn"
      disabled={isLoading}
    >
      <img
        src="https://purepng.com/public/uploads/large/purepng.com-microsoft-logo-iconlogobrand-logoiconslogos-251519939091wmudn.png"
        alt="Microsoft logo"
        className="microsoft-icon"
      />
      {isLoading ? "Signing in..." : "Login with Microsoft"}
    </button>
  );
}

export default LoginButton;
