import * as React from "react";

/**
 * Standard Column Definition for Gonia Data Tables.
 * Optimized for both TanStack Table v8 and Gonia's custom cell rendering.
 */
export interface Column<T> {
  /** Unique identifier for the column. Required for reliable rendering. */
  id: string;
  /** Display label for the header. */
  header: string | React.ReactNode;
  /** The key in the data object to extract the value from. */
  accessorKey?: keyof T | string;
  /** Custom render function for the cell. Receives the full data item. */
  cell?: (item: T) => React.ReactNode;
  /** Optional tailwind classes for the header/cell container. */
  className?: string;
  /** Whether the column is sortable. (Reserved for future use) */
  sortable?: boolean;
}

// Add other shared UI types here as needed