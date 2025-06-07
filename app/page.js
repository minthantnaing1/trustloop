"use client";

import LoginButton from "@/components/LoginButton";

function Login() {
  return (
    <div className="login-page">
      {/* Header with larger logo */}
      <div className="login-header">
        <img
          src="/TrustLoopLogo.png"
          alt="TrustLoop Logo"
          className="logo large"
        />
      </div>

      {/* Auth box */}
      <div className="auth-box">
        {/* Unified tab label */}
        <div className="auth-tab-single">Sign In / Sign Up</div>

        {/* Microsoft login button */}
        <LoginButton />
      </div>
    </div>
  );
}

export default Login;
