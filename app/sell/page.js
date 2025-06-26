"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

export default function SellPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    description: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.category || !form.condition) {
      alert("Please fill in all required fields.");
      return;
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "sell" }),
    });

    if (res.ok) {
      router.push("/buy-sell");
    } else {
      alert("Error submitting product.");
    }
  };

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[110px] mb-5 px-5">
        <div className="flex flex-wrap gap-[20px]">
          {/* Image Upload */}
          <div className="flex-1 min-w-[300px] h-[300px] bg-[#e2e2e2] rounded-[12px] flex items-center justify-center">
            <div className="text-[#325082] font-semibold">+ Upload Images</div>
          </div>

          {/* Form */}
          <div className="flex-1 min-w-[600px] flex flex-col gap-[15px]">
            <div className="flex gap-[10px]">
              <input
                className="flex-1 bg-[#e2e2e2] p-3 rounded-[8px] outline-none"
                name="title"
                placeholder="Product Name"
                onChange={handleChange}
                value={form.title}
              />
            </div>

            <div className="flex gap-[10px]">
              <input
                className="flex-1 bg-[#e2e2e2] p-3 rounded-[8px] outline-none"
                name="price"
                placeholder="Price"
                type="number"
                onChange={handleChange}
                value={form.price}
              />
              <select
                className="flex-1 bg-[#e2e2e2] p-3 rounded-[8px] outline-none"
                name="category"
                onChange={handleChange}
                value={form.category}
              >
                <option value="" disabled>
                  Select Category
                </option>
                <option value="electronics">Electronics</option>
                <option value="books">Books</option>
                <option value="furniture">Furniture</option>
                <option value="clothing">Clothing</option>
                <option value="others">Others</option>
              </select>
            </div>

            <select
              className="bg-[#e2e2e2] p-3 rounded-[8px] outline-none"
              name="condition"
              onChange={handleChange}
              value={form.condition}
            >
              <option value="" disabled>
                Select Condition
              </option>
              <option value="new">New</option>
              <option value="like new">Like New</option>
              <option value="used">Used</option>
              <option value="poor">Poor</option>
            </select>

            <textarea
              className="bg-[#e2e2e2] p-3 rounded-[8px] outline-none min-h-[80px]"
              name="location"
              placeholder="Meetup Location"
              onChange={handleChange}
              value={form.location}
            />
            <textarea
              className="bg-[#e2e2e2] p-3 rounded-[8px] outline-none min-h-[80px]"
              name="description"
              placeholder="Description"
              onChange={handleChange}
              value={form.description}
            />
          </div>
        </div>

        {/* ✅ Buttons below the form, centered */}
        <div className="flex justify-center gap-5 mt-8">
          <button
            className="w-[200px] bg-[#325082] text-white px-5 py-3 rounded-[8px] hover:opacity-90"
            onClick={() => router.push("/buy-sell")}
          >
            Cancel
          </button>
          <button
            className="w-[200px] bg-[#325082] text-white px-5 py-3 rounded-[8px] hover:opacity-90"
            onClick={handleSubmit}
          >
            Confirm To Sell
          </button>
        </div>
      </main>
    </>
  );
}
