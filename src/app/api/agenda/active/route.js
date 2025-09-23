import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Agenda from "@/models/Agenda";

function toTodayDate(timeStr) {
  const [h, m] = timeStr.split(":");
  const today = new Date();
  today.setHours(parseInt(h), parseInt(m), 0, 0);
  return today;
}

export async function GET() {
  await dbConnect();
  const agenda = await Agenda.findOne().lean();
  if (!agenda)
    return NextResponse.json({ error: "Agenda not found" }, { status: 404 });

  const now = new Date();

  // 1. Manual active
  let activeItem = agenda.items.find((i) => i.isActive);

  // 2. Time-based
  if (!activeItem && agenda.autoDetectActive) {
    activeItem = agenda.items.find(
      (i) => toTodayDate(i.startTime) <= now && toTodayDate(i.endTime) >= now
    );
  }

  // 3. Next
  const nextItem = agenda.items.find((i) => toTodayDate(i.startTime) > now);

  return NextResponse.json({
    activeItem: activeItem || null,
    nextItem: nextItem || null,
  });
}
