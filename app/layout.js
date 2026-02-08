import "@/app/globals.css";
import LoadingOverlay from "@/components/LoadingOverlay"; // client component
import TrustLoopChatbot from "@/components/TrustLoopChatbot";

export const metadata = {
  title: "TrustLoop",
  description:
    "AU Student Marketplace — buy smart, sell safe: stay in the loop",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
        {/* Global page-loading overlay (client) */}
        <LoadingOverlay />
        <TrustLoopChatbot />
      </body>
    </html>
  );
}

