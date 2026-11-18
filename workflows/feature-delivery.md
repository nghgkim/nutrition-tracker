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

## 1. Cơ chế Lựa chọn Chế độ Thực thi & Cô lập Subagent (Subagent Isolation Matrix)

Để loại bỏ hiện tượng **Suy giảm ngữ cảnh (Context Drift)** và **Thiên kiến xác nhận (Confirmation Bias)** giữa DEV và QC, mỗi Phase BẮT BUỘC phải được cô lập trong subagent chuyên biệt:

| Phase | Subagent Role | Phạm vi Ngữ cảnh (Context Scope) | Chốt chặn đầu ra (Exit Gate) |
|---|---|---|---|
| **Phase 1: BA-PO** | `product-analyst` | Chỉ đọc yêu cầu nghiệp vụ, KB books. KHÔNG đọc code `src/`. | `docs/specs/<f>.md` đạt $\ge 90$đ qua Auto-Judge (`gate judge`). |
| **Phase 2: DEV** | `software-engineer` | Nhận Spec và Contract từ Phase 1. Làm việc trên worktree độc lập. | Unit tests pass + Production Build exit 0 (`npm run build`). |
| **Phase 3: QC** | `adversarial-qa` | **Cô lập hoàn toàn khỏi suy luận của DEV.** Chỉ nhận Spec và Code. | Suite `verify-ui.py` pass 100% + `test-run.txt` exit 0 + 0 defect. |
| **Phase 4: DEVOPS** | `site-reliability` | Nhận mã nguồn đã verify. Kiểm tra manifests, telemetry và ephemeral DB. | `gate audit` pass + Ephemeral DB migration pass + PR generated. |

### 1.1. Chuẩn hóa Tổ chức Thư mục & Tài liệu (Standard Directory Hierarchy)
Mọi dự án trên hệ thống phải tuân thủ nghiêm ngặt cấu trúc thư mục sau:
```
<project-root>/
├── AGENTS.md                  # Local stack rules, toolchain commands, ADR index
├── workflows/
│   └── feature-delivery.md    # Master 4-Phase pipeline contract
├── docs/
│   ├── specs/                 # Product specs: <feature>.md, .template-feature-spec.md
│   ├── decisions/             # Architecture Decision Records: ADR-0001-<slug>.md
│   ├── evidence/              # Verification proofs: <feature>/test-run.txt, visual/, qa-defects.json
│   ├── postmortems/           # Incident RCAs: YYYY-MM-DD-<slug>.md
│   ├── mockups/               # Interactive 5-state HTML mockups: <feature>.html
│   └── daily/                 # Daily logs & short-term memory (DAILY.md, archive/)
├── scripts/
│   ├── smoke.sh               # Host connectivity smoke test
│   ├── verify-ui.py           # Unified UI verification runner
│   └── ui-checks/             # Modular micro-verifiers (subresources, layout, visual, states)
└── src/ / tests/              # Source code và automated test suites
```

---

## 2. Ma trận Dual-Mode (Human-in-the-Loop vs Zero-Human)

Người dùng có thể kích hoạt chế độ tương ứng qua cờ lệnh hoặc câu lệnh prompt:

| Tiêu chí | Chế độ 1: Human-in-the-Loop (Mặc định) | Chế độ 2: Zero-Human (Tự hành 100%) |
|---|---|---|
| **Kích hoạt** | Mặc định (hoặc `gate check --mode=hitl`) | Thêm cờ `--auto` / `--autonomous` (hoặc prompt: "Full Auto") |
| **Chốt chặn Phase 1 (BA-PO)** | Dừng lại, tóm tắt Spec cho user và chờ gõ "Duyệt". | **Auto-Judge:** Chạy `gate judge <spec>` theo Rubric 100 điểm. Nếu $\ge 90$đ $\rightarrow$ Tự duyệt. |
| **Chốt chặn Phase 2 (DEV)** | DEV code xong, báo cáo nội bộ cho user. | Tự động chuyển giao sang Phase 3 khi build & linter exit 0. |
| **Chốt chặn Phase 3 (QC)** | QC xuất báo cáo test & an ninh cho user nghiệm thu. | **Adversarial Feedback Loop:** QC tự feedback lỗi về DEV sửa (Circuit Breaker tối đa 3 vòng). |
| **Chốt chặn Phase 4 (DEVOPS)**| User trực tiếp duyệt lệnh deploy/migration. | **Safe Staging & Git PR:** Dựng sandbox kiểm thử, commit branch `feat/*`, và mở Pull Request (không đè Prod). |

---

## PHASE 1: BA-PO (Spec-Driven Development — SDD & System Design)
*Subagent Role:* `product-analyst` (Isolated Context — không đọc source code `src/`)  
*Skills kích hoạt:* `skills/product-analyst`, `skills/api-and-domain-design`, `skills/system-design`, `skills/frontend-engineering-and-ui`, `skills/frontend-craftsman`, `skills/cli-and-sdk-craftsman`

### 1. Mục tiêu
Vận hành theo phương pháp luận **Spec-Driven Development (SDD)**: Xây dựng bản **Software Design Document (`docs/specs/<feature>.sdd.md`)** hoàn chỉnh làm Nguồn Chân lý Duy nhất (*Single Source of Truth*) trước khi viết bất kỳ dòng code logic nào.
> **Lệnh khởi tạo nhanh:** `gate sdd new <feature-name> [title] [--archetype=crawler|backend|worker|cli|frontend]`
> **Invariant:** No SDD, No Code (No Mockup, No Code) — Không có file SDD đạt điểm $\ge 90/100$ qua Auto-Judge = tuyệt đối không được phép chỉnh sửa source code `src/`.

### 2. Quy trình 5 Bước Nhỏ (Micro-Steps Breakdown)
* **Bước 1.1: Scope & Problem Statement:** Khởi tạo SDD từ template qua `gate sdd new <feature>`. Xác định rõ vấn đề của user, Persona và ranh giới In-scope / Out-of-scope.
* **Bước 1.2: Numbered Gherkin ACs:** Đánh số rõ ràng `AC-1`, `AC-2`... theo cấu trúc `Given - When - Then`. Mọi tiêu chí nghiệm thu bắt buộc phải kiểm chứng được tự động (testable).
* **Bước 1.3: Contract-First & Data Model:**
  - API endpoint, HTTP method, header `Idempotency-Key` (Geewax, p.407).
  - Phân trang chuẩn Keyset/Cursor-based (`after_id`/opaque token) (Geewax, p.326). Cấm dùng `OFFSET/LIMIT`.
  - Định dạng lỗi tuân thủ RFC 7807 (`application/problem+json`).
  - Database DDL, Composite Index theo quy tắc ESR (Equality -> Sort -> Range), migration rollback ready.
* **Bước 1.4: Architecture, Mental Model, Concurrency & Rejected Alternatives:**
  - **Mental Model & Visual Data Flow (Mermaid):** Sơ đồ Sequence/State Diagram trực quan mô tả luồng dữ liệu từ Client qua Boundary đến DB. Giúp kỹ sư nắm bắt bản chất trong 30 giây mà không cần đọc hàng trăm dòng code.
  - **Trade-offs & Rejected Alternatives (Bắt buộc):** Ghi rõ ít nhất 2 phương án kiến trúc/thư viện đã được cân nhắc và lý do loại bỏ (đánh đổi về RAM, CPU, Latency, Complexity).
  - **Key Engineering Takeaways:** Tóm tắt 2-3 bài học kiến trúc đọng lại áp dụng được cho các dự án khác.
  - Sơ đồ 3 tầng: Transport -> Domain Core -> Persistence.
  - Cơ chế khóa: Optimistic (`version`), Pessimistic (`SELECT FOR UPDATE`), hoặc Atomic.
  - Bảng Failure Modes: Timeout mạng, Retry Jitter, Rate Limit (429/403), Zombie processes.
  - *(Nếu có Frontend / UI)*: **Thiết kế Mobile-First bắt buộc (Principle VIII):**
    - Wireframe phân cấp Mobile (375px–390px) trước desktop. Bảng dữ liệu phải có phương án responsive (chuyển sang card hoặc horizontal swipe).
    - Touch ergonomics: Nút bấm và trigger đạt $\ge 44 \times 44\text{px}$, CTA chính neo vào Thumb Zone (vùng ngón cái chạm tới ở đáy màn hình).
    - Archetype UI & 5-State Interactive Mockup (`docs/mockups/<feature>.html`) hiển thị mặc định giao diện mobile.
* **Bước 1.5: Auto-Judge Rubric Gate:** Chạy `gate judge docs/specs/<feature>.sdd.md` đạt $\ge 90/100$ điểm (Rubric bắt buộc có Mental Model Mermaid, Rejected Alternatives, và Mobile-First nếu có UI).

### 3. Điều kiện chuyển tiếp (Gate Exit)
- **HITL Mode:** File SDD `docs/specs/<feature>.sdd.md` tồn tại, AC đánh số rõ ràng, con người gõ "Duyệt".
- **Zero-Human Mode:** Chạy lệnh `gate judge docs/specs/<feature>.sdd.md` đạt **Score $\ge 90/100$**. Nếu $< 90$, BA-PO tự động viết lại theo feedback của rubric (tối đa 3 lần).

---

## PHASE 2: DEV (Architecture, Clean Code & Implementation)
*Subagent Role:* `software-engineer` (Làm việc trong git branch/worktree độc lập, chỉ đọc Spec từ Phase 1)  
*Skills kích hoạt:* `skills/tech-stack-architect`, `skills/database-modeling-and-access`, `skills/testing-and-refactoring`, `skills/clean-code`, `skills/frontend-craftsman`, `skills/dev-event-driven`, `skills/dev-resilient-integration`, `skills/stealth-and-browser-engineering`, `skills/reverse-engineering-and-analysis`, `skills/caching-and-data-sync`, `skills/cli-and-sdk-craftsman`, Stack Overlays

### 1. Mục tiêu
Hiện thực hóa logic nghiệp vụ thông qua chu trình TDD nghiêm ngặt, tuân thủ Clean Architecture, Clean Code và các nguyên tắc Concurrency từ DDIA.

### 2. Quy trình 5 Bước Nhỏ (Micro-Steps Breakdown)
* **Bước 2.1: Pre-Flight & Scaffold Verification:**
  - Verify `postcss.config` / CSS engine đã sẵn sàng (không để unstyled UI).
  - Khởi tạo `.env.example` với đầy đủ biến môi trường.
  - Kiểm tra `scripts/smoke.sh` và `scripts/verify-ui.py` đã tồn tại trong repo.
* **Bước 2.2: TDD Red Step (Viết test trước):**
  - Viết test suite cho từng mã `AC-N` từ spec.
  - Chạy test và xác nhận test báo ĐỎ hợp lý (Failing).
* **Bước 2.3: TDD Green Step (Code sản xuất tối thiểu):**
  - Viết code vừa đủ để test pass XANH. Không viết code thừa ngoài spec.
* **Bước 2.4: Refactor, Pedagogical Anchors & Clean Code Discipline:**
  - Tách bạch 3 lớp: Transport (Controller) $\rightarrow$ Domain Core (Entities/UseCases) $\rightarrow$ Persistence (DB Adapters).
  - Hàm $\le 30$ dòng, không dùng flag arguments, xử lý ngoại lệ tường minh.
  - **Mobile-First CSS Invariant:** Style mặc định không prefix áp dụng cho Mobile (375px/390px); chỉ dùng breakpoint prefix (`sm:`, `md:`, `lg:`) để scale UP lên desktop. Cấm viết style desktop-first rồi đè ngược bằng `max-md:`.
  - **Touch & Input Invariants:** Nút bấm $\ge 44\text{px}$ chiều cao, input text font-size $\ge 16\text{px}$ tránh iOS auto-zoom, bảng dữ liệu responsive (chuyển sang card hoặc có container cuộn riêng biệt).
  - **Pedagogical Code Anchors:** Chú thích giải thích cơ chế "dưới nắp capo" (Mental Model) tại các đoạn mã then chốt (React lifecycle, async event loop, locks) để kỹ sư bảo trì và học hỏi dễ dàng.
  - **Zero Suppression Invariant:** Tuyệt đối không dùng comment ẩn lỗi (`eslint-disable`, `# noqa`, `#[allow(...)]`). Sửa tận gốc nguyên nhân.
  - Composite Index theo quy ước ESR: *Equality $\rightarrow$ Sort $\rightarrow$ Range* (DDIA, p.109).
  - Phân loại rõ Concurrency: Atomic Update, Pessimistic Locking (`SELECT FOR UPDATE`), hay Optimistic Locking (`version` column) (DDIA, p.268–269).
* **Bước 2.5: Build, Typecheck & Hygiene Gate:**
  - Chạy production build (`npm run build` / `cargo build` / `go build`) exit 0.
  - Chạy `gate hygiene --staged` đạt 0 vi phạm (Zero inline suppression comments).
  - Linter & Typecheck đạt 0 error. Cấm warnings im lặng.
* **Bước 2.6: Pedagogical Debrief & Under-The-Hood Walkthrough (Chống Black-box):**
  - Kỹ sư/Subagent tóm tắt cơ chế vận hành dưới nắp capo (CPU/Event loop, lifecycle, memory, network).
  - Ghi nhận 2-3 bẫy kỹ thuật (gotchas) phổ biến đã được phòng ngừa.
  - Chuẩn bị 3 câu hỏi Socratic để người dùng tự thẩm tra kiến thức.

### 3. Điều kiện chuyển tiếp (Gate Exit)
- 100% Unit test pass (exit 0).
- Production build sạch exit 0.
- `gate hygiene --staged` xác nhận 0 suppression tags (`eslint-disable`, `@ts-ignore`, `# noqa`).
- Mã nguồn và migration sẵn sàng trên branch để bàn giao sang QC.

---

## PHASE 3: QC (Adversarial Quality Control & Automated Verification)
*Subagent Role:* `adversarial-qa` (Hoàn toàn độc lập khỏi DEV context — chỉ nhận Spec và Code để tìm cách đánh sập hệ thống)  
*Skills kích hoạt:* `skills/qa-automation`, `skills/qc-frontend`, `skills/qc-backend`, `skills/qc-database`, `skills/qc-performance-load`, `skills/contract-verifier`, `skills/chaos-and-edge-hunter`, `skills/code-auditor`, `skills/app-security-hardening`, `skills/stealth-and-browser-engineering`, `skills/profiling-and-memory-optimization`, `skills/reverse-engineering-and-analysis`, `skills/caching-and-data-sync`

### 1. Mục tiêu
Đóng vai trò đối kháng độc lập (Adversarial Tester): Thẩm định sự tương thích với Spec, săn lỗi biên, stress test, kiểm định đa tầng UI/UX và audit an ninh.

### 2. Quy trình 6 Bước Nhỏ (Micro-Steps Breakdown)
* **Bước 3.1: AC Traceability Check:** Đối chiếu từng `AC-N` trong spec với test suites. Thiếu test cho bất kỳ AC nào = REJECT ngay.
* **Bước 3.2: Data Integrity & Anti-Fabrication Audit:**
  - Kiểm tra mọi dữ liệu seed/mock/fixtures phải có nguồn gốc rõ ràng (URL, DB snapshot). Cấm tuyệt đối dữ liệu bịa đặt ("User 1", "Item X").
* **Bước 3.3: Adversarial Fuzzing & Chaos Stress:**
  - Test biên: input rỗng, null, payload ký tự lạ, concurrency collisions, IDOR/BOLA tenant isolation.
* **Bước 3.4: Modular UI Verification Suite (Chạy `scripts/verify-ui.py` theo thứ tự Mobile-First):**
  - **Trình tự Viewport bắt buộc:** Mobile Compact (375x667) $\rightarrow$ Mobile Standard (390x844) $\rightarrow$ Tablet (768x1024) $\rightarrow$ Desktop (1440x900). Mobile chạy đầu tiên, phát hiện lỗi biên lập tức chặn lại!
  - **Module 1 (Subresources):** Bắt mọi HTTP 403, 429, 500 của CSS, JS, fonts, images.
  - **Module 2 (Layout & Mobile Invariants):**
    - Kiểm tra có thẻ `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
    - **Zero Horizontal Leak trên Mobile:** `scrollWidth <= clientWidth` trên viewports 375px và 390px. Xuất hiện thanh cuộn ngang trang = REJECT ngay.
    - **Touch Targets Audit:** Kiểm tra kích thước bounding box của mọi button, select, trigger $\ge 44 \times 44\text{px}$ (chiều cao tối thiểu $40\text{px}$).
    - **Studio Shell:** Kiểm tra 100vh studio constraint (`scrollHeight <= innerHeight`).
  - **Module 3 (Visual):** Anti-whiteout, background $\neq$ transparent, có stylesheets hoạt động.
  - **Module 4 (5-State):** Kiểm tra không rơi vào màn hình đen rỗng (`#000`), có fallback card cho Loading, Empty, Error.
* **Bước 3.5: Automated Security Scan:** Chạy `gate audit` đạt 0 finding ở mức Critical/High (secrets, dependency CVEs).
* **Bước 3.6: Defect Tracking & Circuit Breaker Auto-Rollback:**
  - Nếu có lỗi: QC xuất `docs/evidence/<feature>/qa-defects.json`. DEV sửa và QC re-test (tối đa 3 vòng).
  - **Auto-Rollback Trigger:** Nếu `cycle > 3` mà lỗi Critical/High chưa giải quyết: Hệ thống tự động kích hoạt `git reset` hoặc `git stash` hoàn nguyên working tree về trạng thái sạch, gắn cờ `BLOCKED_NEEDS_HUMAN` và dừng lại báo cáo rào cản kỹ thuật.

### 3. Điều kiện chuyển tiếp (Gate Exit)
- Bắt buộc đầy đủ 4 bằng chứng:
  1. `docs/evidence/<f>/test-run.txt` (exit code: 0)
  2. `docs/evidence/<f>/smoke.txt` (chạy qua host thật dev-vm exit 0)
  3. `docs/evidence/<f>/visual/report.json` (`"passed": true`)
  4. `docs/evidence/<f>/qa-defects.json` (`status: "PASSED"`, 0 unresolved defect)
- Thiếu bất kỳ file nào = REJECT, không cho phép bàn giao sang DevOps.

---

## PHASE 4: DEVOPS (Packaging, Manifests & Release)
*Subagent Role:* `site-reliability` (Quản trị hạ tầng, cấu hình triển khai an toàn và release)  
*Skills kích hoạt:* `skills/k8s-manifest-hardening`, `skills/observability-and-release`, `skills/ops-release-strategies`, `skills/linux-ops-troubleshooting`, `skills/cicd-pipeline-engineering`

### 1. Mục tiêu
Đảm bảo khả năng quan sát (observability), cấu hình triển khai an toàn, kịch bản rollback và quy trình phát hành tin cậy.

### 2. Quy trình 5 Bước Nhỏ (Micro-Steps Breakdown)
* **Bước 4.1: Ephemeral DB Sandbox Test (`gate db test`):**
  - Chạy migration UP $\rightarrow$ DOWN $\rightarrow$ UP trong container Postgres độc lập để xác nhận tính an toàn rollback.
* **Bước 4.2: Infrastructure & K8s Hardening:**
  - Resource requests/limits đầy đủ; `securityContext: runAsNonRoot: true`, drop ALL capabilities; liveness/readiness probes độc lập.
* **Bước 4.3: Observability & Telemetry Invariants:**
  - Structured JSON logs có gắn `trace_id` / `correlation_id`.
  - Two-tier Graceful Shutdown: bắt `SIGTERM`, drain request và giải phóng kết nối DB.
* **Bước 4.4: Rollback & Release Runbook:**
  - Lập tài liệu kế hoạch rollback chi tiết (Database down migration, `kubectl rollout undo`).
* **Bước 4.5: PR Packaging, Pedagogical Debrief & Delivery Handover (`gate pr create`):**
  - Tổng hợp toàn bộ bằng chứng từ 4 Phase vào `docs/evidence/<feature>/PR_DESCRIPTION.md`.
  - **Bắt buộc đính kèm 3 khối nội dung sư phạm (Anti-Blackbox):**
    1. *Under-the-Hood Mechanics*: Sơ đồ Mermaid sequence & cơ chế runtime giải thích luồng dữ liệu.
    2. *Trade-offs & Rejected Alternatives*: Tại sao chọn giải pháp này và từ chối các phương án khác.
    3. *Socratic Mastery Questions*: 3 câu hỏi đào sâu cơ chế để kỹ sư tự rà soát.
  - **Session Handover Block:** Chạy `gate status` / `gate next` và in rõ 3 hành động cụ thể tiếp theo cùng lệnh thực thi tương ứng.
  - Mở Git Pull Request (không deploy đè production).

---

## PHASE 5: DAILY KNOWLEDGE INGESTION & DEFECT-TO-INVARIANT LOOP
*Mục đích:* Tích lũy bài học sự cố hàng ngày và cập nhật bộ nhớ dài hạn cho toàn bộ hệ sinh thái.

### 1. Quy trình Quản lý Tri thức Hàng ngày (Daily Workflow)
1. **Active Working Buffer (`docs/daily/DAILY.md`):** Lưu trữ nhật ký 3–5 ngày gần nhất của dự án (Done, Obstacles, Invariants mới).
2. **Postmortem to Invariant Ingestion:** Khi có sự cố hoặc bug lọt lưới:
   - Viết blameless postmortem tại `docs/postmortems/YYYY-MM-DD-<slug>.md`.
   - Bắt buộc tạo **1 automated test case** bổ sung vào CI suite (chứng minh test fail trên code cũ và pass trên code mới).
   - Mã hóa invariant mới vào `scripts/ui-checks/` hoặc `workflows/feature-delivery.md`.
3. **Weekly Archival:** Định kỳ cuối tuần chuyển ngày cũ vào `docs/daily/archive/YYYY-MM.md`.

---

## Báo cáo Tổng kết Delivery (Delivery Summary Report)

```markdown
### Feature Delivery Report: [Tên tính năng]
- **Mode:** [Human-in-the-Loop | Zero-Human (Autonomous)]
- **Tier:** [Tier 1 Patch | Tier 2 Minor | Tier 3 Major]

- [x] **Phase 1 (BA-PO):** Spec validated (Gherkin ACs, Contract Schema, 5-State UI). Score: [95/100].
- [x] **Phase 2 (DEV):** Architecture aligned, DB migration safe (ESR index), TDD all GREEN, Zero suppressions (`gate hygiene`).
- [x] **Phase 3 (QC):** 100% AC Traceability verified, Chaos/Edge cases passed, `gate audit` 0 findings.
- [x] **Phase 4 (DevOps):** Structured JSON logs active, SIGTERM graceful drain, PR created / Staging verified.

#### 1. Under-the-Hood Runtime Mechanics
- [Tóm tắt luồng dữ liệu, vòng đời bộ nhớ, event loop hoặc cơ chế khóa]

#### 2. Trade-offs & Rejected Alternatives
- **Đã chọn:** [Giải pháp X]
- **Từ chối:** [Phương án Y vì lý do...]

#### 3. Socratic Mastery Questions (Kiểm tra hiểu sâu)
1. [Câu hỏi 1 về cơ chế luồng dữ liệu / concurrency]
2. [Câu hỏi 2 về giới hạn tài nguyên hoặc failure mode]
3. [Câu hỏi 3 về cách thức hoạt động ở tầng OS/Network/DB]

#### 4. Session Handover & Next Horizon
- **Trạng thái hiện tại:** [Hoàn thành Phase X, branch clean]
- **Lệnh thực thi tiếp theo:** `gate next` hoặc `gate scout`
- **Hành động cụ thể:** [1. Khởi động feature mới | 2. Review PR | 3. Nghiên cứu sâu qua `gate explain <topic>`]
```
