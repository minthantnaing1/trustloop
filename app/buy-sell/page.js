// app/buy-sell/page.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default async function BuySellPage() {
  const session = await auth();
  if (!session?.user?.email) return null;

  await connectDB();
  const products = await Product.find({ isAvailable: true }).lean();
  const userEmail = session.user.email;

  return (
    <>
      {/* Top Section */}
      <NavBar />

      {/* Search + Sell Button */}
      <div className="buy-sell-toolbar">
        <h2>Items</h2>
        <input
          className="buy-sell-search"
          placeholder="Search for anything..."
        />
        <Link href="/sell">
          <button className="buy-sell-sell-btn">+ Sell Your Items</button>
        </Link>
      </div>

      {/* Product Grid */}
      <section className="buy-sell-items">
        <div className="buy-sell-grid">
          {products.map((product) => {
            const isOwner = product.owner?.email === userEmail;

            return (
              <div key={product._id} className="buy-sell-card">
                <div className="buy-sell-card-img" />

                <div className="buy-sell-card-info">
                  <h4 className="buy-sell-card-title">{product.title}</h4>
                  <p className="buy-sell-card-category">{product.category}</p>
                </div>

                <div className="buy-sell-card-actions">
                  <Link
                    href={`/buy-sell/${product._id}`}
                    className="buy-sell-detail-btn"
                  >
                    More Detail...
                  </Link>
                  {!isOwner && (
                    <button className="buy-sell-cart-btn">Add To Cart</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
