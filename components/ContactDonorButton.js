"use client";
import { useRouter } from "next/navigation";

export default function ContactDonorButton({ itemId }) {
  const router = useRouter();
  return (
    <button className="btn btn-primary w-full" onClick={() => router.push(`/donation/${itemId}/contact`)}>
      Contact Donor
    </button>
  );
}
