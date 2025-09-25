import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vvip from "@/models/VVIP";

// GET the most recently updated VVIP whose play = true
export async function GET() {
  try {
    await dbConnect();

    const vvip = await Vvip.findOne({ play: true }).sort({ updatedAt: -1 });

    return NextResponse.json(vvip || null);
  } catch (err) {
    console.error("❌ Error fetching playing VVIP:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
