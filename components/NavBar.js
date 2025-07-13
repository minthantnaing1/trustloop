"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingCartIcon,
  HeartIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  ShoppingCartIcon as CartSolid,
  HeartIcon as HeartSolid,
  Cog6ToothIcon as CogSolid,
} from "@heroicons/react/24/solid";
import { useState } from "react";

function NavBar() {
  const [hover, setHover] = useState({
    cart: false,
    heart: false,
    setting: false,
  });

  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 w-full h-[90px] bg-gradient-to-r from-[#2b446a] to-[#325082] shadow-md shadow-gray-900/30 flex justify-between items-center px-8 z-[10000]">
      {/* Left - Logo */}
      <div className="flex items-center">
        <Image src="/TrustLoopLogoW.png" alt="Logo" width={100} height={75} />
      </div>

      {/* Middle - Welcome & Nav Links */}
      <div className="flex flex-col items-center gap-y-[8px]">
        <p className="text-white font-semibold text-lg tracking-wide">
          Welcome to TrustLoop
        </p>
        <ul className="flex gap-[65px]">
          {[
            { label: "HOME", href: "/home" },
            { label: "BUY & SELL", href: "/buy-sell" },
            { label: "AUCTION", href: "/auction" },
            { label: "GIVEAWAY", href: "/giveaway" },
          ].map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/buy-sell" &&
                pathname.startsWith("/buy-sell/")) ||
              (item.href === "/buy-sell" && pathname === "/sell");

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <span
                    className={`inline-block text-white text-[14px] font-medium px-2 py-1 border-b-2 transition-all duration-500 active:scale-[0.95] ${
                      isActive
                        ? "border-white"
                        : "border-transparent hover:border-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right - Action Icons */}
      <div className="flex items-center gap-6 text-white">
        {/* Cart */}
        <div
          onMouseEnter={() => setHover({ ...hover, cart: true })}
          onMouseLeave={() => setHover({ ...hover, cart: false })}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          {hover.cart ? (
            <CartSolid className="w-6 h-6" />
          ) : (
            <ShoppingCartIcon className="w-6 h-6" />
          )}
        </div>

        {/* Heart */}
        <div
          onMouseEnter={() => setHover({ ...hover, heart: true })}
          onMouseLeave={() => setHover({ ...hover, heart: false })}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          {hover.heart ? (
            <HeartSolid className="w-6 h-6" />
          ) : (
            <HeartIcon className="w-6 h-6" />
          )}
        </div>

        {/* Settings */}
        <div
          onMouseEnter={() => setHover({ ...hover, setting: true })}
          onMouseLeave={() => setHover({ ...hover, setting: false })}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          {hover.setting ? (
            <CogSolid className="w-6 h-6" />
          ) : (
            <Cog6ToothIcon className="w-6 h-6" />
          )}
        </div>
      </div>
    </header>
  );
}

export default NavBar;
