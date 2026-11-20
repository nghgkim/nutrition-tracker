/**
 * Additive RFC 7807 error body. Keeps the legacy `error` field so existing
 * clients continue to work while exposing a machine-readable error class.
 */
const TITLES: Record<number, { title: string; token: string }> = {
  400: { title: "Bad Request", token: "bad-request" },
  401: { title: "Unauthorized", token: "unauthorized" },
  403: { title: "Forbidden", token: "forbidden" },
  404: { title: "Not Found", token: "not-found" },
  409: { title: "Conflict", token: "conflict" },
  500: { title: "Internal Server Error", token: "internal-error" },
  502: { title: "Bad Gateway", token: "bad-gateway" },
  503: { title: "Service Unavailable", token: "service-unavailable" },
};

export interface ProblemBody {
  error: string;
  type: string;
  title: string;
  status: number;
  detail: string;
}

export function problemResponse(message: string, status: number): ProblemBody {
  const info = TITLES[status] || { title: "Error", token: "error" };
  return {
    error: message,
    type: `about:blank#${info.token}`,
    title: info.title,
    status,
    detail: message,
  };
}
