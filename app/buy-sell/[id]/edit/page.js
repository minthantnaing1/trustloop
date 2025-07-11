"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchProduct() {
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          title: data.title || "",
          price: data.price || "",
          category: data.category || "",
          condition: data.condition || "",
          location: data.location || "",
          description: data.description || "",
        });
      } else {
        alert("Product not found.");
        router.push("/buy-sell");
      }
    }

    fetchProduct();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "price") {
      const numeric = Number(value);
      if (numeric < 1) return; // ❌ prevent 0 and negative
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    if (!form.title || !form.price || !form.category || !form.condition) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push(`/buy-sell/${id}`);
      } else {
        alert("Error updating product.");
      }
    } catch (err) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[110px] mb-5 px-5">
        <h2 className="text-2xl font-bold text-[#325082] mb-4">
          Edit Your Product
        </h2>

        <div className="flex flex-wrap gap-[30px] items-start">
          {/* Image Upload Placeholder */}
          <div className="flex-1 min-w-[300px] h-[300px] bg-[#e2e2e2] rounded-[12px] flex items-center justify-center">
            <div className="text-[#325082] font-semibold">+ Change Images</div>
          </div>

          {/* Right: Form */}
          <div className="flex-1 min-w-[600px] flex flex-col gap-[15px]">
            <input
              name="title"
              placeholder="Product Name *"
              value={form.title}
              onChange={handleChange}
              className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
            />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Product Description"
              className="bg-[#f1f1f1] p-3 rounded-[8px] min-h-[80px] outline-none"
            />

            <div className="flex gap-3">
              <input
                name="price"
                type="number"
                min="1"
                placeholder="Price (฿) *"
                value={form.price}
                onChange={handleChange}
                className="flex-1 bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
              />

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="flex-1 bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
              >
                <option value="" disabled>
                  Select Category *
                </option>
                <option value="electronics">Electronics</option>
                <option value="books">Books</option>
                <option value="furniture">Furniture</option>
                <option value="clothing">Clothing</option>
                <option value="others">Others</option>
              </select>
            </div>

            <select
              name="condition"
              value={form.condition}
              onChange={handleChange}
              className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
            >
              <option value="" disabled>
                Select Condition *
              </option>
              <option value="new">New</option>
              <option value="like new">Like New</option>
              <option value="used">Used</option>
              <option value="poor">Poor</option>
            </select>

            <textarea
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Meetup Location (optional)"
              className="bg-[#f1f1f1] p-3 rounded-[8px] min-h-[80px] outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mt-10">
          <ActionButton
            text="Cancel"
            variant="outlineClick"
            onClick={() => router.push(`/buy-sell/${id}`)}
            disabled={loading}
          />
          <ActionButton
            text={loading ? "Saving..." : "Update Product"}
            variant="primaryClick"
            onClick={handleUpdate}
            disabled={loading}
          />
        </div>
      </main>
    </>
  );
}
