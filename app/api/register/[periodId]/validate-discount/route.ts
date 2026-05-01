import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { calculateFee } from "@/lib/register/calculate-fee"

interface RouteContext {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/register/[periodId]/validate-discount
 * Body: { code: string, selectedExtraIds?: number[] }
 * Returns the recomputed fee breakdown if the code is valid, else { error }.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { periodId } = await context.params
  try {
    const body = await request.json()
    const code = (body.code ?? "").toString().trim()
    const selectedExtraIds: number[] = Array.isArray(body.selectedExtraIds) ? body.selectedExtraIds : []

    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })

    const result = await calculateFee({ periodId, selectedExtraIds, discountCode: code })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ fee: result.fee })
  } catch (err) {
    console.error("Failed to validate discount:", err)
    return NextResponse.json({ error: "Validation failed" }, { status: 500 })
  }
}

export const runtime = "nodejs"
