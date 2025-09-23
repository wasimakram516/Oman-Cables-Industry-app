import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Node from "@/models/Node";

async function buildTree(parent = null) {
  const nodes = await Node.find({ parent }).sort("order").lean();
  for (let node of nodes) {
    node.children = await buildTree(node._id);
  }
  return nodes;
}

export async function GET() {
  try {
    await dbConnect();
    const tree = await buildTree();
    return NextResponse.json(tree);
  } catch (err) {
    console.error("❌ TREE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
