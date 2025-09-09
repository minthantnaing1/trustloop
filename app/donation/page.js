'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import Link from 'next/link';
import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Nav */}
      <NavBar />

      {/* Page body fills remaining height and centers content */}
      <main className="hero flex-1 flex items-center justify-center px-4">
        <div className="hero-inner w-full max-w-3xl text-center">
          <div className="search-wrap mx-auto mb-6 flex items-center gap-2 max-w-xl">
          </div>

          <h1 className="hero-heading text-3xl md:text-4xl font-bold mb-6">
            Let’s help each other
          </h1>

          <div className="hero-ctas flex items-center justify-center gap-3">
            <Link href="/donation/donate_now" className="btn btn-info">DONATE NOW</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
