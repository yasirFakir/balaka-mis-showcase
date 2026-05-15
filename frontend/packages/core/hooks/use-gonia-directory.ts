"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchClient } from "../api";

interface GoniaDirectoryOptions<T> {
  endpoint: string;
  filter?: (item: T) => boolean;
  sort?: (a: T, b: T) => number;
  limit?: number;
  onError?: (error: Error) => void;
  onData?: (data: T[]) => void;
  search?: string;
  filters?: Record<string, any>;
}

interface ListResponse<T, S> {
  items: T[];
  total: number;
  summary?: S;
}

/**
 * Shared logic for directory-style components (UserList, RequestList, etc.)
 * Handles loading states, fetching, filtering, and sorting.
 */
export function useGoniaDirectory<T, S = Record<string, any>>({
  endpoint,
  filter,
  sort,
  limit: initialLimit = 10,
  onError,
  onData,
  search,
  filters
}: GoniaDirectoryOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<S | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  // Use refs for callbacks and parameter stability
  const onDataRef = useRef(onData);
  const onErrorRef = useRef(onError);
  const lastFetchParamsRef = useRef("");
  
  useEffect(() => {
    onDataRef.current = onData;
    onErrorRef.current = onError;
  }, [onData, onError]);

  const refresh = useCallback(async (delay = 0) => {
    if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    lastFetchParamsRef.current = "";
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    const skip = (page - 1) * limit;
    
    // Create a stable key for the current fetch configuration
    const currentParamsObj = { endpoint, skip, limit, search, filters };
    const paramsKey = JSON.stringify(currentParamsObj);
    
    // Prevent redundant fetches if params haven't changed (unless it's a manual refresh)
    if (!isRefresh && paramsKey === lastFetchParamsRef.current) {
        return;
    }
    
    try {
      setLoading(true);
      lastFetchParamsRef.current = paramsKey;
      
      // Construct URL with pagination params
      // We use a dummy origin to safely use URLSearchParams logic
      const url = new URL(endpoint, "http://dummy.com");
      url.searchParams.append("skip", skip.toString());
      url.searchParams.append("limit", limit.toString());
      
      if (search) {
        url.searchParams.append("q", search);
      }
      
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            if (Array.isArray(val)) {
                val.forEach(v => url.searchParams.append(key, v.toString()));
            } else {
                url.searchParams.append(key, val.toString());
            }
          }
        });
      }
      
      // Clean up endpoint for fetchClient (which prepends API_URL)
      // fetchPath should be like "/api/v1/resource?param=val"
      const fetchPath = `${url.pathname}${url.search}`;
      
      const response = await fetchClient<ListResponse<T, S> | T[]>(fetchPath);
      
      // Handle both flat arrays and enveloped responses { items, total }
      let rawData: T[] = [];
      let responseTotal = 0;

      if (Array.isArray(response)) {
        rawData = response;
        responseTotal = response.length;
      } else {
        rawData = response.items || [];
        responseTotal = response.total || 0;
        if (response.summary) {
          setSummary(response.summary);
        }
      }
      
      let processed = rawData;
      // Client-side filter/sort still supported for legacy/small lists
      if (filter) {
        processed = processed.filter(filter);
      }
      if (sort) {
        processed = [...processed].sort(sort);
      }
      
      setData(processed);
      setTotal(responseTotal);
      if (onDataRef.current) onDataRef.current(processed);
    } catch (error: any) {
      if (error.message !== "SESSION_EXPIRED") {
        if (onErrorRef.current) onErrorRef.current(error);
        else console.error("Directory Load Error:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, filter, sort, limit, page, search, JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const removeItem = useCallback((id: number | string, idKey: keyof T = "id" as keyof T) => {
    setData(prev => prev.filter(item => (item[idKey] as any) !== id));
  }, []);

  const updateItem = useCallback((updatedItem: T, idKey: keyof T = "id" as keyof T) => {
    setData(prev => prev.map(item => (item[idKey] === updatedItem[idKey] ? updatedItem : item)));
  }, []);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    totalPages,
    summary,
    loading,
    refresh,
    page,
    setPage,
    limit,
    setLimit,
    setData,
    removeItem,
    updateItem
  };
}
