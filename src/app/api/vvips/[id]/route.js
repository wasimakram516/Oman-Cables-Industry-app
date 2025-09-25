import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VVIP from "@/models/VVIP";

// 📌 GET one VVIP by ID
export async function GET(_, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const vvip = await VVIP.findById(id);
    if (!vvip)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vvip);
  } catch (err) {
    console.error("❌ VVIP GET by ID error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 UPDATE VVIP
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();

    const updates = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.designation !== undefined) updates.designation = body.designation;
    if (body.video !== undefined) updates.video = body.video;

    // If this VVIP is being set to play=true → reset all others first
    if (body.play === true) {
      await VVIP.updateMany({}, { $set: { play: false } });
      updates.play = true;
    } else if (body.play === false) {
      updates.play = false;
    }

    const updated = await VVIP.findByIdAndUpdate(id, updates, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("❌ VVIP PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 📌 DELETE one VVIP by ID
export async function DELETE(_, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    const vvip = await VVIP.findByIdAndDelete(id);
    if (!vvip)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "VVIP deleted successfully" });
  } catch (err) {
    console.error("❌ VVIP DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
