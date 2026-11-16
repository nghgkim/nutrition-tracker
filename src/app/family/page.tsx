"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Mail, Crown } from "lucide-react";

interface Member { userId: string; name: string | null; email: string; role: string; caloriesToday: number; }

export default function FamilyPage() {
  const router = useRouter();
  const [family, setFamily] = useState<{ name: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [feed, setFeed] = useState<{ name: string | null; value: number }[]>([]);
  const [feedFeature, setFeedFeature] = useState("calo");

  async function load() {
    const res = await fetch("/api/family");
    if (res.status === 401) { router.push("/login"); return; }
    const d = await res.json();
    setFamily(d.family);
    if (d.family) {
      const m = await fetch("/api/family/members");
      const md = await m.json();
      setMembers(md.members || []);
    }
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!family) return;
    fetch(`/api/family/feed?feature=${feedFeature}`).then(r => r.json()).then(d => setFeed(d.members || [])).catch(() => {});
  }, [feedFeature, family]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setName("");
    load();
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/family/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await res.json();
    setMsg(res.ok ? "Đã mời thành công" : (d.error || "Lỗi"));
    if (res.ok) setEmail("");
    load();
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6"><div className="h-64 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cộng đồng</p><h1 className="text-2xl font-semibold tracking-tight">Gia đình</h1></div>
      {!family ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 elevated text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="mt-3 text-lg font-semibold">Tạo gia đình của bạn</h2>
          <p className="mt-1 text-sm text-muted-foreground">Theo dõi calo của cả nhà cùng một chỗ.</p>
          <form onSubmit={create} className="mt-5 flex gap-2 justify-center">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tên gia đình" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required />
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"><Plus className="h-4 w-4" /> Tạo</button>
          </form>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
            <div className="flex items-center justify-between">
              <div><div className="text-xs text-muted-foreground">Gia đình</div><h2 className="text-xl font-semibold">{family.name}</h2></div>
              <Users className="h-8 w-8 text-primary/40" />
            </div>
            <form onSubmit={invite} className="mt-5 flex gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email người cần mời" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required />
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"><Mail className="h-4 w-4" /> Mời</button>
            </form>
            {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
          </div>
          <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60"><h2 className="text-sm font-semibold">Thành viên ({members.length})</h2></div>
            <ul className="divide-y divide-border/60">
              {members.map(m => (
                <li key={m.userId} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{m.role === "owner" ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}</span>
                    <div><div className="text-sm font-medium">{m.name || m.email}</div><div className="text-xs text-muted-foreground">{m.role === "owner" ? "Chủ gia đình" : "Thành viên"}</div></div>
                  </div>
                  <span className="text-sm font-medium text-primary">{m.caloriesToday} kcal hôm nay</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60 flex gap-2">
              {([["calo","🔥 Calo"],["exercise","🏃 Tập luyện"],["finance","💰 Chi tiêu"],["weight","⚖️ Cân nặng"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setFeedFeature(k)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${feedFeature === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
              ))}
            </div>
            {feed.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center"><Users className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Chưa có thành viên chia sẻ</p></div>
            ) : (
              <ul className="divide-y divide-border/60">
                {feed.map(m => (<li key={m.name || ""} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium">{m.name || "Thành viên"}</span>
                  <span className="text-sm font-semibold text-primary">{feedFeature === "finance" ? new Intl.NumberFormat("vi-VN").format(m.value) + " ₫" : feedFeature === "weight" ? m.value + " kg" : m.value + " kcal"}</span>
                </li>))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
