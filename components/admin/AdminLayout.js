"use client";
import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content */}
      <main
        className={`transition-all duration-500 px-6 pt-10 w-full overflow-auto ${
          collapsed ? "ml-[60px]" : "ml-[200px]"
        }`}
        style={{
          marginLeft: collapsed ? "60px" : "200px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
