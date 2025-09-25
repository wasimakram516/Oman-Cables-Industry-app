import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

export async function GET() {
  try {
    await dbConnect();
    const doc = await Agenda.findOne().sort({ createdAt: -1 });
    if (!doc) return NextResponse.json({ activeItem: null, nextItem: null });

    const items = doc.items || [];

    // 1. Manual active has top priority
    const manualActive = items.find((it) => it.isActive);
    if (manualActive) {
      const idx = items.findIndex((it) => it._id.equals(manualActive._id));
      const nextItem =
        idx >= 0 && idx + 1 < items.length ? items[idx + 1] : null;

      return NextResponse.json({
        activeItem: manualActive,
        nextItem,
      });
    }

    // 2. Time-based fallback
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5); // "HH:mm"

    const activeItem = items.find(
      (it) => it.startTime <= timeStr && it.endTime >= timeStr
    );
    const nextItem = items.find((it) => it.startTime > timeStr);

    return NextResponse.json({
      activeItem: activeItem || null,
      nextItem: nextItem || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
