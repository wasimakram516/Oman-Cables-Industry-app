import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VVIP from "@/models/VVIP";

// 📌 GET all VVIPs
export async function GET() {
  try {
    await dbConnect();
    const vvips = await VVIP.find().sort({ createdAt: -1 });
    return NextResponse.json(vvips);
  } catch (err) {
    console.error("❌ VVIP GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 CREATE new VVIP
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const vvip = await VVIP.create(body);
    return NextResponse.json(vvip, { status: 201 });
  } catch (err) {
    console.error("❌ VVIP POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
