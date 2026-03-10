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
  const y = dt.getFullYear();
  const m = pad2(dt.getMonth() + 1);
  const day = pad2(dt.getDate());
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function money(n) {
  return `THB ${Number(n || 0).toLocaleString()}`;
}

function safeText(v) {
  return String(v || "-");
}

function wrapText(text, maxWidth, font, size) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);

    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function truncate(text, max = 180) {
  const s = safeText(text);
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const txn = await Transaction.findById(id)
      .populate("product")
      .populate("buyer")
      .populate("seller");

    if (!txn) {
      return new Response("Transaction not found", { status: 404 });
    }

    const email = String(session.user.email || "").toLowerCase();
    const buyerEmail = String(txn?.buyer?.email || "").toLowerCase();

    if (!buyerEmail || buyerEmail !== email) {
      return new Response("Forbidden", { status: 403 });
    }

    const kind =
      txn?.kind ||
      (String(txn?.product?.type || "").toLowerCase() === "auction"
        ? "AUCTION"
        : String(txn?.product?.type || "").toLowerCase() === "donation"
          ? "DONATION"
          : "BUY_SELL");

    // ❌ no receipt for donation because no payment is involved
    if (kind === "DONATION") {
      return new Response(
        "Donation transactions do not have payment receipts",
        {
          status: 400,
        },
      );
    }

    const isAuction = kind === "AUCTION";

    const receiptTitle = isAuction ? "Auction Receipt" : "Purchase Receipt";

    const displayLine1Label = isAuction ? "Winning Bid" : "Price";
    const displayLine1Value = isAuction ? money(txn.total) : money(txn.price);

    const displayLine2Label = "Total Paid";
    const displayLine2Value = money(txn.total);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 720]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const margin = 42;
    let y = pageHeight - 50;

    const c = {
      brand: rgb(0.196, 0.314, 0.51), // #325082
      brandDark: rgb(0.145, 0.235, 0.396),
      text: rgb(0.16, 0.18, 0.22),
      textSoft: rgb(0.4, 0.45, 0.53),
      border: rgb(0.88, 0.91, 0.96),
      soft: rgb(0.965, 0.976, 0.996),
      white: rgb(1, 1, 1),
    };

    function drawTextRight(
      text,
      xRight,
      yy,
      size = 11,
      useFont = font,
      color = c.text,
    ) {
      const w = useFont.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: xRight - w,
        y: yy,
        size,
        font: useFont,
        color,
      });
    }

    function drawLabelValueLine(label, value, x, yy, labelW, size = 11) {
      page.drawText(label, {
        x,
        y: yy,
        size,
        font,
        color: c.textSoft,
      });

      page.drawText(value, {
        x: x + labelW,
        y: yy,
        size,
        font,
        color: c.text,
      });
    }

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: c.white,
    });

    page.drawRectangle({
      x: 0,
      y: pageHeight - 8,
      width: pageWidth,
      height: 8,
      color: c.brand,
    });

    // ===== Header =====
    page.drawText("TrustLoop", {
      x: margin,
      y,
      size: 22,
      font: bold,
      color: c.brand,
    });

    page.drawText(receiptTitle, {
      x: margin,
      y: y - 24,
      size: 18,
      font: bold,
      color: c.text,
    });

    drawTextRight(
      "Buy smart, sell safe — stay in the loop.",
      pageWidth - margin,
      y - 2,
      10,
      font,
      c.textSoft,
    );

    const badgeText = "RECEIPT";
    const badgeFontSize = 9.5;
    const badgePaddingX = 10;
    const badgeW =
      bold.widthOfTextAtSize(badgeText, badgeFontSize) + badgePaddingX * 2;
    const badgeH = 20;
    const badgeX = pageWidth - margin - badgeW;
    const badgeY = y - 28;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      color: rgb(0.94, 0.97, 1),
      borderColor: rgb(0.82, 0.88, 0.96),
      borderWidth: 0.7,
    });

    page.drawText(badgeText, {
      x: badgeX + badgePaddingX,
      y: badgeY + 6,
      size: badgeFontSize,
      font: bold,
      color: c.brand,
    });

    y -= 58;

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: c.border,
    });

    y -= 22;

    // ===== Meta =====
    const metaCol1X = margin;
    const metaCol2X = 215;
    const metaCol3X = 390;

    page.drawText("Receipt Number", {
      x: metaCol1X,
      y,
      size: 9.5,
      font,
      color: c.textSoft,
    });
    page.drawText("Receipt Date", {
      x: metaCol2X,
      y,
      size: 9.5,
      font,
      color: c.textSoft,
    });
    page.drawText("Transaction Type", {
      x: metaCol3X,
      y,
      size: 9.5,
      font,
      color: c.textSoft,
    });

    y -= 14;

    page.drawText(String(txn._id), {
      x: metaCol1X,
      y,
      size: 10.5,
      font: bold,
      color: c.text,
    });
    page.drawText(fmtDate(txn.updatedAt || txn.createdAt), {
      x: metaCol2X,
      y,
      size: 10.5,
      font: bold,
      color: c.text,
    });
    page.drawText(kind.replace("_", " "), {
      x: metaCol3X,
      y,
      size: 10.5,
      font: bold,
      color: c.text,
    });

    y -= 24;

    // ===== Buyer / Seller =====
    const sectionTop = y;
    const cardGap = 18;
    const cardW = (pageWidth - margin * 2 - cardGap) / 2;
    const cardH = 92;

    function drawPartyCard(x, topY, title, person) {
      page.drawRectangle({
        x,
        y: topY - cardH,
        width: cardW,
        height: cardH,
        color: c.soft,
        borderColor: c.border,
        borderWidth: 1,
      });

      page.drawText(title, {
        x: x + 12,
        y: topY - 18,
        size: 9.5,
        font,
        color: c.textSoft,
      });

      page.drawText(person?.name || person?.email || "-", {
        x: x + 12,
        y: topY - 36,
        size: 11.5,
        font: bold,
        color: c.text,
      });

      const lines = [person?.email || "", person?.phone || ""].filter(Boolean);

      lines.forEach((line, i) => {
        page.drawText(line, {
          x: x + 12,
          y: topY - 54 - i * 14,
          size: 10,
          font,
          color: c.textSoft,
        });
      });
    }

    drawPartyCard(margin, sectionTop, "Bill To", txn.buyer);
    drawPartyCard(margin + cardW + cardGap, sectionTop, "Seller", txn.seller);

    y -= cardH + 22;

    // ===== Order Summary =====
    page.drawText("Order Summary", {
      x: margin,
      y,
      size: 12.5,
      font: bold,
      color: c.text,
    });

    y -= 12;

    const summaryTop = y;
    const summaryH = 150;

    page.drawRectangle({
      x: margin,
      y: summaryTop - summaryH,
      width: pageWidth - margin * 2,
      height: summaryH,
      color: c.white,
      borderColor: c.border,
      borderWidth: 1,
    });

    page.drawRectangle({
      x: margin,
      y: summaryTop - 30,
      width: pageWidth - margin * 2,
      height: 30,
      color: c.soft,
      borderColor: c.border,
      borderWidth: 0,
    });

    const itemColX = margin + 14;
    const detailsColX = margin + 220;
    const amountColRight = pageWidth - margin - 14;

    page.drawText("Item", {
      x: itemColX,
      y: summaryTop - 20,
      size: 9.5,
      font: bold,
      color: c.textSoft,
    });

    page.drawText("Details", {
      x: detailsColX,
      y: summaryTop - 20,
      size: 9.5,
      font: bold,
      color: c.textSoft,
    });

    drawTextRight(
      "Amount",
      amountColRight,
      summaryTop - 20,
      9.5,
      bold,
      c.textSoft,
    );

    const itemTitle = safeText(txn.product?.title);
    const itemSub = isAuction ? "Auction item" : "Marketplace item";

    page.drawText(itemTitle, {
      x: itemColX,
      y: summaryTop - 52,
      size: 11.5,
      font: bold,
      color: c.text,
    });

    page.drawText(itemSub, {
      x: itemColX,
      y: summaryTop - 69,
      size: 9.5,
      font,
      color: c.textSoft,
    });

    const detailLabelW = 58;
    let detailY = summaryTop - 52;

    drawLabelValueLine(
      "Category",
      safeText(txn.product?.category),
      detailsColX,
      detailY,
      detailLabelW,
      10,
    );
    detailY -= 16;

    drawLabelValueLine(
      "Condition",
      safeText(txn.product?.condition),
      detailsColX,
      detailY,
      detailLabelW,
      10,
    );
    detailY -= 18;

    page.drawText("Description", {
      x: detailsColX,
      y: detailY,
      size: 10,
      font,
      color: c.textSoft,
    });

    const descLines = wrapText(
      truncate(txn.product?.description || "-", 150),
      190,
      font,
      10,
    ).slice(0, 3);

    descLines.forEach((line, i) => {
      page.drawText(line, {
        x: detailsColX + detailLabelW,
        y: detailY - i * 12,
        size: 10,
        font,
        color: c.text,
      });
    });

    drawTextRight(
      displayLine2Value,
      amountColRight,
      summaryTop - 52,
      12.5,
      bold,
      c.brand,
    );

    y -= summaryH + 20;

    // ===== Payment Summary =====
    page.drawText("Payment Summary", {
      x: margin,
      y,
      size: 12.5,
      font: bold,
      color: c.text,
    });

    y -= 12;

    const payTop = y;
    const payH = 78;

    page.drawRectangle({
      x: margin,
      y: payTop - payH,
      width: pageWidth - margin * 2,
      height: payH,
      color: c.soft,
      borderColor: c.border,
      borderWidth: 1,
    });

    const leftPayX = margin + 14;
    const rightPayX = pageWidth - margin - 14;
    let rowY = payTop - 22;

    page.drawText(displayLine1Label, {
      x: leftPayX,
      y: rowY,
      size: 10.5,
      font,
      color: c.textSoft,
    });
    drawTextRight(displayLine1Value, rightPayX, rowY, 10.5, font, c.text);

    rowY -= 20;

    page.drawLine({
      start: { x: margin + 14, y: rowY + 9 },
      end: { x: pageWidth - margin - 14, y: rowY + 9 },
      thickness: 0.8,
      color: c.border,
    });

    page.drawText(displayLine2Label, {
      x: leftPayX,
      y: rowY - 5,
      size: 11.5,
      font: bold,
      color: c.text,
    });
    drawTextRight(displayLine2Value, rightPayX, rowY - 5, 11.5, bold, c.brand);

    y -= payH + 20;

    // ===== Footer =====
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: c.border,
    });

    y -= 16;

    page.drawText("Thank you for choosing TrustLoop.", {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: c.text,
    });

    y -= 13;

    page.drawText(
      "This is a computer-generated receipt issued for your transaction record.",
      {
        x: margin,
        y,
        size: 9.25,
        font,
        color: c.textSoft,
      },
    );

    y -= 13;

    page.drawText(
      "For support, please contact TrustLoop through the platform.",
      {
        x: margin,
        y,
        size: 9.25,
        font,
        color: c.textSoft,
      },
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
