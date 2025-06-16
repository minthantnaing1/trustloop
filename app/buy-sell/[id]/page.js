import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
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
      <main className="product-detail-wrapper">
        <div className="product-detail-content">
          {/* Left side: Product Image */}
          <div className="product-images">
            <div className="main-image">
              <div className="image-placeholder" />
            </div>
            <div className="thumbnail-row">
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <div key={idx} className="thumbnail-placeholder" />
                ))}
            </div>
          </div>

          {/* Right side: Product Info */}
          <div className="product-info">
            <h2 className="product-title">{product.title}</h2>
            <p className="product-category">Category: {product.category}</p>
            <p className="product-price">
              Baht <b>{product.price}</b>
            </p>

            <div className="product-buttons">
              <button className="add-cart">ADD TO CART 🛒</button>
              <button className="buy-now">BUY NOW</button>
              <button className="fav-btn">♡</button>
            </div>

            <div className="info-box">
              Description: {product.description || "-"}
            </div>
            <div className="info-box">
              Meetup Location: {product.location || "-"}
            </div>

            <div className="comment-box">
              <p>Comment</p>
              <input
                type="text"
                placeholder="Ask Questions about Products..."
              />
            </div>

            <div className="seller-box">
              <Image
                src={product.owner.image}
                alt="Seller Image"
                width={50}
                height={50}
                className="seller-img"
              />
              <div className="seller-info">
                <h3>Seller:</h3>
                <p className="seller-name">{product.owner.name}</p>
                <p className="seller-email">{product.owner.email}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
