// app/auction/[id]/edit/EditAuctionClient.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import { toLocalInputValue, fmtBKK } from "@/utils/timeAgo";

export default function EditAuctionClient({ initialProduct }) {
  const router = useRouter();
  const id = initialProduct?._id;

  // ---- timing rules (match your auction post + server hard max) ----
  const createdAt = useMemo(
    () => new Date(initialProduct?.createdAt),
    [initialProduct?.createdAt],
  );
  const HARD_MAX_DATE = useMemo(
    () => new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
    [createdAt],
  );

  // Min: now + 3 minutes (same as post)
  const minEndsLocal = useMemo(
    () => toLocalInputValue(new Date(Date.now() + 3 * 60 * 1000)),
    [],
  );
  const maxEndsLocal = useMemo(
    () => toLocalInputValue(HARD_MAX_DATE),
    [HARD_MAX_DATE],
  );

  const [form, setForm] = useState({
    title: initialProduct?.title || "",
    description: initialProduct?.description || "",
    category: initialProduct?.category || "",
    condition: initialProduct?.condition || "",
    location: initialProduct?.location || "",
    startingPrice:
      initialProduct?.startingPrice != null
        ? String(initialProduct.startingPrice)
        : "",
    auctionEndsAtLocal: initialProduct?.auctionEndsAt
      ? toLocalInputValue(initialProduct.auctionEndsAt)
      : "",
  });

  // same image editing approach as Donation Edit
  const [images, setImages] = useState(
    (initialProduct?.images || []).map((url) => ({ url })),
  );

  const defIdx =
    (initialProduct?.images || []).findIndex(
      (u) => u === initialProduct?.defaultImage,
    ) ?? -1;
  const [defaultIndex, setDefaultIndex] = useState(defIdx >= 0 ? defIdx : 0);

  const [loading, setLoading] = useState(false);

  // ---- handlers ----
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "startingPrice" && Number(value) < 0) return;
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

  function removeImage(index) {
    const next = [...images];
    next.splice(index, 1);
    setImages(next);

    // keep defaultIndex valid
    if (defaultIndex === index) setDefaultIndex(0);
    else if (index < defaultIndex) setDefaultIndex((prev) => prev - 1);
  }

  async function handleUpdate() {
    // client-side guard: ended auctions cannot be edited
    if (
      initialProduct?.auctionEndsAt &&
      new Date(initialProduct.auctionEndsAt) <= new Date()
    ) {
      alert("Editing is closed after the auction ends.");
      return;
    }

    const { title, category, condition, startingPrice, auctionEndsAtLocal } =
      form;

    if (!title || !category || !condition) {
      alert("Please fill in all required fields.");
      return;
    }

    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    const sp = Number(startingPrice);
    // IMPORTANT: match your API rule (>= 10)
    if (!Number.isFinite(sp) || sp < 10) {
      alert("Starting price must be at least ฿10.");
      return;
    }

    if (!auctionEndsAtLocal) {
      alert("Please set an auction deadline.");
      return;
    }

    // validate deadline range: min now+3m, max createdAt+14d
    const chosen = new Date(auctionEndsAtLocal);
    const min = new Date(minEndsLocal);
    const max = new Date(maxEndsLocal);

    if (Number.isNaN(chosen.getTime()) || chosen < min || chosen > max) {
      alert(
        `Please choose an auction deadline between ${fmtBKK(min)} and ${fmtBKK(max)}.`,
      );
      return;
    }

    try {
      setLoading(true);

      // upload only NEW files
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
        }),
      );

      const defaultImage = finalImages[defaultIndex] ?? finalImages[0];

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        location: form.location,
        type: "auction",
        price: 0, // keep schema happy
        startingPrice: sp,
        auctionEndsAt: new Date(form.auctionEndsAtLocal).toISOString(),
        images: finalImages,
        defaultImage,
      };

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.replace(`/auction/${id}`);
        router.refresh();
        return;
      }

      const msg = await res.text();
      alert(msg || "Error updating auction.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating.");
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />

      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        <div className="flex justify-start items-center mb-6">
          <h1 className="text-2xl font-bold text-[#325082]">Edit Auction</h1>
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
              <div className="border border-dashed border-[#325082] rounded-md h-[80px] flex items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition duration-200 text-sm">
                <span>Click to upload or drag files</span>
              </div>
            </div>

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
                      onClick={() => removeImage(index)}
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

            {/* Starting price + deadline */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                name="startingPrice"
                value={form.startingPrice}
                onChange={handleChange}
                type="number"
                min="10"
                step="1"
                placeholder="Starting Price (฿) *"
                className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-full sm:w-1/2"
              />

              <input
                type="datetime-local"
                name="auctionEndsAtLocal"
                value={form.auctionEndsAtLocal || ""}
                onChange={handleChange}
                min={minEndsLocal}
                max={maxEndsLocal}
                className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-full sm:w-1/2"
                placeholder="Auction deadline *"
              />
            </div>

            <p className="text-xs text-gray-500 -mt-2 ml-1">
              Allowed deadline range: {fmtBKK(new Date(minEndsLocal))} →{" "}
              {fmtBKK(new Date(maxEndsLocal))}
            </p>

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
            onClick={() => router.push(`/auction/${id}`)}
            disabled={loading}
          />
          <ActionButton
            text={loading ? "Saving..." : "Update Auction"}
            variant="primaryClick"
            onClick={handleUpdate}
            disabled={loading}
          />
        </div>
      </main>
    </>
  );
}
