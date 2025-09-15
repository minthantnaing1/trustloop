// app/admin/layout.js
"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function AdminRouteLayout({ children }) {
  const [collapsed, setCollapsed] = useState(true); // start collapsed

  return (
    <div className="flex h-full relative">
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
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
