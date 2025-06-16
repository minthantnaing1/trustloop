// app/sell/page.js
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
      <main className="sell-form-wrapper">
        <div className="sell-form-header">
          <button
            className="sell-cancel-btn"
            onClick={() => router.push("/buy-sell")}
          >
            Cancel
          </button>
          <button className="sell-confirm-btn" onClick={handleSubmit}>
            Confirm To Sell
          </button>
        </div>

        <div className="sell-form-body">
          {/* Image Placeholder */}
          <div className="sell-image-box">
            <div className="sell-placeholder">+ Upload Images</div>
          </div>

          {/* Form Inputs */}
          <div className="sell-input-section">
            <div className="sell-inline">
              <input
                className="sell-input"
                name="title"
                placeholder="Product Name"
                onChange={handleChange}
                value={form.title}
              />
            </div>
            <div className="sell-inline">
              <input
                className="sell-input"
                name="price"
                placeholder="Price"
                type="number"
                onChange={handleChange}
                value={form.price}
              />
              <select
                className="sell-input"
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
              className="sell-input"
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
          </div>

          <textarea
            className="sell-input-area"
            name="location"
            placeholder="Meetup Location"
            onChange={handleChange}
            value={form.location}
          />
          <textarea
            className="sell-input-area"
            name="description"
            placeholder="Description"
            onChange={handleChange}
            value={form.description}
          />
        </div>
      </main>
    </>
  );
}
