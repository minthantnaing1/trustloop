import AdminSupportDetailsClient from "./AdminSupportDetailsClient";

export default async function AdminSupportDetailsPage({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const id = p?.id;
  return <AdminSupportDetailsClient id={id} />;
}
