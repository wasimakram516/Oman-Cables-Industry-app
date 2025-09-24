import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const agenda = await Agenda.findById(params.id);
    return NextResponse.json(agenda);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { items } = await req.json();
    const updated = await Agenda.findByIdAndUpdate(
      params.id,
      { items },
      { new: true }
    );
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    await Agenda.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
