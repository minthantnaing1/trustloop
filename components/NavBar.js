"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import ActionButton from "@/components/ActionButton";
import NotificationPanel from "@/components/NotificationPanel";
import {
  HeartIcon,
  UserIcon,
  Bars4Icon,
  BellIcon, // outline bell (default)
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartSolid,
  UserIcon as UserIconSolid,
  XMarkIcon,
  BellIcon as BellSolid, // solid bell (hover)
} from "@heroicons/react/24/solid";

// ------- Favorites count cache helpers (avoid first-paint delay)
const GLOBAL_FAV_COUNT_KEY = "fav_count";
function readFavCount() {
  if (typeof window === "undefined") return 0;
  try {
    const n = parseInt(localStorage.getItem(GLOBAL_FAV_COUNT_KEY) || "0", 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  } catch {
    return 0;
  }
}
function writeFavCount(n) {
  try {
    localStorage.setItem(GLOBAL_FAV_COUNT_KEY, String(Math.max(0, n)));
  } catch {}
}

// ------- Notifications count cache (same pattern as favorites)
const GLOBAL_NOTIF_COUNT_KEY = "notif_count";
function readNotifCount() {
  if (typeof window === "undefined") return 0;
  try {
    const n = parseInt(localStorage.getItem(GLOBAL_NOTIF_COUNT_KEY) || "0", 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  } catch {
    return 0;
  }
}
function writeNotifCount(n) {
  try {
    localStorage.setItem(GLOBAL_NOTIF_COUNT_KEY, String(Math.max(0, n)));
  } catch {}
}

function NavBar() {
  const [hover, setHover] = useState({
    notif: false,
    heart: false,
    profile: false,
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // avatar
  const [me, setMe] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  // favorites count for heart badge (init from localStorage so it shows instantly)
  const [favCount, setFavCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const ACTIVE_POLL_MS = 5000; // when tab is visible
  const IDLE_POLL_MS = 15000; // when tab hidden (or 10000 for 10s)
  const pollTimerRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications?unread=1", {
        cache: "no-store",
      });
      const data = r.ok ? await r.json() : [];
      const n =
        Number(data?.unreadCount || 0) ||
        (Array.isArray(data) ? data.length : 0) ||
        (Array.isArray(data?.items) ? data.items.length : 0);

      setNotifCount((prev) => {
        if (prev !== n) writeNotifCount(n);
        return n;
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        // role for Admin nav
        if (data.role === "admin") setIsAdmin(true);

        // full user (for avatar)
        const u = data.user;
        if (u) {
          setMe({ image: u.image || "", name: u.name || "" });
          if (u.image) {
            setAvatarUrl(u.image);
            try {
              localStorage.setItem("tl_avatar", u.image);
              if (u.name) localStorage.setItem("tl_name", u.name);
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // 1) read cached count for instant paint after mount
    try {
      const cached = parseInt(localStorage.getItem("fav_count") || "0", 10);
      if (!Number.isNaN(cached)) setFavCount(Math.max(0, cached));
    } catch {}

    // 2) fetch authoritative count
    fetch("/api/users/favorites")
      .then((r) => (r.ok ? r.json() : { favorites: [] }))
      .then((data) => {
        const n = Array.isArray(data.favorites) ? data.favorites.length : 0;
        setFavCount(n);
        try {
          localStorage.setItem("fav_count", String(n));
        } catch {}
      })
      .catch(() => {});

    // 3) listen for optimistic updates from FavoriteButton
    const onFavUpdated = (e) => {
      const delta = Number(e?.detail?.delta || 0);
      if (!Number.isNaN(delta)) {
        setFavCount((c) => {
          const next = Math.max(0, c + delta);
          try {
            localStorage.setItem("fav_count", String(next));
          } catch {}
          return next;
        });
      }
    };
    const onStorage = (e) => {
      if (e.key === "fav_count") {
        const n = parseInt(e.newValue || "0", 10);
        if (!Number.isNaN(n)) setFavCount(Math.max(0, n));
      }
    };

    window.addEventListener("favorites:updated", onFavUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("favorites:updated", onFavUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    // 1) instant paint from cache
    setNotifCount(readNotifCount());

    // 2) authoritative fetch (unread only)
    fetch("/api/notifications?unread=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))

      .then((data) => {
        const n =
          (Array.isArray(data) ? data.length : 0) ||
          (Array.isArray(data?.items) ? data.items.length : 0) ||
          Number(data?.unreadCount || 0);
        setNotifCount(n);
        writeNotifCount(n);
      })

      .catch(() => {});

    // 3) listen for optimistic updates from elsewhere in the app
    const onNotifChanged = (e) => {
      const delta = Number(e?.detail?.delta || 0);
      if (!Number.isNaN(delta)) {
        setNotifCount((c) => {
          const next = Math.max(0, c + delta);
          writeNotifCount(next);
          return next;
        });
      }
    };

    const onStorage = (e) => {
      if (e.key === GLOBAL_NOTIF_COUNT_KEY) {
        const n = parseInt(e.newValue || "0", 10);
        if (!Number.isNaN(n)) setNotifCount(Math.max(0, n));
      }
    };

    window.addEventListener("notifications:updated", onNotifChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("notifications:updated", onNotifChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [mounted]);

  useEffect(() => {
    function shouldPoll() {
      return document.visibilityState === "visible" && !showNotifPanel;
    }

    function start() {
      if (pollTimerRef.current) return;

      // pick interval based on visibility
      const interval =
        document.visibilityState === "visible" ? ACTIVE_POLL_MS : IDLE_POLL_MS;

      // immediate fetch so UI updates right away
      fetchUnread();
      pollTimerRef.current = setInterval(fetchUnread, interval);
    }

    function stop() {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    const onVis = () => {
      stop();
      if (shouldPoll()) start();
    };

    const onFocus = () => {
      if (shouldPoll()) {
        // on focus, force-refresh immediately
        fetchUnread();
        start();
      }
    };

    const onBlur = stop;

    // init
    if (shouldPoll()) start();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, [showNotifPanel, fetchUnread]);

  const navLinks = useMemo(
    () => [
      { label: "HOME", href: "/home" },
      { label: "BUY", href: "/buy" },
      { label: "SELL", href: "/sell" },
      { label: "DONATION", href: "/donation" },
      { label: "MY ORDERS", href: "/my-orders" },
    ],
    []
  );

  const isActiveLink = (href) =>
    pathname === href ||
    (href === "/buy" && pathname.startsWith("/buy/")) ||
    (href === "/sell" && pathname.startsWith("/sell/")) ||
    (href === "/donation" && pathname.startsWith("/donation/")) ||
    (href === "/my-orders" && pathname.startsWith("/my-orders/"));

  const blurDataURL =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMmYyZjQiIC8+PC9zdmc+";

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-[60px] bg-[image:var(--tl-gradient)] shadow-md shadow-gray-900/30 z-[10000]">
        <div className="w-full h-full grid grid-cols-12 items-center px-3 lg:px-8">
          {/* Left */}
          <div className="col-span-6 md:col-span-1 lg:col-span-2 flex items-center">
            <Image
              src="/TrustLoopLogoW.png"
              alt="Logo"
              width={128}
              height={64}
              priority
              className="h-12 w-auto"
            />
          </div>

          {/* Middle */}
          <div className="hidden md:flex md:col-span-8 lg:col-span-8 items-center justify-center overflow-hidden">
            <ul className="flex gap-[30px] lg:gap-[55px] text-[14px]">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className={`inline-block text-white font-[500] px-2 py-2.5 border-b-2 transition-all duration-500 ease-in-out active:scale-[0.95] ${
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

          {/* Right */}
          <div className="col-span-6 md:col-span-3 lg:col-span-2 flex items-center justify-end gap-5 md:gap-5 lg:gap-6 text-white">
            {/* Notifications */}
            <button
              type="button"
              onMouseEnter={() => setHover((h) => ({ ...h, notif: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, notif: false }))}
              onClick={() => setShowNotifPanel(true)}
              className="relative cursor-pointer transition-transform duration-500 ease-in-out hover:scale-110 active:scale-[0.9]"
              aria-label="Notifications"
            >
              {hover.notif ? (
                <BellSolid className="w-6.5 h-6.5" />
              ) : (
                <BellIcon className="w-6.5 h-6.5" />
              )}

              {mounted && notifCount > 0 && (
                <span
                  className="absolute -top-[6px] -right-[8px] min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[12.5px] leading-[18px] text-center font-semibold pointer-events-none"
                  aria-label={`${notifCount} unread notifications`}
                >
                  {notifCount}
                </span>
              )}
            </button>

            {/* Heart with counter */}
            <Link
              href="/favorites"
              className="inline-block"
              aria-label="Favorites"
            >
              <div
                onMouseEnter={() => setHover({ ...hover, heart: true })}
                onMouseLeave={() => setHover({ ...hover, heart: false })}
                className="relative cursor-pointer mr-1 transition-transform duration-500 ease-in-out hover:scale-110 active:scale-[0.9]"
              >
                {hover.heart ? (
                  <HeartSolid className="w-6 h-6" />
                ) : (
                  <HeartIcon className="w-6 h-6" />
                )}

                {mounted && favCount > 0 && (
                  <span
                    className="absolute -top-[6px] -right-[9px] min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[12.5px] leading-[18px] text-center font-semibold pointer-events-none"
                    aria-label={`${favCount} favorites`}
                  >
                    {favCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Profile / Avatar */}
            <div
              onMouseEnter={() => setHover((h) => ({ ...h, profile: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, profile: false }))}
              className="cursor-pointer transition-transform duration-500 ease-in-out hover:scale-[1.05] active:scale-[0.9]"
            >
              <Link href="/profile" className="block">
                <div className={`relative w-9 h-9`}>
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
                        hover.profile ? "scale-[1.02]" : ""
                      }`}
                      onError={() => {
                        // Fallback to placeholder if remote image fails
                        setAvatarUrl("");
                      }}
                    />
                  ) : (
                    // Circular placeholder (always a circle)
                    <div className="w-9 h-9 rounded-full ring-2 ring-white/70 shadow-sm bg-white/20 flex items-center justify-center">
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
              className="cursor-pointer transition-transform duration-500 ease-in-out hover:scale-110 active:scale-[0.9]"
            >
              <Bars4Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
        {/* Notification slide-over */}
        <NotificationPanel
          open={showNotifPanel}
          onClose={() => setShowNotifPanel(false)}
          onUnreadChange={(delta) => {
            if (typeof delta === "number") {
              setNotifCount((c) => {
                const next = Math.max(0, c + delta);
                writeNotifCount(next);
                return next;
              });
            }
          }}
        />
      </header>

      {/* Spacer to push content down */}
      <div className="h-[74px]" />

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
              className="text-red-600 hover:text-red-700 w-6 h-6"
            >
              <XMarkIcon className="w-6 h-6" />
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

          {/* Nav Links (Mobile Only) */}
          <div className="md:hidden">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMenu(false)}
              >
                <div
                  className={`mb-4 cursor-pointer ${
                    isActiveLink(item.href)
                      ? "underline font-semibold text-blue-400"
                      : "hover:underline"
                  }`}
                >
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          {/* Profile (Always Show) */}
          <Link href="/profile" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">Profile</div>
          </Link>

          {/* My Favorites (Always Show) */}
          <Link href="/favorites" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">
              My Favorites
            </div>
          </Link>

          {/* All Notifications (Always Show) */}
          <Link href="/notifications" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">
              All Notifications
            </div>
          </Link>
          {/* Customer Support (Always Show) */}
          <Link href="/support" onClick={() => setShowMenu(false)}>
            <div className="mb-4 hover:underline cursor-pointer">
              Customer Support
            </div>
          </Link>


          {/* Logout Button */}
          <ActionButton
            text="Logout"
            variant="dangerOutlineHover"
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 w-full"
          />
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
