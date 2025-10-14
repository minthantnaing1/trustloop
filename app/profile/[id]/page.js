// app/profile/[id]/page.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import MaskedUserId from "@/components/MaskedUserId";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }) {
  await connectDB();

  const user = await User.findById(params.id)
    .select("name email image faculty year rating badges")
    .lean();

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">
            Seller Profile (Public)
          </h1>
          <BackButton />
        </div>
        {/* Not found */}
        {!user ? (
          <div className="mt-10 text-center text-gray-500">User not found.</div>
        ) : (
          <>
            {/* Top Section (matches your profile top card styling) */}
            <section className="flex flex-wrap justify-between items-start gap-5">
              {/* Profile Box */}
              <div className="flex-1 min-w-[300px]">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-white rounded-[10px] p-4 max-w-[450px] sm:ml-[110px] mx-auto">
                  {user.image ? (
                    <Image
                      src={user.image}
                      width={120}
                      height={120}
                      alt="Profile"
                      className="rounded-full object-cover w-[120px] h-[120px]"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-[#ddd] rounded-full" />
                  )}
                  <div className="flex flex-col gap-2 text-center sm:text-left">
                    <p className="font-bold text-[18px]">{user.name}</p>
                    <p>
                      <MaskedUserId email={user.email} />
                    </p>
                    <p>{user.faculty || "Faculty not set"}</p>
                    <p>{user.year || "Year not set"}</p>
                  </div>
                </div>
              </div>

              {/* Right: Rating box to keep balance with your UI */}
              <div className="flex-1 min-w-[300px] flex flex-wrap gap-3 items-start justify-end">
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
                  <p>Rating</p>
                  <div className="text-[#ffcc00] text-[21px]">
                    {(() => {
                      const r = Math.round(user.rating || 0);
                      return "★".repeat(r) + "☆".repeat(5 - r);
                    })()}
                  </div>
                </div>
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
                  <p>Badge</p>
                  <strong>{(user.badges && user.badges[0]) || "None"}</strong>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
