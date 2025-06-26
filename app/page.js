"use client";

import LoginButton from "@/components/LoginButton";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      {/* Top Background */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-[#325082] z-[-1]" />

      {/* Logo */}
      <div className="mt-[-155px] mb-[20px]">
        <img
          src="/TrustLoopLogo.png"
          alt="TrustLoop Logo"
          className="h-[250px] object-contain"
        />
      </div>

      {/* Auth Box */}
      <div className="bg-white p-8 w-full max-w-[24rem] rounded-2xl shadow-lg border border-gray-300 flex flex-col items-center gap-6 mt-[-40px]">
        <div className="text-[#325082] text-center w-full text-[16px] font-semibold border-b-2 border-[#325082] pb-2">
          Sign In / Sign Up
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
