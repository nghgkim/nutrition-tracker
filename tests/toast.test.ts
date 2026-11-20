import { describe, it, expect } from "vitest";
import { pushToast, type Toast } from "@/lib/toast";

const t = (id: number, message: string, kind: "success" | "error" = "success"): Toast =>
  ({ id, message, kind });

describe("pushToast", () => {
  it("appends a toast and assigns an increasing id", () => {
    expect(pushToast([], "Đã lưu", "success")).toEqual([{ id: 1, message: "Đã lưu", kind: "success" }]);
    expect(pushToast([t(1, "a")], "Xóa lỗi", "error")[1]).toMatchObject({ id: 2, kind: "error" });
  });

  it("caps the queue at 3, dropping the oldest", () => {
    const queue = [t(1, "a"), t(2, "b"), t(3, "c")];
    const next = pushToast(queue, "d", "success");
    expect(next.map(x => x.message)).toEqual(["b", "c", "d"]);
  });

  it("drops exact duplicate consecutive messages", () => {
    expect(pushToast([t(1, "Đã lưu")], "Đã lưu", "success")).toEqual([t(1, "Đã lưu")]);
  });
});
