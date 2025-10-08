"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import Stepper from "@/components/Stepper";
import timeAgo, { toLocalInputValue, fmtBKK } from "@/utils/timeAgo";

export default function DonationPostClient({ initialLocation = "" }) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/donation");
  }, [router]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    location: initialLocation,
    donationMode: "instant", // "instant" | "selective"
    requestDeadlineLocal: "", // for selective → datetime-local
  });

  const [images, setImages] = useState([]); // array of File
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "donationMode") {
      setForm((prev) => ({
        ...prev,
        donationMode: value,
        // wipe previously chosen deadline when returning to instant
        requestDeadlineLocal:
          value === "instant" ? "" : prev.requestDeadlineLocal,
      }));
      return;
    }

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

    // …inside handleSubmit, after existing required-field checks:
    if (donationMode === "selective") {
      const chosen = new Date(requestDeadlineLocal);
      const min = new Date(minDeadlineLocal);
      const max = new Date(maxDeadlineLocal);

      // if invalid or outside [min, max], stop before any upload happens
      if (Number.isNaN(chosen.getTime()) || chosen < min || chosen > max) {
        alert(
          `Please choose a deadline between ${fmtBKK(min)} and ${fmtBKK(max)}.`
        );
        return; // <-- prevents Cloudinary uploads
      }
    }

    setLoading(true); // move this AFTER the validation above

    try {
      setLoading(true);

      // 1) Upload images
      const uploadedUrls = await Promise.all(
        images.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!data.url) throw new Error("Upload failed");
          return data.url;
        })
      );

      const defaultImage = uploadedUrls[defaultIndex];

      // 2) Build payload for /api/products
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        location: form.location,
        type: "donation",
        price: 0, // locked at zero
        donationMode,
        images: uploadedUrls,
        defaultImage,
      };

      if (donationMode === "selective") {
        // Convert datetime-local to ISO
        const iso = new Date(form.requestDeadlineLocal).toISOString();
        payload.requestDeadline = iso;
      }

      // 3) Create product
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.replace("/donation");
        return; // stop here, don't unset loading afterwards
      }

      const msg = await res.text();
      alert(msg || "Error submitting donation.");
      setLoading(false);
    } catch (err) {
      alert("Something went wrong.");
      setLoading(false);
    }
  };

  // Min = now + 1h; Max = now + 14 days (match API)
  const minDeadlineLocal = toLocalInputValue(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  const maxDeadlineLocal = toLocalInputValue(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  return (
    <main className="max-w-[1200px] mx-auto mb-6 px-3">
      {/* Top Bar */}
      <div className="flex justify-start items-center mb-6">
        <h1 className="text-2xl font-bold text-[#325082]">Donate an Item</h1>
      </div>

      {/* Progress Stepper (seller-style for posting) */}
      <div className="mb-5">
        <Stepper current={1} variant="seller" className="px-1" />
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

          {/* No price input for donation */}

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

          {/* Donation mode + deadline */}
          <div className="flex gap-3">
            <select
              name="donationMode"
              value={form.donationMode}
              onChange={handleChange}
              className="bg-[#f1f1f1] p-3 max-sm:px-1 rounded-[8px] outline-none w-1/2"
            >
              <option value="instant">Instant (first-come)</option>
              <option value="selective">
                Selective (you choose recipient)
              </option>
            </select>

            <input
              type="datetime-local"
              name="requestDeadlineLocal"
              value={form.requestDeadlineLocal || ""} // always controlled
              onChange={handleChange}
              min={minDeadlineLocal}
              max={maxDeadlineLocal} // 14-day cap
              disabled={form.donationMode !== "selective"}
              className={`bg-[#f1f1f1] p-3 rounded-[8px] outline-none w-1/2 ${
                form.donationMode !== "selective" ? "opacity-60" : ""
              }`}
              placeholder="Request deadline"
            />
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

      <div className="flex justify-between mt-3 pt-4 border-t border-[#e7ecf8]">
        <ActionButton
          text="Cancel"
          variant="outlineClick"
          onClick={() => router.push("/donation")}
          disabled={loading}
        />
        <ActionButton
          text={loading ? "Processing..." : "Confirm To Donate"}
          variant="primaryClick"
          onClick={handleSubmit}
          disabled={loading}
        />
      </div>
    </main>
  );
}
