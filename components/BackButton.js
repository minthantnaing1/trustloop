"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export default function BackButton({ text, href }) {
  const router = useRouter();

  const handleClick = () => {
    if (!href) {
      router.back();
    }
  };

  const content = (
    <>
      <ChevronLeftIcon className="h-4 w-4" />
      {text || "Back to Previous Page"}
    </>
  );

  if (href) {
    // If href is provided → behave like a Link
    return (
      <Link
        href={href}
        className="text-[#325082] text-sm hover:underline flex items-center gap-1"
      >
        {content}
      </Link>
    );
  }

  // Default → router.back()
  return (
    <button
      onClick={handleClick}
      className="text-[#325082] text-[15px] hover:underline flex items-center gap-1"
    >
      {content}
    </button>
  );
}
