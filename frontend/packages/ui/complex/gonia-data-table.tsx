"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";

import { Column } from "../index";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../layout/table";
import { Input } from "../forms/input";
import { GoniaStack, GoniaCard } from "../layout/gonia-primitives";
import { GoniaIcons } from "../lib/icon-registry";
import { cn } from "../lib/utils";
import { LoadingSpinner } from "../base/loading-spinner";
import { Button } from "../base/button";

export interface GoniaDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** @deprecated Use searchable instead */
  searchKey?: string;
  searchPlaceholder?: string;
  /** Enable global search across all columns or specific ones */
  searchable?: boolean;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  /** Server-side pagination total */
  total?: number;
  /** Server-side current page (1-based) */
  page?: number;
  /** Server-side page size */
  limit?: number;
  /** Pagination callback */
  onPageChange?: (page: number) => void;
  /**
   * Optional render function for mobile card view.
   * If provided, the table will switch to card view on small screens.
   */
  renderMobileCard?: (item: T) => React.ReactNode;
  /** Server-side search callback */
  onSearch?: (query: string) => void;
}

/**
 * A robust, mobile-ready data table for Gonia.
 * Powered by TanStack Table for high-precision data handling.
 */
export function GoniaDataTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Quick search...",
  searchable = true,
  onRowClick,
  isLoading,
  emptyMessage = "No records found.",
  className,
  total,
  page,
  limit,
  onPageChange,
  renderMobileCard,
  onSearch,
}: GoniaDataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const isServerSide = total !== undefined;
  
  // Debounce search
  React.useEffect(() => {
    if (!onSearch) return;
    const timeout = setTimeout(() => {
      onSearch(globalFilter);
    }, 400); // 400ms debounce
    return () => clearTimeout(timeout);
  }, [globalFilter, onSearch]);

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<T>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isServerSide ? undefined : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: isServerSide,
    manualFiltering: !!onSearch, // Disable client-side filtering if server-search is active
    pageCount: isServerSide && limit ? Math.ceil(total / limit) : undefined,
    state: {
      sorting,
      globalFilter,
      pagination: {
          pageIndex: isServerSide && page ? page - 1 : 0,
          pageSize: isServerSide && limit ? limit : 10,
      },
    },
  });

  const canPrevious = isServerSide ? (page ? page > 1 : false) : table.getCanPreviousPage();
  const canNext = isServerSide ? (page && limit ? page < Math.ceil(total / limit) : false) : table.getCanNextPage();
  const totalPages = isServerSide && limit && total ? Math.ceil(total / limit) : table.getPageCount();
  const currentPage = isServerSide ? (page || 1) : table.getState().pagination.pageIndex + 1;

  const handlePageChange = (p: number) => {
    if (isServerSide && onPageChange) {
        onPageChange(p);
    } else {
        table.setPageIndex(p - 1);
    }
  };

  const handlePreviousPage = () => handlePageChange(currentPage - 1);
  const handleNextPage = () => handlePageChange(currentPage + 1);

  // Helper to generate page numbers for the windowed view
  const getPageNumbers = () => {
    const pages = [];
    const windowSize = 2; // Show 2 pages before and after current
    
    let start = Math.max(1, currentPage - windowSize);
    let end = Math.min(totalPages, currentPage + windowSize);

    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
    }

    return pages;
  };

  return (
    <GoniaStack gap="md" className={cn("w-full", className)}>
      {(searchable || searchKey) && (
        <div className="relative max-w-sm px-4 md:px-0">
          <GoniaIcons.Search className="absolute left-7 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 h-10 rounded-none border-2 border-primary/10 focus:border-primary/30 transition-all bg-white shadow-none"
          />
        </div>
      )}

      {/* Desktop Table View */}
      <div className={cn(
        "hidden md:block border border-primary/20 bg-white overflow-hidden relative min-h-[200px]",
        isLoading && "animate-pulse"
      )}>
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 transition-all duration-300">
            <LoadingSpinner size="md" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 animate-pulse">
              Syncing Registry Data...
            </span>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                  const col = columns.find(c => c.id === header.id || c.accessorKey === header.id) || columns[idx];
                  return (
                    <TableHead key={header.id} className={col?.className}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <LoadingSpinner size="md" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-primary/5")}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const col = columns.find(c => c.id === cell.column.id || c.accessorKey === cell.column.id) || columns[idx];
                    return (
                      <TableCell key={cell.id} className={col?.className}>
                        {col?.cell 
                          ? col.cell(row.original) 
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground italic">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className={cn(
        "md:hidden space-y-3 px-3 relative min-h-[200px]",
        isLoading && "animate-pulse"
      )}>
        {isLoading && data.length > 0 && (
          <div className="absolute inset-0 z-20 bg-[var(--gonia-canvas)]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 transition-all duration-300">
            <LoadingSpinner size="md" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              Syncing Registry Data...
            </span>
          </div>
        )}
        {isLoading && data.length === 0 ? (
          <div className="h-48 flex items-center justify-center border border-dashed border-primary/20 bg-white">
            <LoadingSpinner size="md" />
          </div>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div 
              key={row.id} 
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                "p-3 md:p-4 border-2 border-primary/10 bg-white active:bg-primary/5 transition-colors",
                onRowClick && "cursor-pointer"
              )}
            >
              {renderMobileCard ? (
                renderMobileCard(row.original)
              ) : (
                <div className="space-y-2">
                  {row.getVisibleCells().map((cell, idx) => {
                    const col = columns.find(c => c.id === cell.column.id || c.accessorKey === cell.column.id) || columns[idx];
                    return (
                      <div key={cell.id} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-primary/40 uppercase tracking-tighter">
                          {typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id}
                        </span>
                        <span className="font-medium text-right">
                          {col?.cell 
                            ? col.cell(row.original) 
                            : flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="h-32 flex items-center justify-center border border-dashed border-primary/20 bg-white text-muted-foreground italic">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Advanced Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between py-4 px-3 md:px-4 gap-4 md:gap-0 border-t border-primary/5">
        <div className="text-[9px] md:text-[10px] font-black uppercase text-primary/40 tracking-widest order-2 md:order-1">
            {isServerSide && total !== undefined ? (
                <span>Showing {((page || 1) - 1) * (limit || 0) + 1} to {Math.min((page || 1) * (limit || 0), total)} of {total} entries</span>
            ) : (
                <span>Page {currentPage} of {totalPages}</span>
            )}
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2">
            {/* First Page */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(1)}
                disabled={!canPrevious}
                className="h-8 w-8 rounded-none border-primary/10 hover:bg-primary/5 text-primary/60 shadow-none hidden sm:flex"
            >
                <GoniaIcons.First className="h-3.5 w-3.5" />
            </Button>

            {/* Previous */}
            <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!canPrevious}
                className="h-8 px-2 md:px-3 rounded-none border-primary/10 hover:bg-primary/5 text-primary/60 shadow-none gap-1"
            >
                <GoniaIcons.ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden lg:inline text-[9px] font-black uppercase">Prev</span>
            </Button>

            {/* Page Numbers (Desktop Only) */}
            <div className="hidden md:flex items-center gap-1">
                {getPageNumbers().map((p, i) => {
                    if (p === "...") return <span key={`dots-${i}`} className="px-1 text-primary/30 text-[10px]">...</span>;
                    const pageNum = p as number;
                    const isActive = pageNum === currentPage;
                    return (
                        <Button
                            key={`page-${pageNum}`}
                            variant={isActive ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={cn(
                                "h-8 w-8 rounded-none text-[10px] font-mono font-bold transition-all shadow-none",
                                isActive ? "bg-primary text-white" : "text-primary/60 hover:bg-primary/5"
                            )}
                        >
                            {pageNum}
                        </Button>
                    );
                })}
            </div>

            {/* Compact Indicator (Mobile Only) */}
            <div className="flex md:hidden items-center bg-primary/5 px-3 h-8 border border-primary/10">
                <span className="text-[10px] font-mono font-black text-primary">
                    {currentPage} <span className="text-primary/30 mx-1">/</span> {totalPages}
                </span>
            </div>

            {/* Next */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!canNext}
                className="h-8 px-2 md:px-3 rounded-none border-primary/10 hover:bg-primary/5 text-primary/60 shadow-none gap-1"
            >
                <span className="hidden lg:inline text-[9px] font-black uppercase">Next</span>
                <GoniaIcons.ChevronRight className="h-3.5 w-3.5" />
            </Button>

            {/* Last Page */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={!canNext}
                className="h-8 w-8 rounded-none border-primary/10 hover:bg-primary/5 text-primary/60 shadow-none hidden sm:flex"
            >
                <GoniaIcons.Last className="h-3.5 w-3.5" />
            </Button>
        </div>
      </div>
    </GoniaStack>
  );
}