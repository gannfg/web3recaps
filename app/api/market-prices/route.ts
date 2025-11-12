import { NextResponse } from "next/server"

const COIN_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "sui",
  "aptos",
  "celestia",
  "chainlink",
]

export const revalidate = 120

export async function GET() {
  try {
    const params = new URLSearchParams({
      ids: COIN_IDS.join(","),
      vs_currencies: "usd",
      include_24hr_change: "true",
    })

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate },
      },
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { success: false, error: `Coingecko error: ${res.status}`, details: text },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[market-prices] fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load market prices" },
      { status: 503 },
    )
  }
}

