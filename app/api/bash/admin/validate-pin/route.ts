import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const pin = request.headers.get("x-pin")
  if (pin && pin === process.env.SCOREKEEPER_PIN) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })
}
