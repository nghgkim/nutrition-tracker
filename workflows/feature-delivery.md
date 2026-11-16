# Master Workflow: 4-Phase Dual-Mode Feature Delivery Pipeline

> **Mục đích:** Vận hành chu trình phát triển phần mềm chuẩn mực qua 4 Phase chuyên môn: **BA-PO**, **DEV**, **QC**, và **DEVOPS**.
> **Hỗ trợ 2 Chế độ thực thi (Dual-Mode):**
> 1. **Human-in-the-Loop (Mặc định / Tương tác):** Con người trực tiếp duyệt Spec ở Phase BA-PO và phê duyệt Release ở Phase DevOps.
> 2. **Zero-Human (Tự hành hoàn toàn):** Kích hoạt bằng `--auto` / `--autonomous`. Auto-Judge chấm điểm Spec theo Rubric $\ge 90$ điểm, QC đối kháng tự phản hồi cho DEV sửa lỗi qua Circuit Breaker (tối đa 3 vòng), và DevOps đóng gói mở Git PR tự động.

```
┌──────────────────┐   docs/specs/   ┌──────────────────┐
│  Phase 1: BA-PO  │ ──────────────► │  Phase 2: DEV    │
│(PRD, AC, Schema) │ [Sign-off/Judge]│ (Schema & Code)  │
└──────────────────┘                 └──────────────────┘
                                               │
                                 src/ & tests/ │ (Linter & Build OK)
                                               ▼
┌──────────────────┐  docs/evidence/ ┌──────────────────┐
│ Phase 4: DEVOPS  │ ◄────────────── │   Phase 3: QC    │
│(Release, Infra)  │  [QC Sign-off]  │ (Security, Edge) │
└──────────────────┘                 └──────────────────┘
```

---

## 0. Change Classification (Tiers of Delivery)

Nhằm tối ưu hóa tốc độ và loại bỏ gánh nặng thủ tục (ceremony overhead), quy trình phân loại thay đổi thành 4 tầng:

| Tầng (Tier) | Phạm vi & Tiêu chí nhận diện | Các Phase bắt buộc | Yêu cầu Artifact / Fast-track |
|---|---|---|---|
| **Tier 0: Spike / Feasibility PoC** | Thử nghiệm công nghệ mới, benchmark, kiểm chứng giả thuyết kỹ thuật có độ bất định cao (Time-boxed $\le$ 3 ngày). | **Phase 0 (Spike & Benchmark)** | **Miễn trừ BA-PO ceremony.** Kích hoạt bằng branch `spike/*` hoặc flag `--tier=spike`. Bắt buộc ghi nhận số liệu đo đạc thực tế (`docs/specs/spike-<topic>.md`) và quyết định **Go / No-Go**. **Invariant:** Code Spike TUYỆT ĐỐI KHÔNG deploy production; nếu quyết định Go, bắt buộc quay lại Phase 1 (Tier 2/3) để viết Spec/ADR chính quy trước khi code sản xuất. |
| **Tier 1: Patch / Bugfix** | Sửa 1 bug, hotfix, refactor nhỏ (< 50 lines), bump dependency, sửa style/typo. | Phase 2 (DEV - TDD), Phase 3 (QC - Test) | **Miễn Phase 1 (BA-PO).** Bắt buộc có test case tái hiện lỗi và fix chạy pass. Kích hoạt bằng branch `fix/*`, `hotfix/*` hoặc flag `--tier=patch`. |
| **Tier 2: Minor Feature** | Thêm endpoint mới, mở rộng UI, thay đổi schema không breaking. | Phase 1 (Mini-spec), Phase 2, Phase 3, Phase 4 | `docs/specs/<feature>.md` dạng Mini-spec (chỉ cần AC Gherkin + Contract diff). Bỏ qua Data migration nếu không đụng tới DB. |
| **Tier 3: Major / Architecture** | Đổi kiến trúc domain, breaking API, migration lớn, hệ thống phân tán. | Đủ 4 Phase tuần tự | Full PRD, 5-state UI mockup, ADR trong `docs/decisions/`, migration plan. |

### 0.1. Cơ chế Chuyển tiếp từ Spike sang Delivery (Spike-to-Delivery Handover)
1. **Mục đích của Spike:** Trả lời câu hỏi sống còn về kỹ thuật trước khi làm tài liệu ("Liệu giải pháp này có khả thi, đạt hiệu năng và đáp ứng yêu cầu kỹ thuật không?").
2. **Kỷ luật ranh giới (Boundary Invariants):**
   - **Sandbox Isolation:** Spike phải chạy trên branch `spike/*` hoặc thư mục PoC độc lập.
   - **Zero Production Leak:** Code của Spike là Prototype thực nghiệm, KHÔNG ĐƯỢC coi là production code.
   - **Mandatory Output:** Spike hoàn thành khi có báo cáo thực nghiệm trong `docs/specs/spike-<topic>.md` (ghi rõ số liệu RAM, Latency, Throughput hoặc Invariants) kèm Quyết định **Go / No-Go**.
   - **Strict Transition Gate:** Khi chọn **Go**, bắt buộc phải dừng code và khởi động **Phase 1 (BA-PO)** của Tier 2 hoặc Tier 3. Dùng số liệu của Spike làm bằng chứng đầu vào để viết Spec chuẩn (AC Gherkin) và Architecture Decision Record (ADR) trong `docs/decisions/` trước khi viết code sản xuất chính thức.

### Chính sách Grounding Sách (Book Grounding Policy)
- **Bắt buộc tra cứu `kb`:** Chỉ áp dụng cho các quyết định kiến trúc (ADR ở Phase 1), mô hình Concurrency & Locking (Phase 2), thuật toán mã hóa/xác thực (Phase 3), và chiến lược SLO/Distributed Systems (Phase 4).
- **Miễn trừ:** Nghiệp vụ nội bộ riêng biệt (domain business logic) và các bản vá lỗi (bugfixes/patches) **không bắt buộc** trích dẫn sách. Tuyệt đối cấm tạo truy vấn giả (fake/laundered query) chỉ để đối phó công cụ đếm tool-call.

---

## 1. Cơ chế Lựa chọn Chế độ Thực thi (Dual-Mode Matrix)

Người dùng có thể kích hoạt chế độ tương ứng qua cờ lệnh hoặc câu lệnh prompt:

| Tiêu chí | Chế độ 1: Human-in-the-Loop (Mặc định) | Chế độ 2: Zero-Human (Tự hành 100%) |
|---|---|---|
| **Kích hoạt** | Mặc định (hoặc `gate check --mode=hitl`) | Thêm cờ `--auto` / `--autonomous` (hoặc prompt: "Full Auto") |
| **Chốt chặn Phase 1 (BA-PO)** | Dừng lại, tóm tắt Spec cho user và chờ gõ "Duyệt". | **Auto-Judge:** Chạy `gate judge <spec>` theo Rubric 100 điểm. Nếu $\ge 90$đ $\rightarrow$ Tự duyệt. |
| **Chốt chặn Phase 2 (DEV)** | DEV code xong, báo cáo nội bộ cho user. | Tự động chuyển giao sang Phase 3 khi build & linter exit 0. |
| **Chốt chặn Phase 3 (QC)** | QC xuất báo cáo test & an ninh cho user nghiệm thu. | **Adversarial Feedback Loop:** QC tự feedback lỗi về DEV sửa (Circuit Breaker tối đa 3 vòng). |
| **Chốt chặn Phase 4 (DEVOPS)**| User trực tiếp duyệt lệnh deploy/migration. | **Safe Staging & Git PR:** Dựng sandbox kiểm thử, commit branch `feat/*`, và mở Pull Request (không đè Prod). |

---

## PHASE 1: BA-PO (Product, System Design & UI Mockup)
*Skills kích hoạt: `skills/product-analyst`, `skills/api-and-domain-design`, `skills/system-design`, `skills/frontend-engineering-and-ui`, `skills/frontend-craftsman`, `skills/cli-and-sdk-craftsman`*

### 1. Mục tiêu
Trả lời "tại sao / cho ai / nghiệm thu bằng gì" (PRD) và chốt hợp đồng kiến trúc (System Design & API contract), đồng thời thiết kế bộ **UI Design System & Interactive Mockup** trước khi viết bất kỳ dòng code logic nào.
> **Invariant:** No Mockup, No Code — Không có spec, design tokens và interactive 5-state UI mockup = tuyệt đối không được chạm vào code sản xuất.

### 2. Tiêu chí kiểm duyệt (Invariants Checklist)
- [ ] **Contract-First:** OpenAPI/Proto schema hoặc TypeScript interface được định nghĩa chặt chẽ.
- [ ] **Acceptance Criteria (Gherkin):** Mọi kịch bản nghiệm thu được đánh số `AC-1`, `AC-2`... theo mẫu `Given - When - Then`.
- [ ] **System Architecture & Bounded Contexts:** Sơ đồ phân tầng rõ ràng 3 lớp: Transport (API/REST) $\rightarrow$ Domain Core (Entities/UseCases) $\rightarrow$ Persistence (DB Adapters).
- [ ] **Pagination Standard:** Mọi endpoint trả về danh sách lớn bắt buộc dùng Keyset/Cursor-based pagination (`after_id`/opaque token) (Geewax, p.326). Cấm dùng `OFFSET/LIMIT`.
- [ ] **Idempotency Contract:** Các API mutating nhạy cảm (thanh toán, tạo tài nguyên quan trọng) có header `Idempotency-Key` (Geewax, p.407, 415–416).
- [ ] **Error Specification:** Cấu trúc lỗi tuân thủ chuẩn RFC 7807 (`application/problem+json`). Cấm trả về `200 OK` kèm cờ lỗi giả tạo.
- [ ] **UI Design System & Layout Archetype (Nếu có Frontend):**
  - **Archetype:** Phải chọn 1 trong 4 Archetypes chuẩn: *Master-Detail Shell* (Linear/Mail), *Data-Dense Dashboard* (Stripe/Datadog), *Document Canvas* (Notion), hoặc *Multi-Step Wizard*.
  - **Design Tokens:** Định nghĩa rõ ràng Semantic Tokens (`bg-canvas`, `bg-surface`, `border-borderSubtle`, `text-textPrimary`, `text-textMuted`, `accent`) theo Theme (*Linear Dark* hoặc *Nordic Clean Light*). Cấm hardcode màu sắc thô.
  - **Interactive Mockup Artifact:** Tạo file mockup HTML độc lập tại `docs/mockups/<feature>.html` (dựa trên `templates/ui/app-shell.html`) chứa đủ 5 trạng thái: *1. Initial, 2. Loading Skeleton (zero-CLS), 3. Empty (có CTA), 4. Error (RFC 7807 alert + retry), 5. Success (Data grid/table)*.
  - **Tactile Response:** Mọi tương tác click bắt buộc có `active:scale-[0.98] transition-all duration-150`.

### 3. Điều kiện chuyển tiếp (Gate Exit)
- **HITL Mode:** `docs/specs/<feature>.md` tồn tại, mockup `docs/mockups/<feature>.html` có thể mở trên trình duyệt, AC đánh số rõ ràng, con người gõ "Duyệt".
- **Zero-Human Mode:** Chạy lệnh `gate judge docs/specs/<feature>.md` đạt **Score $\ge 90/100$**. Nếu $< 90$, BA-PO tự động viết lại theo feedback của rubric (tối đa 3 lần).

---

## PHASE 2: DEV (Architecture, Clean Code & Implementation)
*Skills kích hoạt: `skills/tech-stack-architect`, `skills/database-modeling-and-access`, `skills/testing-and-refactoring`, `skills/clean-code`, `skills/frontend-craftsman`, `skills/dev-event-driven`, `skills/dev-resilient-integration`, `skills/stealth-and-browser-engineering`, `skills/reverse-engineering-and-analysis`, `skills/caching-and-data-sync`, `skills/cli-and-sdk-craftsman`, Stack Overlays*

### 1. Mục tiêu
Hiện thực hóa logic nghiệp vụ thông qua chu trình TDD nghiêm ngặt, tuân thủ Clean Architecture, Clean Code và các nguyên tắc Concurrency từ DDIA.

### 2. Tiêu chí kiểm duyệt (Invariants Checklist)
- [ ] **Clean Architecture Boundaries:** Controller/Route Handler chỉ làm nhiệm vụ parse HTTP, gọi UseCase và trả HTTP Status. Cấm tuyệt đối việc query DB hoặc viết nghiệp vụ phức tạp trong Controller.
- [ ] **Clean Code Rules (Robert C. Martin):**
  - Hàm làm 1 việc duy nhất; độ dài hàm $\le 30$ dòng.
  - Cấm Flag Arguments (`foo(isValid: boolean)` $\rightarrow$ tách thành `fooValid()` và `fooInvalid()`).
  - Sử dụng Exceptions / Result types chuẩn thay vì return null hoặc mã lỗi số nguyên.
- [ ] **Frontend Component Discipline:**
  - Tách bạch Smart Container (quản lý state/fetch query) và Presentational Component (UI thuần khiết).
  - Không có file Component nào vượt quá 200 dòng.
  - Mọi nút bấm và card tuân thủ đúng Design Tokens và hiệu ứng xúc giác từ Mockup Phase 1.
- [ ] **Race Condition Defense:** Phân loại rõ bài toán: Atomic Update, Pessimistic Locking (`SELECT FOR UPDATE`), hay Optimistic Locking (`version` column) (DDIA, p.268–269; Database Internals, p.120).
- [ ] **Composite Index (Quy ước ESR):** Thứ tự cột trong composite index: *Equality → Sort → Range* (DDIA, p.109).
- [ ] **Zero-Downtime Migration:** Sửa đổi schema lớn đi theo quy trình Expand & Contract; có cấu hình `lock_timeout`.
- [ ] **TDD Cycle (4 bước):**
  1. *Red Step:* Viết test suite trước, test phải chạy và báo đỏ hợp lý.
  2. *Green Step:* Viết lượng code sản xuất vừa đủ để test pass xanh.
  3. *Refactor Step:* Khử trùng lặp, áp dụng Clean Code, đảm bảo Type Strictness (không `any`).
  4. *Stack Idioms:* Pydantic v2 / uv (Python), sqlc / pgx (Go), Zod / Prisma / Vitest (TS).

### 3. Điều kiện chuyển tiếp (Gate Exit)
- Toàn bộ unit tests nội bộ của DEV chạy pass (exit 0).
- Linter & Typecheck của dự án thoát mã 0.
- **Build Check:** `npm run build` / `cargo build` / `go build` thoát mã 0 (không chỉ dev mode). Nếu build fail = REJECT, không bàn giao QC.
- **Lint Policy:** Lint phải đạt 0 error; warnings phải được giải thích rõ trong PR (allowlist) hoặc fix. Warnings im lặng không được phép.
- Mã nguồn và migration script sẵn sàng trong working tree để bàn giao cho QC.

---

## PHASE 3: QC (Adversarial Quality Control & Automated Verification)
*Skills kích hoạt: `skills/qa-automation`, `skills/qc-frontend`, `skills/qc-backend`, `skills/qc-database`, `skills/qc-performance-load`, `skills/contract-verifier`, `skills/chaos-and-edge-hunter`, `skills/code-auditor`, `skills/app-security-hardening`, `skills/stealth-and-browser-engineering`, `skills/profiling-and-memory-optimization`, `skills/reverse-engineering-and-analysis`, `skills/caching-and-data-sync`*

### 1. Mục tiêu
Đóng vai trò đối kháng độc lập (Adversarial Tester): Thẩm định sự tương thích với Spec, săn lỗi biên, stress test và audit an ninh ứng dụng.

### 2. Tiêu chí kiểm duyệt (Invariants Checklist)
- [ ] **AC Traceability:** Mọi `AC-N` trong spec bắt buộc phải có test case kiểm thử tương ứng. Thiếu test cho bất kỳ AC nào = REJECT.
- [ ] **Build & Lint Gate:** `npm run build` (hoặc tương đương) exit 0 và lint 0 error. Chạy lại ở QC, không tin tưởng DEV's word.
- [ ] **Dev-Host Smoke Test:** Smoke test (E2E/curl) bắt buộc phải chạy qua **host thật user dùng** (ví dụ `dev-vm:3000`), không chỉ `localhost`. Verify: page load, JS bundle load (no cross-origin block), form submit, API round-trip, cookie auth. Nếu app chỉ chạy được trên localhost = REJECT.
- [ ] **Visual Design Review:** QC bắt buộc phải chụp screenshot (Playwright) và đối chiếu với design tokens/mockup Phase 1: typography hierarchy, spacing rhythm (4/8/12/16px), elevation, empty state có CTA, loading skeleton khớp layout. Không chỉ kiểm tra whiteout (`white_ratio < 85%`) — còn phải kiểm tra **visual fidelity** so với spec/mockup.
- [ ] **Visual Fidelity & Anti-Whiteout Invariant:** Kiểm tra nghiệm thu giao diện (Rendering & Screenshots) TUYỆT ĐỐI không dùng assertion rỗng tuếch (ví dụ `assert!(bytes.len() > 100)`). Bắt buộc phải kiểm tra độ sâu màu sắc (`unique_colors > 500`), tỷ lệ pixel trắng (`white_ratio < 85%`) và computed styles (`getComputedStyle`) để đảm bảo CSS/layout không bị vỡ hoặc sụp thành trang trắng lỗi.
- [ ] **Subresource & Network Lifecycle Invariant:** Đối với browser/scraper/gateway: Test không chỉ kiểm tra HTTP 200 của document HTML gốc mà bắt buộc phải audit toàn bộ subresources (`Network.responseReceived`). Fail test ngay lập tức nếu có bất kỳ file CSS, JS, Font hoặc WebGL shader nào bị HTTP 403 Forbidden, 429 hoặc Cloudflare bot challenge.
- [ ] **Interactive Challenge State Classifier:** Khi nghiệm thu navigation/scraping: Test bắt buộc phải assert trang KHÔNG bị kẹt ở trạng thái Bot Challenge (`document.title` chứa "Just a moment...", "Attention Required!", "Security Check" hoặc DOM chứa `#challenge-running`, `.cf-turnstile`, `iframe[src*="challenges.cloudflare.com"]`). Nếu sau settle timeout trang vẫn ở Challenge State = REJECT.
- [ ] **Cross-Browser & Client Capability Invariant:** Khi cung cấp tính năng phụ thuộc giao thức đặc thù (như Chrome DevTools `chrome-devtools://`): Frontend bắt buộc phải nhận diện engine trình duyệt (`detectClientBrowser`). Nếu người dùng truy cập từ Non-Chromium (như Zen Browser, Firefox, Safari), UI phải hiển thị chỉ dẫn tương thích rõ ràng, nghiêm cấm tạo liên kết chết không mở được.
- [ ] **Canvas Coordinate & HiDPI Scale Invariant:** Với tính năng Interactive Remote Canvas/Screencast: Phải kiểm định công thức scale tọa độ (`(clientX - left) * naturalWidth / clientWidth`), bắt buộc có guard chống `NaN` khi ảnh chưa tải xong (`rect.width == 0`), đảm bảo click chính xác 100% trên cả màn hình Retina (devicePixelRatio $\ge 2$).
- [ ] **Hardware Fingerprint Consistency Invariant:** Profile stealth phải đồng nhất giữa OS và phần cứng: Chạy kiểm tra WebGL context (`webgl2` phải khả dụng, không được null do `--disable-gpu`); WebGL Vendor/Renderer phải che giấu dấu vết máy chủ Linux headless (`SwiftShader` / `llvmpipe`).
- [ ] **Client UX Race & Streaming Invariant:** Khi có cơ chế polling ngầm (`setInterval`, SSE, WebSocket screencast):
  * **Input Protection:** Background polling TUYỆT ĐỐI không được mutate/overwrite giá trị ô input khi người dùng đang focus/typing (`document.activeElement`).
  * **Flicker Elimination:** Luồng cập nhật hình ảnh/screencast bắt buộc phải dùng kỹ thuật preloading ngầm (Double-Buffering) hoặc Canvas, nghiêm cấm xóa/gán lại thẻ `<img>` trực tiếp gây giật nhấp nháy màn hình.
- [ ] **UI/UX & Viewport Invariants (Bắt buộc cho mọi ứng dụng/thay đổi có Frontend / Dashboard):**
  * **100vh Zero-Scroll Studio Shell:** Cấm cuộn dọc toàn trang trên desktop viewports (`document.documentElement.scrollHeight <= window.innerHeight`). Khu vực canvas/làm việc chính phải chiếm >= 70% chiều cao khả dụng, không bị đè bẹp bởi headers/metrics cards to tướng.
  * **5-State UI Verification:** Mọi màn hình/component bắt buộc phải hiển thị đúng và có fallback card thẩm mỹ ở cả 5 trạng thái (`Empty`, `Loading`, `Error/Fallback`, `Disconnected/Retained`, `Success`). Nghiêm cấm để giật layout, tụt thanh công cụ, hoặc rơi vào màn hình đen rỗng (`#000`).
  * **Defensive Flexbox Overflow:** Mọi hàng ngang chứa text động (IDs, titles, badges) bắt buộc phải có `min-width: 0`, text ellipsis, các nút bấm action phải có `flex-shrink: 0`, và danh sách cuộn phải có `scrollbar-gutter: stable; overflow-x: hidden;` để ngăn tràn nút khi xuất hiện scrollbar.
  * **User-Intent Retention Invariant:** Đối với cơ chế retain preview/state: Chỉ lưu trạng thái khi có hành động click hoặc tương tác rõ ràng từ người dùng (`isUserClick = true`). Mọi session/tác vụ chạy ngầm do hệ thống tự auto-select khi tắt phải dọn dẹp sạch sẽ, không lưu rác.
  * **Deterministic Automated UI Test:** Kiểm tra giao diện bắt buộc phải có bài test E2E (Playwright) tự động assert 0 scroll và 0 button overflow qua các viewport (`1440px`, `1024px`, `768px`, `600px`).
- [ ] **Negative & Chaos Testing:** Kiểm tra biên (Edge cases): input rỗng, null, chuỗi quá dài, payload ký tự lạ, concurrency collisions.
- [ ] **BOLA/IDOR Defense:** Kiểm tra tenant/user ownership trên từng request độc lập (OWASP Sheet; WAHH, p.312–313).
- [ ] **Automated Security Scan:** Chạy `gate audit` đạt 0 finding ở mức Critical/High (quét secrets, dependency CVEs, SAST).
- [ ] **Evidence Capture:** Lưu trữ toàn bộ kết quả kiểm thử vào `docs/evidence/<feature>/test-run.txt` thông qua `gate evidence`, kèm báo cáo lỗi `docs/evidence/<feature>/qa-defects.json`.

### 3. Điều kiện chuyển tiếp (Gate Exit) & Vòng lặp phản hồi
- **Nếu phát hiện lỗi (Defects):**
  * QC ghi log chi tiết lỗi vào `docs/evidence/<feature>/qa-defects.json` (theo schema chuẩn máy đọc).
  * Trả quyền cho **DEV** sửa lỗi theo danh sách `defects` chưa resolve.
  * **Circuit Breaker:** Tối đa 3 vòng fix-and-retry. Nếu `cycle > 3` mà lỗi Critical/High vẫn tồn tại $\rightarrow$ Dừng lại, đánh dấu `BLOCKED_NEEDS_HUMAN` và yêu cầu can thiệp.
- **Nếu PASS:** 100% test xanh, `gate audit` sạch, file `qa-defects.json` có `status: "PASSED"` $\rightarrow$ Ký duyệt bàn giao sang DevOps.

---

## PHASE 4: DEVOPS (Packaging, Manifests & Release)
*Skills kích hoạt: `skills/k8s-manifest-hardening`, `skills/observability-and-release`, `skills/ops-release-strategies`, `skills/linux-ops-troubleshooting`, `skills/cicd-pipeline-engineering`*

### 1. Mục tiêu
Đảm bảo khả năng quan sát (observability), cấu hình triển khai an toàn, kịch bản rollback và quy trình phát hành tin cậy.

### 2. Tiêu chí kiểm duyệt (Invariants Checklist)
- [ ] **Structured Telemetry:** Log dạng JSON có gắn kèm `trace_id` / `correlation_id` (Distributed Systems Obs, p.23–24).
- [ ] **RED & 4 Golden Signals:** Metrics Prometheus về Rate, Errors, Duration và Saturation (Google SRE, p.86).
- [ ] **Two-Tier Graceful Shutdown:** Xử lý bắt tín hiệu `SIGTERM` (TLPI, p.437), drain requests và giải phóng DB connection pool trước khi thoát.
- [ ] **Kubernetes Manifest Hardening:** Resource limits/requests đầy đủ; `securityContext: runAsNonRoot: true`, drop ALL capabilities; liveness/readiness probes độc lập.

### 3. Điều kiện chuyển tiếp (Gate Exit)
- **HITL Mode:** Xuất báo cáo Delivery Report và Kế hoạch triển khai Tầng 2 (lệnh migrate/deploy) để con người phê duyệt.
- **Zero-Human Mode:**
  1. Dựng sandbox kiểm thử tạm thời (Ephemeral Staging / Docker Compose), chạy Smoke Test.
  2. Tự động commit, push branch `feat/<feature>`, và tạo **Pull Request (PR)** trên Git kèm bảng tổng kết và bằng chứng test. Tuyệt đối không tự ý deploy đè production thật.

---

## PHASE 5: INCIDENT RCA & BLAMELESS POSTMORTEM (Continuous Defect-to-Test Invariant Loop)
*Skills kích hoạt: `skills/incident-rca-and-postmortem`, `skills/qa-automation`, `skills/profiling-and-memory-optimization`, `skills/linux-ops-troubleshooting`*

### 1. Mục tiêu
Chuyển hóa mọi sự cố sản xuất, lỗi kiểm thử lọt lưới (QC blind spot/false-green) và suy thoái hiệu năng thành tài sản tri thức và bộ kiểm thử tự động (Automation Test) vĩnh viễn trong CI, ngăn chặn triệt để nguy cơ tái diễn.

### 2. Tiêu chí kiểm duyệt (Invariants Checklist)
- [ ] **Blameless Culture (Google SRE Ch.15):** Phân tích tập trung 100% vào lỗ hổng hệ thống, quy trình và công cụ kiểm thử. Tuyệt đối không quy kết lỗi cá nhân.
- [ ] **Chronological Timeline (UTC):** Tái dựng chính xác timeline từ $T_0$ (nguồn cơn), $T_{\text{detect}}$ (phát hiện), $T_{\text{triage}}$, $T_{\text{mitigate}}$ (phục hồi) đến $T_{\text{resolve}}$ (vá vĩnh viễn).
- [ ] **5 Whys Deep Causal Chain:** Truy vết từ Triệu chứng (Symptom) $\rightarrow$ Nguyên nhân trực tiếp $\rightarrow$ Nguyên nhân kiến trúc $\rightarrow$ Nguyên nhân gốc rễ (Lỗ hổng kiểm thử / Blind spot).
- [ ] **Mandatory CI Automation Invariant (Zero-Talk Mandate):** Mọi RCA bắt buộc phải đi kèm 1 test case tái hiện lỗi trong CI: Test phải FAIL trên mã nguồn cũ bị lỗi và PASS trên mã nguồn mới đã vá. Không có test tự động = Postmortem bị REJECT.
- [ ] **Action Items SLA:** Phân loại rõ P0 (chặn lỗi ngay trong 24h), P1 (kiến trúc bền vững trong sprint), P2 (giám sát/cảnh báo).
- [ ] **Postmortem Artifact:** Lưu trữ đầy đủ tại `docs/postmortems/YYYY-MM-DD-<incident-slug>.md`.

---

## Báo cáo Tổng kết Delivery (Delivery Summary Report)

```markdown
### Feature Delivery Report: [Tên tính năng]
- **Mode:** [Human-in-the-Loop | Zero-Human (Autonomous)]
- **Tier:** [Tier 1 Patch | Tier 2 Minor | Tier 3 Major]

- [x] **Phase 1 (BA-PO):** Spec validated (Gherkin ACs, Contract Schema, 5-State UI). Score: [95/100].
- [x] **Phase 2 (DEV):** Architecture aligned, DB migration safe (ESR index), TDD all GREEN.
- [x] **Phase 3 (QC):** 100% AC Traceability verified, Chaos/Edge cases passed, `gate audit` 0 findings.
- [x] **Phase 4 (DevOps):** Structured JSON logs active, SIGTERM graceful drain, PR created / Staging verified.

**Evidence Artifacts:** `docs/evidence/<feature>/test-run.txt`
```
