"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function EditForm({ initialUser, nextPath = "" }) {
  const [user, setUser] = useState(initialUser);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        image: user.image,
        phone: user.phone,
        faculty: user.faculty,
        year: user.year,
        location: user.location,
        defaultScanCode: user.defaultScanCode,
        bankAccountName: user.bankAccountName,
        bankAccountNumber: user.bankAccountNumber,
      }),
    });
    if (res.ok) {
      router.push(nextPath || "/profile");
    } else {
      alert("Failed to update profile.");
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="min-w-0 md:flex-1 md:basis-1/2 space-y-2 md:space-y-3">
          <label className="block text-sm font-medium text-gray-600">
            Full Name
          </label>
          <input
            name="name"
            value={user.name || ""}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <label className="block text-sm font-medium text-gray-600">
            Profile Image
          </label>
          <div
            onClick={() => document.getElementById("profileImageInput").click()}
            className="border border-dashed border-[#325082] rounded-md h-[160px] flex flex-col items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition duration-200 text-sm relative cursor-pointer px-4"
          >
            <input
              id="profileImageInput"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setUser({ ...user, image: reader.result });
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            <div className="flex items-center justify-center text-[#325082] mb-2">
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
              Upload Image
            </div>
            {user.image && user.image !== "/default-profile.jpg" && (
              <div className="relative">
                <img
                  src={user.image}
                  alt="Profile Preview"
                  className="w-[100px] h-[100px] object-cover rounded-full"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUser({ ...user, image: "/default-profile.jpg" });
                  }}
                  className="absolute top-[0px] right-[0px] bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <label className="block text-sm font-medium text-gray-600">
            Phone Number
          </label>
          <input
            name="phone"
            value={user.phone || ""}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <label className="block text-sm font-medium text-gray-600">
            Faculty
          </label>
          <input
            name="faculty"
            value={user.faculty || ""}
            onChange={handleChange}
            placeholder="Faculty"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <label className="block text-sm font-medium text-gray-600">
            Academic Year
          </label>
          <select
            name="year"
            value={user.year || ""}
            onChange={handleChange}
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          >
            <option value="" disabled>
              Select Academic Year
            </option>
            <option value="Freshman">Freshman</option>
            <option value="Sophomore">Sophomore</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
          </select>
        </div>

        <div className="min-w-0 md:flex-1 md:basis-1/2 space-y-2 md:space-y-3">
          <label className="block text-sm font-medium text-gray-600">
            Default Location
          </label>
          <input
            name="location"
            value={user.location || ""}
            onChange={handleChange}
            placeholder="Default location (e.g., King Solomon, Queen of Sheba, etc.)"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />
          <p className="text-xs text-gray-500 -mt-2">
            Used as your default meet-up / delivery location at checkout (you
            can override per order).
          </p>

          <label className="block text-sm font-medium text-gray-600">
            Default Scan Code (QR)
          </label>
          <div
            onClick={() => document.getElementById("scanCodeInput").click()}
            className="border border-dashed border-[#325082] rounded-md h-[180px] flex flex-col items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition duration-200 text-sm relative cursor-pointer px-4"
          >
            <input
              id="scanCodeInput"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setUser({ ...user, defaultScanCode: reader.result });
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            <div className="text-[#325082] mb-2">Upload QR / Scan Code</div>
            {user.defaultScanCode && (
              <div className="relative">
                <img
                  src={user.defaultScanCode}
                  alt="Scan Code Preview"
                  className="w-[120px] h-[120px] object-contain rounded-md bg-white p-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUser({ ...user, defaultScanCode: "" });
                  }}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <label className="block text-sm font-medium text-gray-600">
            Bank Account Name
          </label>
          <input
            name="bankAccountName"
            value={user.bankAccountName || ""}
            onChange={handleChange}
            placeholder="Bank Account Name"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <label className="block text-sm font-medium text-gray-600">
            Bank Account Number
          </label>
          <input
            name="bankAccountNumber"
            value={user.bankAccountNumber || ""}
            onChange={handleChange}
            placeholder="Bank Account Number"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />
        </div>
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t border-[#e7ecf8]">
        <ActionButton
          text="Cancel"
          variant="outlineClick"
          onClick={() => router.push(nextPath || "/profile")}
        />
        <ActionButton
          text={saving ? "Saving..." : "Save Changes"}
          variant="primaryClick"
          onClick={handleSave}
          disabled={saving}
        />
      </div>
    </div>
  );
}
