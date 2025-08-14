// app/layout.js

import "@/app/globals.css";

export const metadata = {
  title: "TrustLoop",
  description: "AU Student Marketplace - buy smart, sell safe",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style>
          @import
          url('https://fonts.googleapis.com/css2?family=Libertinus+Sans:ital,wght@0,400;0,700;1,400&display=swap');
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
