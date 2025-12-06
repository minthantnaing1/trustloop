"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Bars3Icon,
  HomeIcon,
  UsersIcon,
  CubeIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const pathname = usePathname();

  const menuItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <HomeIcon className="w-5 h-5" />,
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: <UsersIcon className="w-5 h-5" />,
    },
    {
      label: "Products",
      href: "/admin/products",
      icon: <CubeIcon className="w-5 h-5" />,
    },
    {
      label: "Transactions",
      href: "/admin/transactions",
      icon: <BanknotesIcon className="w-5 h-5" />,
    },
    // {
    //   label: "Settings",
    //   href: "/admin/settings",
    //   icon: <Cog6ToothIcon className="w-5 h-5" />,
    // },
  ];

  return (
    <div
      className={`bg-[#1e293b] text-white fixed top-0 left-0 h-full overflow-hidden z-[20000] ${
        collapsed ? "w-[60px]" : "w-[180px]"
      } transition-all duration-500 flex flex-col`}
    >
      <div className="mt-4 flex flex-col gap-2 px-2">
        {/* Menu Toggle */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-start px-2 py-2 rounded text-sm cursor-pointer hover:bg-[#2d3a50] transition-colors duration-500"
        >
          <div className="w-[30px] min-w-[30px] h-[28px] flex items-center justify-center">
            <Bars3Icon className="w-5 h-5 text-white" />
          </div>
          <span
            className={`transition-opacity duration-500 ${
              collapsed ? "opacity-0" : "opacity-100"
            } ml-2`}
            style={{
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            Menu
          </span>
        </div>

        {/* Menu Items */}
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link href={item.href} key={item.href}>
              <div
                className={`relative flex items-center justify-start px-2 py-2 rounded text-sm cursor-pointer transition-colors duration-500 ${
                  isActive ? "bg-blue-600" : "hover:bg-[#2d3a50]"
                }`}
              >
                <div className="w-[30px] min-w-[30px] h-[28px] flex items-center justify-center">
                  {item.icon}
                </div>
                <span
                  className={`transition-opacity duration-500 ${
                    collapsed ? "opacity-0" : "opacity-100"
                  } ml-2`}
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-block",
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Buttons */}
      <div className="mt-auto mb-5 flex flex-col gap-2 px-2">
        {/* Back to User Home */}
        <Link href="/buy">
          <div className="flex items-center justify-start px-2 py-2 rounded text-sm cursor-pointer hover:bg-[#2d3a50] transition-colors duration-500">
            <div className="w-[30px] min-w-[30px] h-[28px] flex items-center justify-center">
              <ArrowUturnLeftIcon className="w-4.5 h-4.5 text-blue-300" />
            </div>
            <span
              className={`text-blue-300 transition-opacity duration-500 ${
                collapsed ? "opacity-0" : "opacity-100"
              } ml-2`}
              style={{
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              User (Home)
            </span>
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center justify-start px-2 py-2 rounded text-sm cursor-pointer hover:bg-[#2d3a50] transition-colors duration-500"
        >
          <div className="w-[30px] min-w-[30px] h-[28px] flex items-center justify-center">
            <ArrowLeftOnRectangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <span
            className={`text-red-600 transition-opacity duration-500 ${
              collapsed ? "opacity-0" : "opacity-100"
            } ml-2`}
            style={{
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            Logout
          </span>
        </button>
      </div>
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        message="Are you sure you want to sign out?"
        variant="danger"
        onConfirm={() => signOut({ callbackUrl: "/" })}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
