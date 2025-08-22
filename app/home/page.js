import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import Image from "next/image";
import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import {
  UserGroupIcon,
  BoltIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    // Call API to ensure user exists in DB
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: session.user.name,
        email: session.user.email,
        image: session.user.image || "/default-profile.jpg",
      }),
      cache: "no-store",
    });
  }

  return (
    <>
      <NavBar />
      <main className="bg-white mt-[-20px]">
        {/* Hero Section */}
        <section className="bg-[#1a2d48]">
          <HeroCarousel />
        </section>

        {/* About Us */}
        <section className="bg-[#f9fafb] py-16 px-5 text-center">
          <h2 className="text-2xl font-bold text-[#325082] mb-4">
            About TrustLoop
          </h2>
          <p className="text-gray-600 max-w-[800px] mx-auto">
            Built exclusively for AU students, TrustLoop ensures secure
            peer-to-peer trades within your university community using Microsoft
            student login. List your items, find deals, and trade confidently.
          </p>
        </section>

        {/* Features */}
        <section className="bg-white py-16">
          <div className="max-w-[1100px] mx-auto px-5 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                title: "AU Students Only",
                desc: "Microsoft Entra ID login guarantees trusted AU members only.",
                icon: (
                  <UserGroupIcon className="w-10 h-10 text-[#325082] mb-4" />
                ),
              },
              {
                title: "Easy & Convenient",
                desc: "List items or browse deals easily in a student-focused interface designed for quick, hassle-free trades.",
                icon: <BoltIcon className="w-10 h-10 text-[#325082] mb-4" />,
              },
              {
                title: "Secure & Trusted",
                desc: "Trade safely with fellow students on campus or nearby.",
                icon: (
                  <ShieldCheckIcon className="w-10 h-10 text-[#325082] mb-4" />
                ),
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-[#f8fafc] rounded-xl shadow-md hover:shadow-lg transition p-6 flex flex-col items-center"
              >
                {item.icon}
                <h3 className="font-semibold text-[#325082] mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="bg-[#f9fafb] py-16 text-center">
          <h2 className="text-2xl font-bold text-[#325082] mb-6">
            Get Started Easily
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: "Buy & Sell", href: "/buy-sell" },
              { label: "Auction", href: "/auction" },
              { label: "Giveaway", href: "/giveaway" },
            ].map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className="bg-[#325082] hover:bg-[#2b446a] text-white px-8 py-4 rounded-xl font-semibold transition min-w-[160px]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#2b446a] text-white text-center py-4 text-sm">
          &copy; {new Date().getFullYear()} TrustLoop. AU Student Marketplace.
        </footer>
      </main>
    </>
  );
}
