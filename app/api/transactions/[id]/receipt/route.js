export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear(),
    m = pad2(dt.getMonth() + 1),
    day = pad2(dt.getDate());
  const hh = pad2(dt.getHours()),
    mm = pad2(dt.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
function money(n) {
  return `THB ${Number(n || 0).toLocaleString()}`;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const { id } = await params;

    const txn = await Transaction.findById(id)
      .populate("product")
      .populate("buyer")
      .populate("seller");
    if (!txn) return new Response("Transaction not found", { status: 404 });

    // A4 page
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 495]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    let y = 465;

    // Header bar
    page.drawRectangle({
      x: 0,
      y: y - 36,
      width: 595.28,
      height: 36,
      color: rgb(0.95, 0.97, 1),
      borderColor: rgb(0.82, 0.88, 1),
      borderWidth: 0.5,
    });
    page.drawText("TrustLoop — Purchase Receipt", {
      x: margin,
      y: y - 24,
      size: 16,
      font: bold,
      color: rgb(0.2, 0.3, 0.6),
    });
    y -= 60;

    // Meta
    page.drawText(`Receipt # ${String(txn._id)}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    page.drawText(`Date: ${fmtDate(txn.updatedAt || txn.createdAt)}`, {
      x: 320,
      y,
      size: 10,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    y -= 20;

    // Separator
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595.28 - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.95),
    });
    y -= 24;

    // Two columns: Buyer / Seller
    const colW = (595.28 - margin * 2 - 12) / 2;

    page.drawText("Buyer (Me)", {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.18, 0.28, 0.55),
    });
    page.drawText("Seller", {
      x: margin + colW + 12,
      y,
      size: 12,
      font: bold,
      color: rgb(0.18, 0.28, 0.55),
    });
    y -= 16;

    const buyerLines = [
      txn.buyer?.name || txn.buyer?.email || "-",
      txn.buyer?.email || "",
      txn.buyer?.phone || "",
    ].filter(Boolean);
    const sellerLines = [
      txn.seller?.name || txn.seller?.email || "-",
      txn.seller?.email || "",
      txn.seller?.phone || "",
    ].filter(Boolean);

    let by = y;
    buyerLines.forEach((t, i) => {
      page.drawText(t, {
        x: margin,
        y: by - i * 14,
        size: 11,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    });
    let sy = y;
    sellerLines.forEach((t, i) => {
      page.drawText(t, {
        x: margin + colW + 12,
        y: sy - i * 14,
        size: 11,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    });
    y -= Math.max(buyerLines.length, sellerLines.length) * 14 + 18;

    // Product box
    page.drawText("Item", {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.18, 0.28, 0.55),
    });
    y -= 16;
    const boxH = 90;
    page.drawRectangle({
      x: margin,
      y: y - boxH,
      width: 595.28 - margin * 2,
      height: boxH,
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });

    const leftX = margin + 12;
    const rightX = margin + 160;
    let ty = y - 18;

    const lines = [
      ["Product", txn.product?.title || "-"],
      ["Category", txn.product?.category || "-"],
      ["Condition", txn.product?.condition || "-"],
      ["Description", (txn.product?.description || "-").slice(0, 140)],
    ];
    lines.forEach(([k, v]) => {
      page.drawText(`${k}:`, {
        x: leftX,
        y: ty,
        size: 11,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      page.drawText(String(v), {
        x: leftX + 70,
        y: ty,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      ty -= 16;
    });

    // Totals box
    const totalsX = 595.28 - margin - 200;
    const totalsY = y - boxH + 12;
    page.drawRectangle({
      x: totalsX,
      y: totalsY,
      width: 200 - 12,
      height: 66,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 0.8,
    });

    function row(label, value, yrow, boldRow = false) {
      page.drawText(label, {
        x: totalsX + 10,
        y: yrow,
        size: 11,
        font: boldRow ? bold : font,
        color: rgb(0.16, 0.16, 0.16),
      });
      const text = value;
      const w = (boldRow ? bold : font).widthOfTextAtSize(text, 11);
      page.drawText(text, {
        x: totalsX + 200 - 24 - w,
        y: yrow,
        size: 11,
        font: boldRow ? bold : font,
        color: rgb(0.16, 0.16, 0.16),
      });
    }
    row("Price", money(txn.price), totalsY + 44);
    row("Platform Fee", money(txn.fee), totalsY + 28);
    row("Total Paid", money(txn.total), totalsY + 10, true);

    y = y - boxH - 28;

    // Footer
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595.28 - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.95),
    });
    y -= 18;
    page.drawText(
      "Thank you for using TrustLoop. This receipt is computer generated.",
      {
        x: margin,
        y,
        size: 10,
        font,
        color: rgb(0.35, 0.38, 0.45),
      }
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${txn._id}.pdf"`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    console.error("❌ Receipt generation error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
