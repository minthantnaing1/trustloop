"use client";

import { useEffect, useState } from "react";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (
    (parts[0]?.[0] || "") +
    (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")
  ).toUpperCase();
}

export default function TeamSection() {
  const [team, setTeam] = useState([]);

  useEffect(() => {
    fetch("/api/team", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setTeam(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden py-15 px-5">
      {/* 🔹 Background */}
      {/* 🔹 Softer Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f7f9fc] via-[#fafcff] to-[#f5f8fc]" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#325082]/5 rounded-full blur-[120px]" />

      <div className="relative max-w-[1100px] mx-auto text-center">
        <h2 className="text-2xl font-bold text-[#325082]">Our Team</h2>
        <p className="text-gray-600 mt-2">The people behind TrustLoop</p>
        <p className="text-sm text-gray-500 max-w-[720px] mx-auto mt-4 mb-12">
          TrustLoop is developed and maintained by a small, dedicated team of AU
          students who share a passion for building secure, practical, and
          student-focused digital solutions. Each member contributes their
          expertise to ensure TrustLoop is reliable, intuitive, and continuously
          improving.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7">
          {team.map((member) => (
            <div
              key={member.email}
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center hover:-translate-y-1"
            >
              {/* Avatar */}
              <div className="relative">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md border border-[#325082]/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#325082]/15 to-[#325082]/5 flex items-center justify-center ring-4 ring-white shadow-md border border-[#325082]/20">
                    <span className="text-lg font-bold text-[#325082]">
                      {initials(member.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="mt-5 font-semibold text-[#1f2f4c] leading-snug text-center">
                {member.name || "Unnamed"}
              </div>

              {/* Role */}
              {member.title && (
                <div className="mt-2 px-3 py-1 rounded-full text-xs font-semibold text-[#325082] bg-[#325082]/10 border border-[#325082]/20">
                  {member.title}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
