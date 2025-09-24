import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

// GET all agendas
export async function GET() {
  try {
    await dbConnect();
    const agendas = await Agenda.find({});
    return NextResponse.json(agendas);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST new agenda
export async function POST(req) {
  try {
    await dbConnect();
    const { items } = await req.json();
    const agenda = new Agenda({ items });
    await agenda.save();
    return NextResponse.json(agenda, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
