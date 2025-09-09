"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";

import ConfirmModal from "@/components/ConfirmModal";

import {
  Bars3Icon,
  ShoppingCartIcon,
  HeartIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import {
  ShoppingCartIcon as CartSolid,
  HeartIcon as HeartSolid,
  UserIcon as UserIconSolid,
} from "@heroicons/react/24/solid";

function NavBar() {
  const [hover, setHover] = useState({
    cart: false,
    heart: false,
    profile: false,
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ---- Optimistic avatar: load instantly from localStorage, then refresh from API
  // ---- Optimistic avatar: avoid hydration error
  const [me, setMe] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Load cached avatar on client only
  useEffect(() => {
    try {
      const cachedImage = localStorage.getItem("tl_avatar");
      const cachedName = localStorage.getItem("tl_name");
      if (cachedImage) {
        setMe({ image: cachedImage, name: cachedName || "" });
        setAvatarUrl(cachedImage);
      }
    } catch {}
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    // role (for Admin nav)
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});

    // full user (for avatar); ignore 401
    fetch("/api/users/me")
      .then(async (res) => {
        if (!res.ok) return null;
        try {
          return await res.json();
        } catch {
          return null;
        }
      })
      .then((u) => {
        if (!u) return;
        setMe({ image: u.image || "", name: u.name || "" });
        if (u.image) {
          setAvatarUrl(u.image);
          try {
            localStorage.setItem("tl_avatar", u.image);
            if (u.name) localStorage.setItem("tl_name", u.name);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = useMemo(
    () => [
      { label: "HOME", href: "/home" },
      { label: "BUY & SELL", href: "/buy-sell" },
      { label: "AUCTION", href: "/auction" },
      { label: "GIVEAWAY", href: "/giveaway" },
    ],
    []
  );

  const isActiveLink = (href) =>
    pathname === href ||
    (href === "/buy-sell" && pathname.startsWith("/buy-sell/")) ||
    (href === "/buy-sell" && pathname === "/sell");

  // Tiny inline blur placeholder (keeps circle shape clean)
  const blurDataURL =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMmYyZjQiIC8+PC9zdmc+";

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-[70px] bg-gradient-to-r from-[#2b446a] to-[#325082] shadow-md shadow-gray-900/30 flex justify-between items-center px-4 md:px-8 z-[10000]">
        {/* Left - Logo */}
        <div className="flex items-center">
          <Image
            src="/TrustLoopLogoW.png"
            alt="Logo"
            width={68}
            height={55}
            priority
          />
        </div>

        {/* Middle - Welcome & Nav Links (Desktop Only) */}
        <div className="hidden md:flex flex-col items-center gap-y-[1.5px] mb-[0.5px] ml-[70px]">
          <p className="text-white font-semibold text-[16px] tracking-wide">
            Welcome to TrustLoop
          </p>

          <ul className="flex gap-[65px]">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <span
                    className={`inline-block text-white text-[14px] font-medium px-2 py-1 border-b-2 transition-all duration-500 active:scale-[0.95] ${
                      isActiveLink(item.href)
                        ? "border-white"
                        : "border-transparent hover:border-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right - Action Icons */}
        <div className="flex items-center gap-6 text-white">
          {/* Cart */}
          <Link href="/cart" className="inline-block" aria-label="Cart">
            <div
              onMouseEnter={() => setHover({ ...hover, cart: true })}
              onMouseLeave={() => setHover({ ...hover, cart: false })}
              className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
            >
              {hover.cart ? (
                <CartSolid className="w-6 h-6" />
              ) : (
                <ShoppingCartIcon className="w-6 h-6" />
              )}
            </div>
          </Link>

          {/* Heart */}
          <Link href="/favorites" className="inline-block" aria-label="Favorites">
            <div
              onMouseEnter={() => setHover({ ...hover, heart: true })}
              onMouseLeave={() => setHover({ ...hover, heart: false })}
              className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
            >
              {hover.heart ? (
                <HeartSolid className="w-6 h-6" />
              ) : (
                <HeartIcon className="w-6 h-6" />
              )}
            </div>
          </Link>
          <div
            onMouseEnter={() => setHover((h) => ({ ...h, cart: true }))}
            onMouseLeave={() => setHover((h) => ({ ...h, cart: false }))}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
          >
            {hover.cart ? (
              <CartSolid className="w-6 h-6" />
            ) : (
              <ShoppingCartIcon className="w-6 h-6" />
            )}
          </div>

          {/* Heart */}
          <div
            onMouseEnter={() => setHover((h) => ({ ...h, heart: true }))}
            onMouseLeave={() => setHover((h) => ({ ...h, heart: false }))}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
          >
            {hover.heart ? (
              <HeartSolid className="w-6 h-6" />
            ) : (
              <HeartIcon className="w-6 h-6" />
            )}
          </div>

          {/* Profile / Avatar */}
          <div
            onMouseEnter={() => setHover((h) => ({ ...h, profile: true }))}
            onMouseLeave={() => setHover((h) => ({ ...h, profile: false }))}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
          >
            <Link href="/profile" className="block">
              <div className={`relative w-8 h-8`}>
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={me?.name || "Profile"}
                    fill
                    sizes="32px"
                    priority
                    placeholder="blur"
                    blurDataURL={blurDataURL}
                    className={`rounded-full ring-2 ring-white/70 shadow-sm object-cover ${
                      hover.profile ? "scale-[1.03]" : ""
                    }`}
                    onError={() => {
                      // Fallback to placeholder if remote image fails
                      setAvatarUrl("");
                    }}
                  />
                ) : (
                  // Circular placeholder (always a circle)
                  <div className="w-8 h-8 rounded-full ring-2 ring-white/70 shadow-sm bg-white/20 flex items-center justify-center">
                    {hover.profile ? (
                      <UserIconSolid className="w-5 h-5 text-white" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Menu Icon */}
          <div
            onClick={() => setShowMenu((s) => !s)}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-[0.9]"
          >
            <Bars3Icon className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* Spacer to push content down */}
      <div className="h-[90px]" />

      {/* Overlay */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 bg-black/40 z-[20000]"
        />
      )}

      {/* Sliding Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[250px] bg-[#1e293b] text-white transform ${
          showMenu ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300 z-[20000] shadow-lg`}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Menu</h2>
            <button
              onClick={() => setShowMenu(false)}
              className="text-white text-2xl leading-none hover:text-gray-400"
            >
              ×
            </button>
          </div>

          {/* Admin Dashboard (Always First if Admin) */}
          {isAdmin && (
            <Link href="/admin" onClick={() => setShowMenu(false)}>
              <div className="mb-4 hover:underline cursor-pointer font-semibold text-[#facc15]">
                Admin Dashboard
              </div>
            </Link>
          )}

          {/* Profile (Always Show) */}
          <Link href="/profile" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">Profile</div>
          </Link>

          {/* My Orders (Always Show) */}
          <Link href="/my-orders" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">My Orders</div>
          </Link>

          {/* Nav Links (Mobile Only) */}
          <div className="md:hidden">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMenu(false)}
              >
                <div className="mb-4 hover:underline cursor-pointer">
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 w-full bg-white text-[#1e293b] font-semibold py-2 rounded hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        message="Are you sure you want to sign out?"
        variant="danger"
        onConfirm={() => signOut({ callbackUrl: "/" })}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}

export default NavBar;
