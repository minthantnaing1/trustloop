"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import { toLocalInputValue } from "@/utils/timeAgo";

export default function EditDonationClient({ initialProduct }) {
  const router = useRouter();
  const id = initialProduct?._id;

  const [form, setForm] = useState({
    title: initialProduct?.title || "",
    description: initialProduct?.description || "",
    category: initialProduct?.category || "",
    condition: initialProduct?.condition || "",
    location: initialProduct?.location || "",
    donationMode: initialProduct?.donationMode || "instant",
    requestDeadlineLocal: initialProduct?.requestDeadline
      ? toLocalInputValue(initialProduct.requestDeadline)
      : "",
  });

  const [images, setImages] = useState(
    (initialProduct?.images || []).map((url) => ({ url }))
  );
  const def =
    (initialProduct?.images || []).findIndex(
      (u) => u === initialProduct?.defaultImage
    ) ?? -1;
  const [defaultIndex, setDefaultIndex] = useState(def >= 0 ? def : 0);
  const [loading, setLoading] = useState(false);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "donationMode") {
      setForm((prev) => {
        let nextDeadline = prev.requestDeadlineLocal;
        if (value === "instant") {
          nextDeadline = "";
        } else if (value === "selective" && nextDeadline) {
          // clamp if user had a too-far date
          const chosen = new Date(nextDeadline);
          if (chosen > HARD_MAX_DATE) nextDeadline = "";
        }
        return {
          ...prev,
          donationMode: value,
          requestDeadlineLocal: nextDeadline,
        };
      });
      return;
    }

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
    const { title, category, condition, donationMode, requestDeadlineLocal } =
      form;
    if (!title || !category || !condition) {
      alert("Please fill in all required fields.");
      return;
    }
    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }
    if (donationMode === "selective" && !requestDeadlineLocal) {
      alert("Please set a request deadline for selective donation.");
      return;
    }

    try {
      setLoading(true);

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

      if (donationMode === "selective" && form.requestDeadlineLocal) {
        const chosen = new Date(form.requestDeadlineLocal);
        if (chosen > HARD_MAX_DATE) {
          alert(
            "The request deadline cannot be later than 14 days from when the item was first posted."
          );
          setLoading(false);
          return;
        }
      }

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        location: form.location,
        type: "donation",
        price: 0,
        donationMode,
        images: finalImages,
        defaultImage,
      };

      if (donationMode === "selective") {
        payload.requestDeadline = new Date(
          form.requestDeadlineLocal
        ).toISOString();
      } else {
        payload.requestDeadline = null;
      }

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.replace(`/donation/${id}`);
        router.refresh();
        return;
      }

      const msg = await res.text();
      alert(msg || "Error updating donation.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating.");
      setLoading(false);
    }
  };

  // limit deadline (1h min, hard max = createdAt + 14 days)
  const createdAt = new Date(initialProduct?.createdAt);
  const HARD_MAX_DATE = new Date(
    createdAt.getTime() + 14 * 24 * 60 * 60 * 1000
  );

  const minDeadlineLocal = toLocalInputValue(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const maxDeadlineLocal = toLocalInputValue(HARD_MAX_DATE);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-5">
        {/* Top Bar */}
        <div className="flex justify-start items-center mb-6">
          <h1 className="text-2xl font-bold text-[#325082]">Edit Donation</h1>
        </div>

        <div className="flex flex-col lg:flex-row flex-wrap gap-[30px] items-start">
          {/* Upload Section */}
          <div className="flex-1 w-full sm:h-[364px] min-w-[250px] bg-[#f1f1f1] rounded-[12px] p-4 flex flex-col justify-start">
            <label className="block text-[#325082] font-semibold mb-3">
              Change Images (max 5)
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
              placeholder="Donation Title *"
              value={form.title}
              onChange={handleChange}
              className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none"
            />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Description"
              className="bg-[#f1f1f1] p-3 rounded-[8px] min-h-[80px] outline-none"
            />

            <div className="flex gap-3">
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-1/2"
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
                className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-1/2"
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

            <div className="flex gap-3 items-start">
              <select
                name="donationMode"
                value={form.donationMode}
                onChange={handleChange}
                className="bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-1/2"
              >
                <option value="instant">Instant (first-come)</option>
                <option value="selective">
                  Selective (you choose recipient)
                </option>
              </select>

              <div className="flex items-start w-1/2 justify-between">
                <input
                  type="datetime-local"
                  name="requestDeadlineLocal"
                  value={form.requestDeadlineLocal || ""}
                  onChange={handleChange}
                  min={minDeadlineLocal}
                  max={maxDeadlineLocal}
                  disabled={form.donationMode !== "selective"}
                  className={`bg-[#f1f1f1] p-3 rounded-[8px] outline-none flex-1 ${
                    form.donationMode !== "selective" ? "opacity-60" : ""
                  }`}
                  placeholder="Request deadline"
                />
                {form.donationMode === "selective" && (
                  <p className="ml-2 text-xs text-gray-500 text-right leading-tight whitespace-nowrap">
                    Max allowed:
                    <br />
                    {maxDeadlineLocal.split("T")[0]}
                    <br />
                    {new Date(maxDeadlineLocal).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
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
            onClick={() => router.push(`/donation/${id}`)}
            disabled={loading}
          />
          <ActionButton
            text={loading ? "Saving..." : "Update Donation"}
            variant="primaryClick"
            onClick={handleUpdate}
            disabled={loading}
          />
        </div>
      </main>
    </>
  );
}
