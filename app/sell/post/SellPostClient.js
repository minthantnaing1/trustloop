"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function SellPostClient({ initialLocation = "" }) {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: initialLocation,
  });

  const [images, setImages] = useState([]); // array of File
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "price" && Number(value) < 0) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      alert("You can only upload up to 5 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    if (images.length === 0) setDefaultIndex(0);
  };

  const handleSubmit = async () => {
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

      const uploadedUrls = [];
      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!data.url) throw new Error("Upload failed");
        uploadedUrls.push(data.url);
      }

      const defaultImage = uploadedUrls[defaultIndex];

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type: "sell",
          images: uploadedUrls,
          defaultImage,
        }),
      });

      if (res.ok) {
        // You can switch to `/sell/${created._id}` if your API returns the product
        router.push("/sell");
      } else {
        alert("Error submitting product.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto mb-5 px-5">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <ActionButton
          text="Cancel"
          variant="outlineClick"
          onClick={() => router.push("/sell")}
          disabled={loading}
        />

        <h2 className="text-2xl font-semibold text-[#325082] text-center">
          Sell a Product
        </h2>

        <ActionButton
          text={loading ? "Processing..." : "Confirm To Sell"}
          variant="primaryClick"
          onClick={handleSubmit}
          disabled={loading}
        />
      </div>

      <div className="flex flex-col lg:flex-row flex-wrap gap-[30px] items-start">
        {/* Upload Section */}
        <div className="flex-1 w-full sm:h-[364px] min-w-[250px] bg-[#f1f1f1] rounded-[12px] p-4 flex flex-col justify-start">
          <label className="block text-[#325082] font-semibold mb-3">
            Upload Product Images (max 5)
          </label>

          <div className="relative w-full mb-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className="border border-dashed border-[#325082] rounded-md h-[80px] flex items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition duration-200 text-sm">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V8m0 0L8 12m4-4l4 4M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1"
                />
              </svg>
              <span>Click to upload or drag files</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 overflow-y-auto">
            {images.map((file, index) => {
              const preview = URL.createObjectURL(file);
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
                    src={preview}
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

                      if (defaultIndex === index) {
                        setDefaultIndex(0);
                      } else if (index < defaultIndex) {
                        setDefaultIndex((prev) => prev - 1);
                      }
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
              <option value="electronics">Electronics</option>
              <option value="books">Books</option>
              <option value="furniture">Furniture</option>
              <option value="clothing">Clothing</option>
              <option value="others">Others</option>
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
            placeholder="Your Location"
            className="bg-[#f1f1f1] p-3 rounded-[8px] min-h-[80px] outline-none"
          />
          <p className="text-xs text-gray-500 -mt-3 ml-2">
            Prefilled from your profile location — you can change it for this
            product.
          </p>
        </div>
      </div>
    </main>
  );
}
