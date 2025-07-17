import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import { auth } from "@/auth";
import mongoose from "mongoose";

export async function POST(req, context) {
  try {
    const { id } = await context.params; // ✅ Await required
    const { message } = await req.json();

    if (!message?.trim()) {
      return new Response("Empty message.", { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id);
    if (!product) {
      return new Response("Product not found.", { status: 404 });
    }

    const newComment = {
      _id: new mongoose.Types.ObjectId(), // For the comment itself
      userId: new mongoose.Types.ObjectId(session.user.id), // Ensuring ObjectId
      username: session.user.name,
      userImage: session.user.image || "",
      message,
      createdAt: new Date(),
    };

    product.comments.unshift(newComment);
    await product.save();

    return new Response(JSON.stringify(newComment), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ POST Comment Error:", err);
    return new Response("Server error in POST /comments", { status: 500 });
  }
}

// ✅ DELETE a comment (product owner or comment author can delete)
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { commentId } = await req.json();

    if (!commentId) {
      return new Response("No commentId provided", { status: 400 });
    }

    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found.", { status: 404 });
    }

    const isProductOwner = session.user.email === product.owner.email;

    const existingComment = product.comments.find(
      (c) => c._id.toString() === commentId
    );

    if (!existingComment) {
      return new Response("Comment not found.", { status: 404 });
    }

    const isCommentOwner =
      existingComment.userId &&
      existingComment.userId.toString() === session.user.id;

    if (!isProductOwner && !isCommentOwner) {
      return new Response("Unauthorized to delete this comment.", {
        status: 403,
      });
    }

    product.comments = product.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await product.save();

    return new Response("Comment deleted.", { status: 200 });
  } catch (err) {
    console.error("❌ DELETE Comment Error:", err);
    return new Response("Server error in DELETE /comments", { status: 500 });
  }
}
