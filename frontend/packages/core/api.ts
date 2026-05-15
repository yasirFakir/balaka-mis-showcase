export const API_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) 
  ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") 
  : (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? "" : "http://127.0.0.1:8008");

export type FetchOptions = RequestInit & {
  headers?: HeadersInit;
  token?: string;
};

/**
 * Shared Fetch Client for Balaka MIS.
 * Centralizes authentication, error handling, and session management.
 */
export async function fetchClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers, ...rest } = options;
  let { token } = options;

  // Auto-inject token from localStorage if available and not provided
  if (!token && typeof window !== "undefined") {
    const storedToken = localStorage.getItem("token");
    if (storedToken && storedToken !== "null" && storedToken !== "undefined") {
      token = storedToken;
    }
  }
  
  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        defaultHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        defaultHeaders[key] = value;
      });
    } else {
      Object.assign(defaultHeaders, headers);
    }
  }

  if (token) {
    const cleanToken = token.replace(/["']/g, "").trim();
    if (cleanToken) {
      defaultHeaders["Authorization"] = `Bearer ${cleanToken}`;
    }
  }

  const fullUrl = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(fullUrl, {
      headers: defaultHeaders,
      cache: "no-store",
      ...rest,
    });

    if (response.status === 401) {
      if (!endpoint.includes("/login/access-token")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:session-expired"));
        }
      }
      throw new Error("SESSION_EXPIRED");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Data:", errorData);
      let message: string = errorData.detail || `Error ${response.status}: ${response.statusText}`;
      if (Array.isArray(message)) {
          message = (message as any[]).map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join(", ");
      }
      const error = new Error(message);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    if (error.message === "SESSION_EXPIRED") throw error;
    
    console.error(`Fetch error for ${fullUrl}:`, error);
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Network error: Could not connect to the backend server.");
    }
    throw error;
  }
}

/**
 * Generates an authenticated URL for secure files.
 * Appends 'token' or 'guest_session_id' as a query parameter.
 */
export function getAuthenticatedUrl(url: string, guestSessionId?: string | null): string {
  if (!url) return "";
  
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
  
  // Skip if already has auth params
  if (fullUrl.includes("token=") || fullUrl.includes("guest_session_id=")) {
    return fullUrl;
  }

  const separator = fullUrl.includes("?") ? "&" : "?";
  
  // 1. Try Token (for authenticated users)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")?.replace(/["']/g, "").trim();
    if (token && token !== "null" && token !== "undefined") {
      return `${fullUrl}${separator}token=${token}`;
    }
  }
  
  // 2. Try Guest Session
  if (guestSessionId) {
    return `${fullUrl}${separator}guest_session_id=${guestSessionId}`;
  }
  
  return fullUrl;
}
