import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

export async function GET() {
  try {
    await dbConnect();
    const doc = await Agenda.findOne().sort({ createdAt: -1 });
    if (!doc) return NextResponse.json({ activeItem: null, nextItem: null });

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // "HH:mm"

    const items = doc.items || [];
    const activeItem = items.find(
      (it) => it.startTime <= timeStr && it.endTime >= timeStr
    );
    const nextItem = items.find((it) => it.startTime > timeStr);

    return NextResponse.json({ activeItem, nextItem });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
