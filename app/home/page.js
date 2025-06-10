import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Image from "next/image";

export default async function HomePage() {
  const session = await auth();

  await connectDB();

  let user = await User.findOne({ email: session.user.email }); // can use lean() if only data is showing

  if (!user) {
    const isAdmin = session.user.email === "u6530233@au.edu";

    user = await User.create({
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role: isAdmin ? "admin" : "user",
    });
  }

  return (
    <>
      {/* Navigation */}
      <header className="nav-container">
        <div className="nav-left">
          <img
            src="/TrustLoopLogoW.png"
            alt="Website Logo"
            height="75px"
            width="100px"
          />
        </div>

        <div className="nav-mid">
          <p>Welcome to TrustLoop</p>
          <ul className="nav-link">
            <li>HOME</li>
            <li>BUY</li>
            <li>SELL</li>
            <li>AUCTION</li>
            <li>DONATION</li>
          </ul>
        </div>

        <div className="nav-right">
          <span>🛒</span>
          <span>❤️</span>
          <span>⚙️</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="home-content">
        <section className="home-top-section">
          {/* Profile */}
          <div className="home-profile-box">
            <div className="home-profile-img">
              {user.image ? (
                <Image
                  src={user.image}
                  width={100}
                  height={100}
                  alt="Profile"
                  className="home-circle-img"
                />
              ) : (
                <div className="home-circle-placeholder"></div>
              )}
            </div>
            <div className="home-profile-info">
              <p className="home-name">{user.name}</p>
              <p>{user.email.split("@")[0]}</p>
              <p>{user.faculty || "Faculty not set"}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="home-stats-box">
            <div className="home-stat">
              <p>Free Post</p>
              <strong>{user.postingCredits} Left</strong>
            </div>
            <div className="home-stat">
              <p>Rating</p>
              <div className="home-stars">
                {"★".repeat(Math.round(user.rating)) +
                  "☆".repeat(5 - Math.round(user.rating))}
              </div>
            </div>
            <div className="home-stat">
              <p>Badge</p>
              <strong>{user.badges?.[0] || "None"}</strong>
            </div>
            <div className="home-stat">
              <p>Spending</p>
              <strong>฿{user.expenses}</strong>
            </div>
            <div className="home-stat">
              <p>Revenue</p>
              <strong>฿{user.revenue}</strong>
            </div>
            <div className="home-stat">
              <a className="home-transactions-link" href="#">
                More Transactions
              </a>
            </div>
          </div>
        </section>

        {/* Bought Items */}
        <section className="home-item-section">
          <h2>Your Bought Items</h2>
          <div className="home-item-grid">
            {[...Array(4)].map((_, i) => (
              <div className="home-item-card" key={`bought-${i}`} />
            ))}
          </div>
        </section>

        {/* Sold Items */}
        <section className="home-item-section">
          <h2>Your Sold Items</h2>
          <div className="home-item-grid">
            {[...Array(4)].map((_, i) => (
              <div className="home-item-card" key={`sold-${i}`} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
