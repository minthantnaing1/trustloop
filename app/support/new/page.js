// app/support/new/page.js
import NavBar from "@/components/NavBar";
import SupportReportClient from "./SupportReportClient";

export default function SupportNewPage() {
  return (
    <>
      <NavBar />
      <SupportReportClient mode="new" />
    </>
  );
}
