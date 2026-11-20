import { describe, it, expect } from "vitest";
import { problemResponse } from "@/lib/http-problem";

describe("problemResponse", () => {
  it("keeps the legacy error field and adds RFC 7807 fields", () => {
    const body = problemResponse("Unauthorized", 401);
    expect(body).toMatchObject({
      error: "Unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: "Unauthorized",
      type: "about:blank#unauthorized",
    });
  });

  it("maps common statuses to stable type tokens", () => {
    expect(problemResponse("bad", 400).type).toBe("about:blank#bad-request");
    expect(problemResponse("no", 403).type).toBe("about:blank#forbidden");
    expect(problemResponse("none", 404).type).toBe("about:blank#not-found");
    expect(problemResponse("dup", 409).type).toBe("about:blank#conflict");
    expect(problemResponse("boom", 500).type).toBe("about:blank#internal-error");
    expect(problemResponse("off", 503).type).toBe("about:blank#service-unavailable");
  });

  it("falls back to a generic token for unknown statuses", () => {
    expect(problemResponse("?", 418).type).toBe("about:blank#error");
  });

  it("never throws on empty message", () => {
    const body = problemResponse("", 400);
    expect(body.error).toBe("");
    expect(body.detail).toBe("");
  });
});
