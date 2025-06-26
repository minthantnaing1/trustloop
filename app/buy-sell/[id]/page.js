import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import NavBar from "@/components/NavBar";
import Image from "next/image";

export default async function ProductDetailPage(props) {
  const params = await props.params;
  const id = params.id;

  await connectDB();
  const product = await Product.findById(id).populate("owner").lean();

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[120px] mb-[40px] px-5">
        <div className="flex gap-[30px]">
          {/* Left side: Product Image */}
          <div className="flex-1">
            <div className="h-[300px] bg-[#ddd] rounded-[10px]" />
            <div className="flex gap-2 mt-2">
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[60px] h-[60px] bg-[#ccc] rounded-[6px]"
                  />
                ))}
            </div>
          </div>

          {/* Right side: Product Info */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-[18px] font-semibold">{product.title}</h2>
            <p className="text-[14px]">Category: {product.category}</p>
            <p className="text-[14px]">
              Baht <b>{product.price}</b>
            </p>

            <div className="flex gap-2">
              <button className="flex-1 bg-[#325082] text-white px-4 py-2 rounded-md hover:opacity-90">
                ADD TO CART 🛒
              </button>
              <button className="flex-1 bg-white border-[2px] border-[#325082] text-[#325082] px-4 py-2 rounded-md hover:opacity-90">
                BUY NOW
              </button>
              <button className="bg-white border border-[#ccc] px-4 py-2 rounded-md hover:opacity-90">
                ♡
              </button>
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description: {product.description || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Meetup Location: {product.location || "-"}
            </div>

            <div>
              <p>Comment</p>
              <input
                type="text"
                placeholder="Ask Questions about Products..."
                className="w-full p-[12px] border border-[#ccc] rounded-[6px] outline-none"
              />
            </div>

            <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <Image
                src={product.owner?.image || "/default-profile.png"}
                alt="Seller Image"
                width={50}
                height={50}
                className="rounded-full object-cover border-2 border-[#325082]"
              />
              <div className="flex flex-col">
                <h3 className="font-normal">Seller:</h3>
                <p className="font-semibold text-[#222]">
                  {product.owner?.name}
                </p>
                <p className="text-[14px] text-[#555]">
                  {product.owner?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
