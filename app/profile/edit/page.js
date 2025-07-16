"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function ProfileEditPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  }, []);

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
      }),
    });

    if (res.ok) {
      router.push("/profile");
    } else {
      alert("Failed to update profile.");
    }
    setSaving(false);
  };

  if (loading) return <p className="mt-[120px] text-center">Loading...</p>;

  return (
    <>
      <NavBar />
      <main className="max-w-[600px] mx-auto mt-[120px] mb-10 px-4">
        <h1 className="text-xl font-semibold mb-4 text-[#325082]">
          Edit Your Profile
        </h1>

        <div className="bg-white p-5 rounded-lg shadow space-y-4">
          <input
            name="name"
            value={user.name || ""}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          {/* Image Upload Section */}
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Profile Image
          </label>

          <div className="relative mb-4">
            {/* Upload Button */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setUser({ ...user, image: reader.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="mb-3 block w-full p-2 rounded-md bg-[#f1f1f1] outline-none"
            />

            {/* Image Preview Box */}
            <div className="border border-dashed border-[#325082] rounded-md h-[140px] flex items-center justify-center text-[#325082] hover:bg-[#e6ecf5] transition duration-200 text-sm relative">
              {user.image && user.image !== "/default-profile.jpg" ? (
                <>
                  <img
                    src={user.image}
                    alt="Profile Preview"
                    className="w-[100px] h-[100px] object-cover rounded-full"
                  />
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent any accidental bubbling
                      setUser({ ...user, image: "/default-profile.jpg" });
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <span className="flex items-center justify-center text-[#325082]">
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
                  No image selected
                </span>
              )}
            </div>
          </div>

          <input
            name="phone"
            value={user.phone || ""}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <input
            name="faculty"
            value={user.faculty || ""}
            onChange={handleChange}
            placeholder="Faculty"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <input
            name="year"
            value={user.year || ""}
            onChange={handleChange}
            placeholder="Academic Year"
            className="w-full p-3 rounded-md bg-[#f1f1f1] outline-none"
          />

          <div className="flex justify-between gap-3">
            <ActionButton
              text="Cancel"
              variant="outlineClick"
              onClick={() => router.push("/profile")}
            />
            <ActionButton
              text={saving ? "Saving..." : "Save Changes"}
              variant="primaryClick"
              onClick={handleSave}
              disabled={saving}
            />
          </div>
        </div>
      </main>
    </>
  );
}
