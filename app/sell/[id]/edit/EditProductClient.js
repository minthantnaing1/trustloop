// sell/[id]/edit/EditProductClient.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";

export default function EditProductClient({ initialProduct }) {
  const router = useRouter();
  const id = initialProduct?._id;

  const [form, setForm] = useState({
    title: initialProduct?.title || "",
    description: initialProduct?.description || "",
    price: initialProduct?.price || "",
    category: initialProduct?.category || "",
    condition: initialProduct?.condition || "",
    location: initialProduct?.location || "",
  });

  // images: [{ url? , file? }]
  const [images, setImages] = useState(
    (initialProduct?.images || []).map((url) => ({ url }))
  );
  const def =
    (initialProduct?.images || []).findIndex(
      (u) => u === initialProduct?.defaultImage
    ) ?? -1;
  const [defaultIndex, setDefaultIndex] = useState(def >= 0 ? def : 0);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "price" && Number(value) < 0) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      alert("You can only upload up to 5 images.");
      return;
    }
    const newImgs = files.map((file) => ({ file }));
    setImages((prev) => [...prev, ...newImgs]);
    if (images.length === 0) setDefaultIndex(0);
  };

  const handleUpdate = async () => {
    const { title, price, category, condition } = form;
    if (!title || !price || !category || !condition) {
      alert("Please fill in all required fields.");
      return;
    }
    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    try {
      setLoading(true);

      // Upload only the new files; keep existing URLs as-is — all in parallel
      const finalImages = await Promise.all(
        images.map(async (img) => {
          if (img.url) return img.url;
          const formData = new FormData();
          formData.append("file", img.file);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!data.url) throw new Error("Upload failed");
          return data.url;
        })
      );

      const defaultImage = finalImages[defaultIndex] ?? finalImages[0];

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images: finalImages, defaultImage }),
      });

      if (res.ok) {
        router.replace(`/sell/${id}`);
        router.refresh();
        return; // keep loading=true until route changes
      }

      const msg = await res.text();
      alert(msg || "Error updating product.");
      setLoading(false);
    } catch (err) {
      alert("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-5">
        {/* Top Bar */}
        <div className="flex justify-start items-center mb-6">
          <h1 className="text-2xl font-bold text-[#325082]">Edit My Product</h1>
        </div>

        <div className="flex flex-col lg:flex-row flex-wrap gap-[30px] items-start">
          {/* Upload Section */}
          <div className="flex-1 w-full sm:h-[364px] min-w-[250px] bg-[#f1f1f1] rounded-[12px] p-4 flex flex-col justify-start">
            <label className="block text-[#325082] font-semibold mb-3">
              Change Product Images (max 5)
            </label>

            <div className="relative w-full mb-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="border border-dashed border-[#325082] rounded-md h-[80px] flex items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition text-sm">
                <span>Click to upload or drag files</span>
              </div>
            </div>

            {/* Image Preview Grid */}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto">
              {images.map((img, index) => {
                const src = img.url || URL.createObjectURL(img.file);
                return (
                  <div
                    key={index}
                    className={`relative border-2 rounded-md overflow-hidden group ${
                      defaultIndex === index
                        ? "border-[#325082]"
                        : "border-gray-300"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Preview ${index}`}
                      className="w-full h-[80px] object-cover cursor-pointer"
                      onClick={() => setDefaultIndex(index)}
                    />

                    {defaultIndex === index && (
                      <span className="absolute top-1 left-1 bg-[#325082] text-white text-xs px-2 py-0.5 rounded z-10">
                        Default
                      </span>
                    )}

                    <button
                      onClick={() => {
                        const next = [...images];
                        next.splice(index, 1);
                        setImages(next);
                        if (defaultIndex === index) setDefaultIndex(0);
                        else if (index < defaultIndex)
                          setDefaultIndex((prev) => prev - 1);
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-700 z-10"
                      title="Remove"
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 w-full lg:min-w-[600px] flex flex-col gap-[15px]">
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
            <input
              name="price"
              type="number"
              min="1"
              placeholder="Price (in ฿) *"
              value={form.price}
              onChange={handleChange}
              className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
            />
            <div className="flex gap-3">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="bg-[#f1f1f1] p-3 max-sm:px-1 rounded-[8px] outline-none w-1/2"
              >
                <option value="" disabled>
                  Select Category *
                </option>
                <option value="IT/Tech">IT/Tech Devices</option>
                <option value="Home Appliances">Home Appliances</option>
                <option value="Furniture">Furniture</option>
                <option value="Stationeries">Stationeries</option>
                <option value="Clothing">Clothing</option>
                <option value="Others">Others</option>
              </select>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="bg-[#f1f1f1] p-3 max-sm:px-1 rounded-[8px] outline-none w-1/2"
              >
                <option value="" disabled>
                  Select Condition *
                </option>
                <option value="new">New</option>
                <option value="like new">Like New</option>
                <option value="used">Used</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <textarea
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Meetup Location"
              className="bg-[#f1f1f1] p-3 rounded-[8px] min-h-[80px] outline-none"
            />
          </div>
        </div>
        <div className="flex justify-between mt-3 pt-4 border-t border-[#e7ecf8]">
          <ActionButton
            text="Cancel"
            variant="outlineClick"
            onClick={() => router.push(`/sell/${id}`)}
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
