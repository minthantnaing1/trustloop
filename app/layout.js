import "@/app/globals.css";
import LoadingOverlay from "@/components/LoadingOverlay";
import Chatbot from "@/components/Chatbot";

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
        <LoadingOverlay />
        <Chatbot />
      </body>
    </html>
  );
}
