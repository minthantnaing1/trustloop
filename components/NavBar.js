"use client";

import Link from "next/link";
import Image from "next/image";
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

  return (
    <header className="fixed top-0 left-0 w-full h-[90px] bg-[#325082] flex justify-between items-center px-8 z-[10000]">
      {/* Left */}
      <div className="flex items-center">
        <Image src="/TrustLoopLogoW.png" alt="Logo" width={100} height={75} />
      </div>

      {/* Middle */}
      <div className="flex flex-col items-center">
        <p className="text-white font-medium text-lg">Welcome to TrustLoop</p>
        <ul className="flex gap-[88px] text-[14px] mt-[10px]">
          {[
            { label: "HOME", href: "/home" },
            { label: "BUY & SELL", href: "/buy-sell" },
            { label: "AUCTION", href: "/auction" },
            { label: "DONATION", href: "/donation" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-white px-3 py-1 rounded-md hover:bg-white hover:text-[#325082] transition"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5 text-white">
        {/* Cart */}
        <div
          onMouseEnter={() => setHover({ ...hover, cart: true })}
          onMouseLeave={() => setHover({ ...hover, cart: false })}
          className="cursor-pointer"
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
          className="cursor-pointer"
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
          className="cursor-pointer"
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
