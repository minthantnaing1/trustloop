// app/api/products/[id]/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";
import DonationRequest from "@/models/DonationRequest";

// ✅ Get Single Product by ID (with reserved access guard)
export async function GET(_req, { params }) {
  const { id } = await params;

  try {
    await connectDB();
    const session = await auth();

    // ✅ Populate owner + auction bidder info
    const product = await Product.findById(id)
      .populate("owner")
      .populate({ path: "currentBid.bidder", select: "name email image" })
      .populate({ path: "bidHistory.bidder", select: "name email image" });

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    const isOwner = session?.user?.email === product.owner.email;

    // Hidden items: only owner can view
    if (product.isHidden && !isOwner) {
      return new Response("Product not found", { status: 404 });
    }

    // Reserved/unavailable items: only owner OR the actual buyer can view
    if (product.isAvailable === false) {
      const viewerEmail = session?.user?.email || null;
      const viewer = viewerEmail
        ? await User.findOne({ email: viewerEmail }).select("_id")
        : null;

      const isOwnerView =
        viewer &&
        String(product.owner?._id || product.owner) === String(viewer?._id);

      const txn = await Transaction.findOne({ product: product._id })
        .sort({ createdAt: -1 })
        .select("buyer");

      const isBuyerView =
        viewer && txn && String(txn.buyer) === String(viewer._id);

      if (!isOwnerView && !isBuyerView) {
        // Let /buy/[id] render your "listing isn’t available" UI
        return new Response("Unavailable", { status: 403 });
      }
    }

    const viewerEmail = session?.user?.email || null;
    let isFav = false;

    // --- Donation-specific hydration (requests + viewer pending) ---
    let viewerHasPendingRequest = false;
    let requestsOut = undefined;
    let viewerRequestsOut = undefined;

    if (product.type === "donation" && product.donationMode === "selective") {
      const viewerEmail2 = session?.user?.email || null;
      const viewer2 = viewerEmail2
        ? await User.findOne({ email: viewerEmail2 }).select("_id email")
        : null;

      if (viewer2) {
        viewerHasPendingRequest = !!(await DonationRequest.exists({
          product: product._id,
          requester: viewer2._id,
          status: "pending",
        }));

        // 🔹 Always get viewer’s own requests (for non-owner UI)
        const viewerReqs = await DonationRequest.find({
          product: product._id,
          requester: viewer2._id,
        })
          .select("_id status reason createdAt requester")
          .populate({ path: "requester", select: "name email image" })
          .sort({ createdAt: -1 })
          .lean();

        viewerRequestsOut = viewerReqs.map((r) => ({
          _id: String(r._id),
          status: r.status,
          message: r.reason,
          user: {
            name: r.requester?.name || r.requester?.email || "",
            email: r.requester?.email || "",
            image: r.requester?.image || "",
          },
          createdAt: r.createdAt,
        }));
      }

      // 🔹 Owner sees all requests
      if (isOwner) {
        const reqs = await DonationRequest.find({ product: product._id })
          .populate({ path: "requester", select: "name email image" })
          .sort({ createdAt: -1 })
          .lean();

        requestsOut = reqs.map((r) => ({
          _id: String(r._id),
          status: r.status,
          message: r.reason,
          user: {
            name: r.requester?.name || r.requester?.email || "",
            email: r.requester?.email || "",
            image: r.requester?.image || "",
          },
          createdAt: r.createdAt,
        }));
      }
    }

    // --- Favorites ---
    if (viewerEmail) {
      const viewer = await User.findOne({ email: viewerEmail }).select(
        "favorites",
      );
      if (viewer && Array.isArray(viewer.favorites)) {
        isFav = viewer.favorites.some(
          (pid) => String(pid) === String(product._id),
        );
      }
    }

    // --- Auction hydration (bidder info like donation style) ---
    let currentBidOut = undefined;
    let bidHistoryOut = undefined;
    let ended = false;

    if (product.type === "auction") {
      const endsAt = product.auctionEndsAt
        ? new Date(product.auctionEndsAt)
        : null;
      if (endsAt && !Number.isNaN(endsAt.getTime())) {
        ended = endsAt.getTime() <= Date.now();
      }

      if (product.currentBid && typeof product.currentBid === "object") {
        const b = product.currentBid;
        currentBidOut = {
          amount: Number(b.amount || 0),
          bidder: b.bidder
            ? {
                _id: String(b.bidder?._id || ""),
                name: b.bidder?.name || b.bidder?.email || "",
                email: b.bidder?.email || "",
                image: b.bidder?.image || "",
              }
            : null,
        };
      }

      // sort newest first for UI
      const list = Array.isArray(product.bidHistory) ? product.bidHistory : [];
      bidHistoryOut = [...list]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .map((h) => ({
          bidder: h.bidder
            ? {
                _id: String(h.bidder?._id || ""),
                name: h.bidder?.name || h.bidder?.email || "",
                email: h.bidder?.email || "",
                image: h.bidder?.image || "",
              }
            : null,
          amount: Number(h.amount || 0),
          time: h.time,
        }));
    }

    const out = {
      ...(product.toObject ? product.toObject() : product),
      isFav,
      ...(typeof viewerHasPendingRequest === "boolean"
        ? { viewerHasPendingRequest }
        : {}),
      ...(requestsOut ? { requests: requestsOut } : {}),
      ...(viewerRequestsOut ? { viewerRequests: viewerRequestsOut } : {}),

      // ✅ auction fields for UI
      ...(product.type === "auction"
        ? {
            currentBid: currentBidOut || null,
            bidHistory: bidHistoryOut || [],
            ended,
          }
        : {}),
    };

    return new Response(JSON.stringify(out), { status: 200 });
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Delete Single Product
export async function DELETE(_req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    if (product.owner.email !== session.user.email) {
      return new Response("Unauthorized - Not your product", { status: 403 });
    }

    // 🔒 Prevent delete during active transaction
    if (product.isAvailable !== true) {
      return new Response("Locked by active transaction", { status: 409 });
    }

    // ✅ Delete Cloudinary images
    for (const url of product.images || []) {
      const publicId = extractPublicId(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch {
          console.warn("⚠️ Cloudinary deletion failed for:", publicId);
        }
      }
    }

    await Product.findByIdAndDelete(id);

    return new Response("Deleted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ Product DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Update Single Product
export async function PATCH(req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    if (product.owner.email !== session.user.email) {
      return new Response("Unauthorized - Not your product", { status: 403 });
    }

    // 🔒 Prevent edits during active transaction
    if (product.isAvailable !== true) {
      return new Response("Locked by active transaction", { status: 409 });
    }

    // 🚫 Disallow edits if donation deadline has passed
    if (
      product.type === "donation" &&
      product.donationMode === "selective" &&
      product.requestDeadline &&
      new Date(product.requestDeadline) <= new Date()
    ) {
      return new Response("Editing is closed after the request deadline.", {
        status: 409,
      });
    }

    // 🚫 Disallow edits if auction already ended
    if (
      product.type === "auction" &&
      product.auctionEndsAt &&
      new Date(product.auctionEndsAt) <= new Date()
    ) {
      return new Response("Editing is closed after the auction ends.", {
        status: 409,
      });
    }

    // ✅ Cloudinary deletion only if `images` field is present
    if ("images" in body && Array.isArray(body.images)) {
      const removed = (product.images || []).filter(
        (url) => !body.images.includes(url),
      );

      for (const url of removed) {
        const publicId = extractPublicId(url);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", publicId);
          }
        }
      }
    }

    // ✅ Whitelist fields to prevent mass-assignment
    // NOTE: we intentionally do NOT allow editing bidHistory/currentBid
    const allowed = [
      "title",
      "description",
      "price",
      "category",
      "condition",
      "location",
      "images",
      "defaultImage",
      "isHidden",
      "type",
      "donationMode",
      "requestDeadline",

      // ✅ auction editable fields (owner only)
      "startingPrice",
      "auctionEndsAt",
    ];

    for (const k of allowed) {
      if (k in body) product[k] = body[k];
    }

    // ✅ Donation-specific enforcement
    if (product.type === "donation") {
      product.price = 0;

      const MS_14D = 14 * 24 * 60 * 60 * 1000;
      const createdAt = new Date(product.createdAt);
      const hardMax = new Date(createdAt.getTime() + MS_14D);

      if (product.donationMode === "instant") {
        product.requestDeadline = null;
      } else if (product.donationMode === "selective") {
        if (!product.requestDeadline) {
          return new Response(
            "requestDeadline is required for selective donation",
            { status: 400 },
          );
        }

        const reqDeadline = new Date(product.requestDeadline);
        if (Number.isNaN(reqDeadline.getTime())) {
          return new Response("Invalid requestDeadline", { status: 400 });
        }

        if (reqDeadline > hardMax) {
          product.requestDeadline = hardMax.toISOString();
        }
      }
    }

    // ✅ Auction-specific enforcement (minimal + safe)
    if (product.type === "auction") {
      // keep schema happy
      product.price = 0;

      // minimum base 1000
      const sp = Number(product.startingPrice);
      if (!Number.isFinite(sp) || sp < 1000) {
        return new Response("startingPrice must be at least ฿1,000.", {
          status: 400,
        });
      }
      product.startingPrice = sp;

      if (!product.auctionEndsAt) {
        return new Response("auctionEndsAt is required for auction.", {
          status: 400,
        });
      }

      const ends = new Date(product.auctionEndsAt);
      if (Number.isNaN(ends.getTime())) {
        return new Response("Invalid auctionEndsAt.", { status: 400 });
      }

      // keep deadline not too far: createdAt + 14 days
      const MS_14D = 14 * 24 * 60 * 60 * 1000;
      const createdAt = new Date(product.createdAt);
      const hardMax = new Date(createdAt.getTime() + MS_14D);

      if (ends > hardMax) {
        product.auctionEndsAt = hardMax.toISOString();
      }
    }

    await product.save();

    return new Response(JSON.stringify(product), { status: 200 });
  } catch (err) {
    console.error("❌ Product PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Minimal helper
function extractPublicId(url) {
  try {
    const path = url.split("/upload/")[1];
    return path.split("/").slice(1).join("/").split(".")[0];
  } catch {
    return null;
  }
}
