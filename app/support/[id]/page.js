// app/support/[id]/page.js
import NavBar from "@/components/NavBar";
import SupportTicketClient from "./SupportTicketClient";

export default async function SupportTicketPage({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const id = p?.id;

  return (
    <>
      <NavBar />
      <SupportTicketClient id={id} />
    </>
  );
}
