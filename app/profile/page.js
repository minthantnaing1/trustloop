import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Link from "next/link"; // add this import
import User from "@/models/User";
import Image from "next/image";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";

export default async function ProfilePage() {
  const session = await auth();
  await connectDB();

  let user = await User.findOne({ email: session.user.email });

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[110px] mb-5 px-5">
        {/* Edit Button - Top Right */}
        <div className="flex justify-end mb-4">
          <Link href="/profile/edit">
            <ActionButton text="Edit Profile" variant="primaryClick" />
          </Link>
        </div>
        {/* Top Section */}
        <section className="flex flex-wrap gap-5 mb-5">
          {/* Profile Box */}
          <div className="flex-1 min-w-[250px] bg-white rounded-[10px] p-5 flex flex-col items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                width={100}
                height={100}
                alt="Profile"
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-[100px] h-[100px] bg-[#ddd] rounded-full"></div>
            )}

            <div className="text-center">
              <p className="font-bold text-[18px]">{user.name}</p>
              <p>{user.email.split("@")[0]}</p>
              <p>{user.faculty || "Faculty not set"}</p>
            </div>
          </div>

          {/* Stats Box */}
          <div className="flex-1 min-w-[300px] flex flex-wrap gap-3 items-start">
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Free Post</p>
              <strong>{user.postingCredits} Left</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Rating</p>
              <div className="text-[#ffcc00] text-[18px]">
                {"★".repeat(Math.round(user.rating)) +
                  "☆".repeat(5 - Math.round(user.rating))}
              </div>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Badge</p>
              <strong>{user.badges?.[0] || "None"}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Spending</p>
              <strong>฿{user.expenses}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Revenue</p>
              <strong>฿{user.revenue}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <a href="#" className="text-blue-800 underline">
                More Transactions
              </a>
            </div>
          </div>
        </section>

        {/* Bought Items */}
        <section className="mb-8">
          <h2 className="text-[16px] mb-2">Your Bought Items</h2>
          <div className="flex flex-wrap gap-[15px]">
            {[...Array(4)].map((_, i) => (
              <div
                key={`bought-${i}`}
                className="flex-1 min-w-[150px] h-[150px] bg-[#e2e2e2] rounded-[10px]"
              />
            ))}
          </div>
        </section>

        {/* Sold Items */}
        <section className="mb-8">
          <h2 className="text-[16px] mb-2">Your Sold Items</h2>
          <div className="flex flex-wrap gap-[15px]">
            {[...Array(4)].map((_, i) => (
              <div
                key={`sold-${i}`}
                className="flex-1 min-w-[150px] h-[150px] bg-[#e2e2e2] rounded-[10px]"
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
