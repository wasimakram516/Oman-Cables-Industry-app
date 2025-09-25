import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

export async function GET() {
  try {
    await dbConnect();
    const doc = await Agenda.findOne().sort({ createdAt: -1 });
    if (!doc) return NextResponse.json({ activeItem: null, nextItem: null });

    const items = doc.items || [];

    // Only check for manual active
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

    // If no manual active, return nulls
    return NextResponse.json({ activeItem: null, nextItem: null });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
