import { NextResponse } from "next/server";
import { readEntries, writeEntries } from "../../../lib/github";

export async function GET() {
  try {
    const { data } = await readEntries();
    return NextResponse.json({ entries: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, record } = body || {};
    if (!date || !record) {
      return NextResponse.json({ error: "date dan record wajib diisi" }, { status: 400 });
    }
    const { data, sha } = await readEntries();
    data[date] = record;
    await writeEntries(data, sha, `Update tracking ${date}`);
    return NextResponse.json({ ok: true, entries: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { date } = body || {};
    if (!date) {
      return NextResponse.json({ error: "date wajib diisi" }, { status: 400 });
    }
    const { data, sha } = await readEntries();
    delete data[date];
    await writeEntries(data, sha, `Hapus tracking ${date}`);
    return NextResponse.json({ ok: true, entries: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
