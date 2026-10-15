"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** A scene drawn at one design size (`width` × `height` CSS px) and scaled as a
 *  whole to the width it is given: a browser's chrome, a phone's type, the gaps
 *  between windows all keep their proportions at any size, as a picture would.
 *  The scale is the box's width over the design's, read as the box resizes;
 *  hidden until it is first read, so it never shows at the wrong size. */
export function Scaled({
  width,
  height,
  className,
  style,
  children,
}: {
  width: number
  height: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const resize = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width)
    })
    resize.observe(el)
    return () => resize.disconnect()
  }, [width])
  return (
    <div
      ref={box}
      className={cn("relative", className)}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          visibility: scale === 0 ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
