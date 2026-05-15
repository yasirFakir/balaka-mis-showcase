import * as React from "react"
import { cn } from "../lib/utils"
import { gonia } from "../lib/gonia-theme"

// --- Layout Primitives ---

export interface GoniaContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full"
  centered?: boolean
}

/**
 * A responsive container with Gonia standard padding and max-widths.
 */
export function GoniaContainer({ 
  className, 
  size = "xl", 
  centered = true,
  children, 
  ...props 
}: GoniaContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 mx-auto overflow-x-hidden",
        centered && "mx-auto",
        size === "sm" && "max-w-screen-sm",
        size === "md" && "max-w-screen-md",
        size === "lg" && "max-w-screen-lg",
        size === "xl" && "max-w-[1536px]",
        size === "full" && "max-w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface GoniaStackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col"
  gap?: "sm" | "md" | "lg" | "xl" | "none"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  justify?: "start" | "center" | "end" | "between" | "around"
  wrap?: boolean
}

/**
 * A flexbox-based stack component for consistent spacing.
 */
export function GoniaStack({
  className,
  direction = "col",
  gap = "md",
  align,
  justify,
  wrap = false,
  children,
  ...props
}: GoniaStackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "col" ? "flex-col" : "flex-row",
        gap === "sm" && "gap-2",
        gap === "md" && "gap-4",
        gap === "lg" && "gap-6",
        gap === "xl" && "gap-8",
        gap === "none" && "gap-0",
        wrap && "flex-wrap",
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "stretch" && "items-stretch",
        align === "baseline" && "items-baseline",
        justify === "start" && "justify-start",
        justify === "center" && "justify-center",
        justify === "end" && "justify-end",
        justify === "between" && "justify-between",
        justify === "around" && "justify-around",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface GoniaGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: "sm" | "md" | "lg" | "xl"
  responsive?: boolean // If true, auto-collapses on mobile
}

/**
 * A CSS Grid component that handles responsive columns automatically.
 */
export function GoniaGrid({
  className,
  cols = 1,
  gap = "md",
  responsive = true,
  children,
  ...props
}: GoniaGridProps) {
  return (
    <div
      className={cn(
        "grid",
        gap === "sm" && "gap-2",
        gap === "md" && "gap-4",
        gap === "lg" && "gap-6",
        gap === "xl" && "gap-8",
        
        // Responsive Columns Logic
        responsive ? "grid-cols-1" : (cols === 1 ? "grid-cols-1" : ""),
        responsive && cols >= 2 && "md:grid-cols-2",
        responsive && cols >= 3 && "lg:grid-cols-3",
        responsive && cols >= 4 && "xl:grid-cols-4",
        
        // Fixed Columns Logic
        !responsive && cols === 1 && "grid-cols-1",
        !responsive && cols === 2 && "grid-cols-2",
        !responsive && cols === 3 && "grid-cols-3",
        !responsive && cols === 4 && "grid-cols-4",
        !responsive && cols === 5 && "grid-cols-5",
        !responsive && cols === 6 && "grid-cols-6",
        
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// --- Semantic Components ---

/**
 * Standard Gonia page header with responsive behavior.
 */
export function GoniaPageHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        gonia.layout.pageHeader,
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * A content section with consistent vertical rhythm.
 */
export function GoniaSection({ 
  className, 
  children, 
  title, 
  description, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { 
  title?: string, 
  description?: string 
}) {
  return (
    <section className={cn(gonia.layout.section, className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className={cn(gonia.text.h2, "m-0")}>{title}</h3>}
          {description && <p className={gonia.text.body}>{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * Base Gonia Card component with zero-radius and technical borders.
 */
export function GoniaCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        gonia.layout.card,
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Standard Card Header with sand-accent background.
 */
export function GoniaCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        gonia.layout.cardHeader,
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

// --- Typography Components ---

export function H1({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn(gonia.text.h1, className)} {...props} />
}

export function H2({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn(gonia.text.h2, className)} {...props} />
}

export function P({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(gonia.text.body, className)} {...props} />
}

export function Caption({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(gonia.text.caption, className)} {...props} />
}
