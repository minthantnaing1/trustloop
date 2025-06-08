"use client";

import LoginButton from "@/components/LoginButton";

function Login() {
  return (
    <div className="login-page">
      <div className="login-header">
        <img src="/TrustLoopLogo.png" alt="TrustLoop Logo" className="logo" />
      </div>
      <div className="auth-box">
        <div className="auth-tab-single">Sign In / Sign Up</div>
        <LoginButton />
      </div>
    </div>
  );
}

export default Login;
