import "@/app/globals.css";
import LoadingOverlay from "@/components/LoadingOverlay";
import ChatbotWidget from "@/components/ChatbotWidget"; // ✅ ADD THIS

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

        {/* Global AI Chatbot */}
        <ChatbotWidget />

        {/* Global page-loading overlay */}
        <LoadingOverlay />
      </body>
    </html>
  );
}
