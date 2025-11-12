"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

const COINS: Array<{ id: string; symbol: string; name: string }> = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "aptos", symbol: "APT", name: "Aptos" },
  { id: "celestia", symbol: "TIA", name: "Celestia" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
]

type CoinResponse = Record<
  string,
  {
    usd: number
    usd_24h_change: number
  }
>

type CoinDisplay = {
  id: string
  symbol: string
  name: string
  price: number | null
  change: number | null
}

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const FALLBACK_RESPONSE: CoinResponse = {
  bitcoin: { usd: 68000, usd_24h_change: 1.25 },
  ethereum: { usd: 3500, usd_24h_change: 0.85 },
  solana: { usd: 155, usd_24h_change: 2.1 },
  sui: { usd: 1.4, usd_24h_change: -0.6 },
  aptos: { usd: 6.3, usd_24h_change: 1.9 },
  celestia: { usd: 12.4, usd_24h_change: -1.1 },
  chainlink: { usd: 14.8, usd_24h_change: 0.45 },
}

export function CryptoTicker() {
  const [data, setData] = useState<Record<string, CoinDisplay>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let ignore = false

    const loadPrices = async () => {
      try {
        const response = await fetch("/api/market-prices")
        if (!response.ok) throw new Error(`Ticker api error: ${response.status}`)
        const json = (await response.json()) as { success: boolean; data?: CoinResponse }

        if (!json.success || !json.data) {
          throw new Error("Ticker api returned no data")
        }

        if (ignore) return

        const mapped: Record<string, CoinDisplay> = {}
        for (const coin of COINS) {
          const entry = json.data[coin.id]
          mapped[coin.id] = {
            ...coin,
            price: entry?.usd ?? null,
            change: entry?.usd_24h_change ?? null,
          }
        }
        setData(mapped)
        setLastUpdated(new Date())
      } catch (error) {
        console.error("Failed to load coin prices:", error)
        if (ignore) return

        const mapped: Record<string, CoinDisplay> = {}
        for (const coin of COINS) {
          const entry = FALLBACK_RESPONSE[coin.id]
          mapped[coin.id] = {
            ...coin,
            price: entry?.usd ?? null,
            change: entry?.usd_24h_change ?? null,
          }
        }
        setData(mapped)
        setLastUpdated(new Date())
      }
    }

    loadPrices()
    const interval = setInterval(loadPrices, 120_000)

    return () => {
      ignore = true
      clearInterval(interval)
    }
  }, [])

  const items = useMemo(() => {
    return COINS.map((coin) => data[coin.id] ?? { ...coin, price: null, change: null })
  }, [data])

  // Duplicate items for seamless marquee loop
  const marqueeItems = [...items, ...items]

  return (
    <div className="relative overflow-hidden rounded-xl border bg-background/95 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background via-background/60 to-transparent pointer-events-none" />

      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Market Pulse
        </span>
        {lastUpdated && (
          <span className="text-[11px] text-muted-foreground">
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="relative overflow-hidden py-3">
        <div className="ticker-track flex">
          {marqueeItems.map((coin, index) => {
            const isPositive = (coin.change ?? 0) >= 0
            const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight
            const changeLabel =
              coin.change === null ? "—" : `${coin.change >= 0 ? "+" : ""}${coin.change.toFixed(2)}%`

            return (
              <div
                key={`${coin.id}-${index}`}
                className="flex min-w-[180px] items-center gap-3 border-r px-4 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-semibold tracking-wide">{coin.symbol}</span>
                  <span className="text-[11px] text-muted-foreground uppercase tracking-medium">
                    {coin.name}
                  </span>
                </div>
                <div className="ml-auto flex flex-col items-end">
                  <span className="font-mono text-sm">
                    {coin.price === null ? "—" : dollars.format(coin.price)}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${
                      coin.change === null
                        ? "text-muted-foreground"
                        : isPositive
                        ? "text-emerald-500"
                        : "text-red-500"
                    }`}
                  >
                    {coin.change === null ? null : <ChangeIcon className="h-3 w-3" />}
                    {changeLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          width: fit-content;
          animation: ticker-scroll 30s linear infinite;
        }

        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}

