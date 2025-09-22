"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import timeAgo from "@/utils/timeAgo";

export default function ContactDonorPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prefill user info if logged in
  const [me, setMe] = useState({ name: "", email: "" });

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // Product
        const r = await fetch(`/api/products/${id}`, { cache: "no-store" });
        const p = await r.json();
        if (!mounted) return;

        setProduct(p);
        setSubject(`Interested in ${p?.title || "your donation"}`);

        // User info (if available)
        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (meRes.ok) {
          const m = await meRes.json();
          if (!mounted) return;
          setMe({ name: m?.name || "", email: m?.email || "" });
          setName(m?.name || "");
          setEmail(m?.email || "");
        }
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!product) return;

    setSending(true);
    try {
      // NOTE: Wire this to your real API when ready.
      // Example: POST to /api/donations/[id]/contact
      const res = await fetch(`/api/donations/${product._id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      });

      if (!res.ok) {
        alert("Failed to send message. Please try again.");
        return;
      }

      alert("Message sent to the donor!");
      router.push(`/donation/${product._id}`);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto mt-[120px] px-5">
          <p className="text-gray-500">Loading…</p>
        </main>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto mt-[120px] px-5">
          <p className="text-gray-500">Donation not found.</p>
        </main>
      </>
    );
  }

  const isFree =
    product?.type === "donation" || Number(product?.price) === 0;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[120px] mb-[40px] px-5 w-full">
        {/* Back link */}
        <Link
          href={`/donation/${product._id}`}
          className="text-[#325082] text-sm hover:underline flex items-center gap-1 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Donation
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-teal-600 text-xl">💬</span>
                <h1 className="text-xl font-semibold">Send Message</h1>
              </div>

           <form onSubmit={onSubmit} className="space-y-4">
  {/* Name + Email */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Your Name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your full name"
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#325082] outline-none"
        required
      />
    </div>
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        Your Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your.email@university.edu"
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#325082] outline-none"
        required
      />
    </div>
  </div>

  {/* Message */}
  <div>
    <label className="block text-sm text-gray-600 mb-1">
      Message
    </label>
    <textarea
      rows={6}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder={`Hi ${product?.owner?.name?.split(" ")[0] || "there"}! I'm interested in the ${product?.title}. When would be a good time to pick it up?`}
      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#325082] outline-none resize-y"
      required
    />
  </div>

  {/* Buttons */}
  <div className="flex items-center gap-3">
    <button
      type="submit"
      disabled={sending}
      className="flex items-center justify-center gap-2 bg-[#325082] hover:bg-[#2b446a] text-white font-medium rounded-md px-5 py-2 transition disabled:opacity-60"
    >
      <span>✈️</span>
      {sending ? "Sending..." : "Send Message"}
    </button>

    <button
      type="button"
      onClick={() => router.push(`/donation/${product._id}`)}
      className="border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium rounded-md px-5 py-2 transition"
    >
      Cancel
    </button>
  </div>
</form>

            </div>
          </div>

          {/* Right: Item Summary & Safety */}
          <div className="lg:col-span-1 space-y-6">
            {/* Item Summary */}
<div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
  <h3 className="text-lg font-semibold mb-3">Item Summary</h3>

  <div className="flex items-start gap-3 mb-3">
    <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border">
      {/* Use <img> instead of <Image> to avoid next.config.js domain error */}
      <img
        src={product?.defaultImage || "/placeholder.png"}
        alt={product?.title || "Item image"}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="min-w-0">
      <p className="font-semibold truncate">{product.title}</p>
      <p className="text-teal-600 font-semibold">
        {isFree ? "Free" : `${Number(product.price).toLocaleString()} ฿`}
      </p>
      <p className="text-sm text-gray-600 truncate">
        {product.category}
        {product?.size ? ` • ${product.size}` : ""}
      </p>
    </div>
  </div>

  <div className="border-t border-gray-200 my-3" />

  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-gray-500">Condition:</span>
      <span className="font-medium">{product.condition || "-"}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">Location:</span>
      <span className="font-medium">{product.location || "-"}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-gray-500">Posted:</span>
      <span className="font-medium">
        {product?.createdAt ? timeAgo(product.createdAt) : "-"}
      </span>
    </div>
  </div>
</div>


            {/* Donation Safety Tips */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-700">
    🔒 Donation Safety Tips
  </h3>
  <ul className="text-sm text-gray-700 space-y-1">
    <li>• Meet in public campus locations during daylight hours</li>
    <li>• Bring a friend when picking up larger items</li>
    <li>• Test electrical items before taking them</li>
    <li>• Verify donor identity through student email</li>
    <li>• Report suspicious activity to campus security</li>
  </ul>
</div>

          </div>
        </div>
      </main>
    </>
  );
}
