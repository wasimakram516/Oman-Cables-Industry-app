import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

// GET all agendas
export async function GET() {
  await dbConnect();
  const agendas = await Agenda.find().lean();
  return NextResponse.json(agendas);
}

// POST new agenda
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const agenda = new Agenda(body);
    await agenda.save();
    return NextResponse.json(agenda, { status: 201 });
  } catch (err) {
    console.error("❌ Agenda create error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
