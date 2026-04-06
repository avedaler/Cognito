import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Compute the API base URL dynamically so it works both locally and deployed.
// When deployed, the site lives at a path like:
//   /computer/a/cognito-decision-diary-XXX/
// The backend proxy is at:
//   /computer/a/cognito-decision-diary-XXX/port/5000
// We derive this by stripping the filename from the current script path
// and appending "port/5000" relative to the site root.
function getApiBase(): string {
  if (typeof window === "undefined") return "";
  
  // If we're on localhost, use relative paths (Vite proxy handles it)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "";
  }

  // On deployed site: derive base from pathname
  // pathname example: /computer/a/cognito-decision-diary-XXX/
  // We want: /computer/a/cognito-decision-diary-XXX/port/5000
  const pathname = window.location.pathname;
  // Find the site root — it's everything up to and including the last non-asset segment
  // The site files are at /, /assets/, etc. relative to the deploy path
  // Strip trailing slash and any asset path to get site root
  const parts = pathname.split("/").filter(Boolean);
  // The site root path segments end before "assets" or "index.html"
  const siteRootSegments: string[] = [];
  for (const part of parts) {
    if (part === "assets" || part === "index.html") break;
    siteRootSegments.push(part);
  }
  const siteRoot = siteRootSegments.length > 0 ? "/" + siteRootSegments.join("/") : "";
  return `${siteRoot}/port/5000`;
}

const API_BASE = getApiBase();
console.log('[Cognito] API_BASE resolved to:', API_BASE || '(empty - local dev)');

// Token stored in module-level state (no localStorage — blocked in sandboxed iframe)
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function getAuthToken(): string | null {
  return _authToken;
}

function getAuthHeaders(): Record<string, string> {
  if (_authToken) {
    return { "Authorization": `Bearer ${_authToken}` };
  }
  return {};
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(`${API_BASE}${queryKey[0]}${queryKey.slice(1).map(String).join("/")}`, {
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
