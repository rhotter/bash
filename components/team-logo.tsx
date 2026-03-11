"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { getTeamLogoUrl } from "@/lib/team-logos"

export function TeamLogo({
  slug,
  name,
  size = 20,
  className,
  linked = false,
}: {
  slug: string
  name: string
  size?: number
  className?: string
  linked?: boolean
}) {
  const [error, setError] = useState(false)
  const logoUrl = getTeamLogoUrl(slug)

  if (!logoUrl || error) {
    return null
  }

  const img = (
    <Image
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      className={className}
      onError={() => setError(true)}
    />
  )

  if (linked) {
    return (
      <Link href={`/team/${slug}`} onClick={(e) => e.stopPropagation()}>
        {img}
      </Link>
    )
  }

  return img
}
