"use client";
import Link from "next/link";
import Image from "next/image";

function NavBar() {
  return (
    <header className="nav-container">
      <div className="nav-left">
        <Image src="/TrustLoopLogoW.png" alt="Logo" height={75} width={100} />
      </div>

      <div className="nav-mid">
        <p>Welcome to TrustLoop</p>
        <ul className="nav-link">
          <li>
            <Link href="/home">HOME</Link>
          </li>
          <li>
            <Link href="/buy-sell">BUY & SELL</Link>
          </li>
          <li>
            <Link href="/auction">AUCTION</Link>
          </li>
          <li>
            <Link href="/donation">DONATION</Link>
          </li>
        </ul>
      </div>

      <div className="nav-right">
        <span>🛒</span>
        <span>❤️</span>
        <span>⚙️</span>
      </div>
    </header>
  );
}

export default NavBar;
