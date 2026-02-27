// app/api/products/[id]/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Auction from "@/models/Auction";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";
import DonationRequest from "@/models/DonationRequest";

// ✅ Get Single Product by ID (with reserved access guard)
export async function GET(_req, { params }) {
  const { id } = await params;

  try {
    await connectDB();
    const session = await auth();

    // ✅ Only populate owner on Product (auction bid fields are NOT on Product anymore)
    const product = await Product.findById(id).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });

    const isOwner = session?.user?.email === product.owner?.email;

    // Hidden items: only owner can view
    if (product.isHidden && !isOwner) {
      return new Response("Product not found", { status: 404 });
    }

    // Reserved/unavailable items: only owner OR actual buyer can view
    if (product.isAvailable === false) {
      const viewerEmail = session?.user?.email || null;
      const viewer = viewerEmail
        ? await User.findOne({ email: viewerEmail }).select("_id")
        : null;

      const isOwnerView =
        viewer &&
        String(product.owner?._id || product.owner) === String(viewer?._id);

      let isBuyerView = false;

      if (viewer) {
        // For AUCTION: prefer current Auction txn buyer (not old cancelled ones)
        if (product.type === "auction") {
          const a = await Auction.findOne({ product: product._id })
            .select("currentTxn")
            .lean();

          if (a?.currentTxn) {
            const currentTxn = await Transaction.findById(a.currentTxn)
              .select("buyer")
              .lean();
            isBuyerView =
              currentTxn && String(currentTxn.buyer) === String(viewer._id);
          } else {
            // fallback
            const txn = await Transaction.findOne({ product: product._id })
              .sort({ createdAt: -1 })
              .select("buyer")
              .lean();
            isBuyerView = txn && String(txn.buyer) === String(viewer._id);
          }
        } else {
          const txn = await Transaction.findOne({ product: product._id })
            .sort({ createdAt: -1 })
            .select("buyer")
            .lean();
          isBuyerView = txn && String(txn.buyer) === String(viewer._id);
        }
      }

      if (!isOwnerView && !isBuyerView) {
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
      const viewer2 = viewerEmail
        ? await User.findOne({ email: viewerEmail }).select("_id email")
        : null;

      if (viewer2) {
        viewerHasPendingRequest = !!(await DonationRequest.exists({
          product: product._id,
          requester: viewer2._id,
          status: "pending",
        }));

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

    // --- Auction hydration (from Auction model) ---
    let auctionOut = undefined;

    if (product.type === "auction") {
      const a = await Auction.findOne({ product: product._id })
        .populate({ path: "currentBid.bidder", select: "name email image" })
        .populate({ path: "bidHistory.bidder", select: "name email image" })
        .populate({ path: "winner", select: "name email image" })
        .select(
          "status endsAt startingPrice currentBid bidHistory winner finalPrice paymentExpiresAt currentTxn currentIndex queue",
        );

      if (a) {
        const endsAt = a.endsAt ? new Date(a.endsAt) : null;
        const ended =
          endsAt && !Number.isNaN(endsAt.getTime())
            ? endsAt.getTime() <= Date.now()
            : false;

        const currentBidOut = a.currentBid
          ? {
              amount: Number(a.currentBid.amount || 0),
              bidder: a.currentBid.bidder
                ? {
                    _id: String(a.currentBid.bidder?._id || ""),
                    name:
                      a.currentBid.bidder?.name ||
                      a.currentBid.bidder?.email ||
                      "",
                    email: a.currentBid.bidder?.email || "",
                    image: a.currentBid.bidder?.image || "",
                  }
                : null,
            }
          : { amount: 0, bidder: null };

        const list = Array.isArray(a.bidHistory) ? a.bidHistory : [];
        const bidHistoryOut = [...list]
          .sort((x, y) => new Date(y.time) - new Date(x.time))
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

        auctionOut = {
          _id: String(a._id),
          status: a.status,
          endsAt: a.endsAt,
          startingPrice: Number(a.startingPrice || 0),
          currentBid: currentBidOut,
          bidHistory: bidHistoryOut,
          ended,

          // winner/payment UI
          winner: a.winner
            ? {
                _id: String(a.winner?._id || ""),
                name: a.winner?.name || a.winner?.email || "",
                email: a.winner?.email || "",
                image: a.winner?.image || "",
              }
            : null,
          finalPrice: Number(a.finalPrice || 0),
          paymentExpiresAt: a.paymentExpiresAt || null,
          currentTxn: a.currentTxn ? String(a.currentTxn) : null,
        };
      }
    }

    const out = {
      ...(product.toObject ? product.toObject() : product),
      isFav,
      ...(typeof viewerHasPendingRequest === "boolean"
        ? { viewerHasPendingRequest }
        : {}),
      ...(requestsOut ? { requests: requestsOut } : {}),
      ...(viewerRequestsOut ? { viewerRequests: viewerRequestsOut } : {}),

      // ✅ for auction UI: send the auction engine object
      ...(product.type === "auction" ? { auction: auctionOut || null } : {}),
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
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.owner?.email !== session.user.email) {
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

    // ✅ If auction: delete engine doc too
    if (product.type === "auction") {
      await Auction.deleteOne({ product: product._id }).catch(() => {});
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
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.owner?.email !== session.user.email) {
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

    // ✅ Whitelist fields
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

    // ✅ Donation enforcement
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

    // ✅ Auction enforcement + sync engine doc
    if (product.type === "auction") {
      product.price = 0;

      const sp = Number(product.startingPrice);
      if (!Number.isFinite(sp) || sp < 10) {
        return new Response("startingPrice must be at least ฿10.", {
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

      const MS_14D = 14 * 24 * 60 * 60 * 1000;
      const createdAt = new Date(product.createdAt);
      const hardMax = new Date(createdAt.getTime() + MS_14D);
      if (ends > hardMax) {
        product.auctionEndsAt = hardMax.toISOString();
      }

      // ✅ Sync Auction engine (only if still OPEN and no bids yet)
      const a = await Auction.findOne({ product: product._id }).select(
        "status currentBid bidHistory",
      );

      if (a) {
        const hasAnyBid =
          Number(a?.currentBid?.amount || 0) > 0 ||
          (Array.isArray(a.bidHistory) && a.bidHistory.length > 0);

        // keep it safe: don’t let seller change base/end if bids already exist
        if (hasAnyBid) {
          // allow normal edits (title/desc/images), but block changes to auction params
          if ("startingPrice" in body || "auctionEndsAt" in body) {
            return new Response(
              "Cannot edit startingPrice/auctionEndsAt after bids have been placed.",
              { status: 409 },
            );
          }
        } else {
          // no bids yet → safe to sync
          await Auction.updateOne(
            { _id: a._id },
            {
              $set: {
                startingPrice: Number(product.startingPrice || 0),
                endsAt: new Date(product.auctionEndsAt),
              },
              $inc: { version: 1 },
            },
          );
        }
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
