// app/layout.js

import "@/app/globals.css";

export const metadata = {
  title: "TrustLoop",
  description: "AU Student Marketplace - buy smart, sell safe",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
