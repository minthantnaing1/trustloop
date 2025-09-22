"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // if missing, swap to <textarea>
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Heart, Users, Gift } from "lucide-react";

export default function DonatePage() {
  const router = useRouter();

  // ===== form + image state =====
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    location: "",
    contactMethod: "",
    contactInfo: "",
  });

  const [images, setImages] = useState([]); // array<File>
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // ===== handlers brought from your first code =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      alert("You can only upload up to 5 images.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    if (images.length === 0) setDefaultIndex(0);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    const { title, category, condition } = form;

    if (!title || !category || !condition) {
      alert("Please fill in all required fields.");
      return;
    }

    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    try {
      setLoading(true);

      // Upload images to your /api/upload (as in your first code)
      const uploadedUrls = [];
      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!data?.url) throw new Error("Upload failed");
        uploadedUrls.push(data.url);
      }

      const defaultImage = uploadedUrls[defaultIndex];

      // Create donation product
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type: "donation",
          price: 0,
          images: uploadedUrls,
          defaultImage,
        }),
      });

      if (res.ok) {
        router.push("/donation");
      } else {
        alert("Error submitting product.");
      }
    } catch (err) {
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header from layout */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/donation"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Marketplace</span>
            </Link>
            <div className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Donate an Item</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-red-500" />
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Share with Your Community</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Help fellow students by donating items you no longer need. Every donation makes a difference!
          </p>
        </div>

        {/* Top action bar (ActionButton from your first code) */}
        <div className="flex justify-between items-center mb-6">
          <ActionButton
            text="Cancel"
            variant="outlineClick"
            onClick={() => router.push("/donation")}
            disabled={loading}
          />
          <div className="text-[#325082] font-semibold" />
          <ActionButton
            text={loading ? "Processing..." : "Confirm To Donate"}
            variant="primaryClick"
            onClick={handleSubmit}
            disabled={loading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl text-slate-900">Item Details</CardTitle>
                <CardDescription className="text-slate-600">
                  Provide information about the item you'd like to donate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Photos (functional uploader + preview grid) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Photos (max 5) *</Label>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 mb-2">Click to upload or drag files here</p>
                        <p className="text-xs text-slate-500">Add up to 5 photos</p>
                        <Button type="button" variant="outline" className="mt-3 bg-transparent pointer-events-none">
                          Choose Files
                        </Button>
                      </div>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {images.map((file, index) => {
                          const preview = URL.createObjectURL(file);
                          return (
                            <div
                              key={index}
                              className={`relative border-2 rounded-md overflow-hidden ${
                                defaultIndex === index ? "border-blue-600" : "border-slate-200"
                              }`}
                            >
                              <img
                                src={preview}
                                alt={`Preview ${index}`}
                                className="w-full h-[90px] object-cover cursor-pointer"
                                onClick={() => setDefaultIndex(index)}
                              />
                              {defaultIndex === index && (
                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...images];
                                  next.splice(index, 1);
                                  setImages(next);
                                  if (defaultIndex === index) setDefaultIndex(0);
                                  else if (index < defaultIndex) setDefaultIndex((p) => Math.max(0, p - 1));
                                }}
                                className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-700"
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                      Item Title *
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Mini Fridge, Desk Lamp, Textbooks"
                      value={form.title}
                      onChange={handleChange}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe the item, its condition, and why you're donating it..."
                      value={form.description}
                      onChange={handleChange}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 min-h-[120px]"
                      required
                    />
                  </div>

                  {/* Category / Condition */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Category *</Label>
                      <Select
                        value={form.category || undefined}
                        onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="furniture">Furniture</SelectItem>
                          <SelectItem value="books">Books & Textbooks</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Condition *</Label>
                      <Select
                        value={form.condition || undefined}
                        onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">new</SelectItem>
                          <SelectItem value="like new">like new</SelectItem>
                          <SelectItem value="used">used</SelectItem>
                          <SelectItem value="poor">poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-slate-700">
                      Pickup Location *
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., North Campus, Smith Hall, Off-campus apartment"
                      value={form.location}
                      onChange={handleChange}
                      className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Contact */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Preferred Contact Method *</Label>
                      <Select
                        value={form.contactMethod || undefined}
                        onValueChange={(v) => setForm((p) => ({ ...p, contactMethod: v }))}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="How should people contact you?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone/Text</SelectItem>
                          <SelectItem value="both">Both Email & Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactInfo" className="text-sm font-medium text-slate-700">
                        Contact Information *
                      </Label>
                      <Input
                        id="contactInfo"
                        name="contactInfo"
                        placeholder="Your email or phone number"
                        value={form.contactInfo}
                        onChange={handleChange}
                        className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit as fallback (same as the Confirm button) */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-3"
                    >
                      <Gift className="h-5 w-5 mr-2" />
                      {loading ? "Processing..." : "Post Donation"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar (unchanged) */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Donation Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-slate-600">
                  <p>📸 Take clear, well-lit photos from multiple angles</p>
                  <p>✅ Be honest about condition and flaws</p>
                  <p>📍 Choose a safe, public pickup location</p>
                  <p>⏱️ Respond promptly to interested students</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Items donated this month</span>
                    <Badge className="bg-green-100 text-green-800">247</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Students helped</span>
                    <Badge className="bg-blue-100 text-blue-800">156</Badge>
                  </div>
                  <p className="text-xs text-slate-500 pt-2">
                    Join our community of generous students making campus life better for everyone!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
