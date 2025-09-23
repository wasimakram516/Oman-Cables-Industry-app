import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

// GET agenda by id
export async function GET(_, { params }) {
  await dbConnect();
  const agenda = await Agenda.findById(params.id);
  if (!agenda) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(agenda);
}

// UPDATE agenda
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const body = await req.json();
    const updated = await Agenda.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("❌ Agenda update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE agenda
export async function DELETE(_, { params }) {
  try {
    await dbConnect();
    await Agenda.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "Agenda deleted" });
  } catch (err) {
    console.error("❌ Agenda delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
