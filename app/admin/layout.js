// app/admin/layout.js
"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function AdminRouteLayout({ children }) {
  const [collapsed, setCollapsed] = useState(true); // start collapsed

  return (
    <div className="flex h-screen relative overflow-hidden">
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* IMPORTANT:
         - Make this the scroll container (overflow-auto)
         - Use h-screen on wrapper and overflow-hidden to prevent body scroll
         - Sticky inside children will now work
      */}
      <main
        className={`transition-all duration-500 px-6 pt-10 w-full overflow-auto ${
          collapsed ? "ml-[60px]" : "ml-[200px]"
        }`}
        style={{ marginLeft: collapsed ? "60px" : "200px" }}
      >
        {children}
      </main>

      {/* Same overlay as the main site */}
      <LoadingOverlay />
    </div>
  );
}
