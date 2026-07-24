import React, { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Cake, Clock, PlusCircle, Laugh, Image as ImageIcon, X, Users, ChevronRight, Loader2 } from "lucide-react";

const FONT_IMPORT_ID = "fmb-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_IMPORT_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_IMPORT_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Karla:wght@400;500;700&display=swap";
  document.head.appendChild(link);
}

const PALETTE = {
  bg: "#241726",
  bgDeep: "#180F1A",
  card: "#FBF2E4",
  cream2: "#F3E6D0",
  ink: "#241726",
  cloud: "#F1E4EC",
  amber: "#E8A33D",
  amberDark: "#9C6A20",
  coral: "#E1614E",
  coralDark: "#8F3524",
  sage: "#8AA37E",
  sageDark: "#43563B",
  hairline: "rgba(251,242,228,0.16)",
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function compressImage(file, maxW = 720, quality = 0.62) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function daysUntilBirthday(mmdd) {
  if (!mmdd) return 9999;
  const [m, d] = mmdd.split("-").map(Number);
  const now = new Date();
  const thisYear = now.getFullYear();
  let target = new Date(thisYear, m - 1, d);
  target.setHours(0, 0, 0, 0);
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target < todayZero) target = new Date(thisYear + 1, m - 1, d);
  return Math.round((target - todayZero) / 86400000);
}

function Avatar({ name, size = 40 }) {
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: PALETTE.amber,
        color: PALETTE.amberDark,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Karla, sans-serif",
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function FriendMemoryBook() {
  useEffect(ensureFonts, []);

  const [members, setMembers] = useState([]);
  const [memories, setMemories] = useState([]);
  const [tab, setTab] = useState("timeline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let mem = [];
      try {
        const r = await window.storage.get("members", true);
        mem = r ? JSON.parse(r.value) : [];
      } catch {
        mem = [];
      }
      let list = [];
      try {
        const keysRes = await window.storage.list("memory:", true);
        const keys = keysRes?.keys || [];
        const items = await Promise.all(
          keys.map(async (k) => {
            try {
              const r = await window.storage.get(k, true);
              return r ? JSON.parse(r.value) : null;
            } catch {
              return null;
            }
          })
        );
        list = items.filter(Boolean).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      } catch {
        list = [];
      }
      setMembers(mem);
      setMemories(list);
    } catch (e) {
      setError("Couldn't load your memory book. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function saveMembers(next) {
    setMembers(next);
    try {
      await window.storage.set("members", JSON.stringify(next), true);
    } catch {
      setError("Couldn't save — check your connection and try again.");
    }
  }

  async function addMemory(entry) {
    const withId = { ...entry, id: uid() };
    setSaving(true);
    try {
      await window.storage.set("memory:" + withId.id, JSON.stringify(withId), true);
      setMemories((prev) => [withId, ...prev].sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    } catch {
      setError("Couldn't save that memory — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const upcomingBirthdays = [...members]
    .filter((m) => m.birthday)
    .map((m) => ({ ...m, daysLeft: daysUntilBirthday(m.birthday) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const photoMemories = memories.filter((m) => m.image);
  const funnyMemories = memories.filter((m) => m.funny);

  return (
    <div
      style={{
        fontFamily: "Karla, sans-serif",
        background: `linear-gradient(180deg, ${PALETTE.bg} 0%, ${PALETTE.bgDeep} 100%)`,
        minHeight: "100vh",
        color: PALETTE.cloud,
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <Header memberCount={members.length} />

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 96px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 10, color: PALETTE.cloud, opacity: 0.7 }}>
            <Loader2 size={28} className="fmb-spin" />
            <span style={{ fontSize: 14 }}>Opening the memory book…</span>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: "rgba(225,97,78,0.18)", border: `1px solid ${PALETTE.coral}`, color: PALETTE.cloud, borderRadius: 12, padding: "10px 14px", fontSize: 13, margin: "12px 0" }}>
                {error}
              </div>
            )}
            {tab === "timeline" && <Timeline memories={memories} members={members} />}
            {tab === "album" && <Album memories={photoMemories} />}
            {tab === "birthdays" && <Birthdays list={upcomingBirthdays} />}
            {tab === "add" && (
              <AddPanel members={members} onAddMember={(m) => saveMembers([...members, m])} onAddMemory={addMemory} saving={saving} />
            )}
            {tab === "funny" && <FunnyList list={funnyMemories} />}
          </>
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} />
      <style>{`
        .fmb-spin { animation: fmbspin 1s linear infinite; }
        @keyframes fmbspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function Header({ memberCount }) {
  return (
    <div
      style={{
        padding: "26px 20px 18px",
        borderBottom: `1px solid ${PALETTE.hairline}`,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: PALETTE.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Camera size={15} color={PALETTE.amberDark} />
        </div>
        <span style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55 }}>Private circle{memberCount ? ` · ${memberCount} friend${memberCount === 1 ? "" : "s"}` : ""}</span>
      </div>
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 600,
          fontSize: 30,
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        Friend Memory Book
      </h1>
      <p style={{ margin: "6px 0 0", fontSize: 13.5, opacity: 0.65, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
        Every friend group needs a place to keep the good stuff.
      </p>
    </div>
  );
}

function SectionLabel({ icon, children, color = PALETTE.amber, colorDark = PALETTE.amberDark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 14px" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, opacity: 0.75 }}>{children}</span>
    </div>
  );
}

function Timeline({ memories, members }) {
  if (memories.length === 0) {
    return <EmptyState text="Your timeline is empty. Add your first memory below and it'll show up here, film-strip style." />;
  }
  return (
    <div>
      <SectionLabel icon={<Clock size={13} color={PALETTE.amberDark} />}>Friendship timeline</SectionLabel>
      <div style={{ position: "relative", paddingLeft: 18 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: PALETTE.hairline }} />
        {memories.map((m) => (
          <div key={m.id} style={{ position: "relative", marginBottom: 18 }}>
            <div
              style={{
                position: "absolute",
                left: -18,
                top: 6,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: m.funny ? PALETTE.sage : m.image ? PALETTE.amber : PALETTE.coral,
                border: `2px solid ${PALETTE.bg}`,
              }}
            />
            <MemoryCard memory={m} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function MemoryCard({ memory, compact }) {
  return (
    <div
      style={{
        background: PALETTE.card,
        color: PALETTE.ink,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
      }}
    >
      {memory.image && (
        <img src={memory.image} alt="" style={{ width: "100%", display: "block", maxHeight: compact ? 220 : 320, objectFit: "cover" }} />
      )}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: PALETTE.amberDark, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {memory.author || "Someone"}
          </span>
          <span style={{ fontSize: 11, opacity: 0.55, flexShrink: 0 }}>{fmtDate(memory.date)}</span>
        </div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45, fontFamily: "'Fraunces', serif" }}>{memory.caption}</p>
        {memory.funny && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, fontWeight: 700, color: PALETTE.sageDark, background: "rgba(138,163,126,0.25)", padding: "3px 8px", borderRadius: 999 }}>
            <Laugh size={11} /> Funny moment
          </span>
        )}
      </div>
    </div>
  );
}

function Album({ memories }) {
  if (memories.length === 0) {
    return <EmptyState text="No photos yet. Upload one from the Add tab to start the album." />;
  }
  return (
    <div>
      <SectionLabel icon={<ImageIcon size={13} color={PALETTE.amberDark} />}>Photo album</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {memories.map((m) => (
          <div key={m.id} style={{ borderRadius: 12, overflow: "hidden", background: PALETTE.card }}>
            <img src={m.image} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
            <div style={{ padding: "8px 10px" }}>
              <p style={{ margin: 0, fontSize: 12.5, color: PALETTE.ink, lineHeight: 1.3 }}>{m.caption}</p>
              <span style={{ fontSize: 10.5, color: PALETTE.amberDark, fontWeight: 700 }}>{m.author}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnyList({ list }) {
  if (list.length === 0) {
    return <EmptyState text="No funny moments logged yet — tag a memory as funny when you add it." />;
  }
  return (
    <div>
      <SectionLabel icon={<Laugh size={13} color={PALETTE.sageDark} />} color={PALETTE.sage} colorDark={PALETTE.sageDark}>
        Funny moments
      </SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((m) => (
          <MemoryCard key={m.id} memory={m} />
        ))}
      </div>
    </div>
  );
}

function Birthdays({ list }) {
  if (list.length === 0) {
    return <EmptyState text="No birthdays saved yet. Add a friend and their birthday from the Add tab." />;
  }
  return (
    <div>
      <SectionLabel icon={<Cake size={13} color={PALETTE.coralDark} />} color={PALETTE.coral} colorDark={PALETTE.coralDark}>
        Upcoming birthdays
      </SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((m) => (
          <div
            key={m.id}
            style={{
              background: PALETTE.card,
              borderRadius: 14,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar name={m.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: PALETTE.ink, fontFamily: "'Fraunces', serif" }}>{m.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.amberDark }}>
                {m.daysLeft === 0 ? "Today!" : m.daysLeft === 1 ? "Tomorrow" : `In ${m.daysLeft} days`}
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: m.daysLeft <= 7 ? PALETTE.coral : PALETTE.cream2,
                color: m.daysLeft <= 7 ? "#fff" : PALETTE.ink,
                padding: "5px 10px",
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              {m.birthday}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "50px 20px",
        color: PALETTE.cloud,
        opacity: 0.6,
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

function AddPanel({ members, onAddMember, onAddMemory, saving }) {
  const [mode, setMode] = useState("memory");

  return (
    <div>
      <SectionLabel icon={<PlusCircle size={13} color={PALETTE.amberDark} />}>Add something</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <ToggleChip active={mode === "memory"} onClick={() => setMode("memory")}>
          Memory / photo
        </ToggleChip>
        <ToggleChip active={mode === "friend"} onClick={() => setMode("friend")}>
          Friend + birthday
        </ToggleChip>
      </div>
      {mode === "memory" ? (
        <MemoryForm members={members} onSubmit={onAddMemory} saving={saving} />
      ) : (
        <FriendForm onSubmit={onAddMember} />
      )}
    </div>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        border: `1px solid ${active ? PALETTE.amber : PALETTE.hairline}`,
        background: active ? PALETTE.amber : "transparent",
        color: active ? PALETTE.amberDark : PALETTE.cloud,
        borderRadius: 999,
        padding: "9px 10px",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(251,242,228,0.08)",
  border: `1px solid ${PALETTE.hairline}`,
  borderRadius: 10,
  padding: "10px 12px",
  color: PALETTE.cloud,
  fontSize: 14,
  fontFamily: "Karla, sans-serif",
  marginBottom: 12,
};

const labelStyle = { fontSize: 12, opacity: 0.65, marginBottom: 6, display: "block" };

function MemoryForm({ members, onSubmit, saving }) {
  const [author, setAuthor] = useState(members[0]?.name || "");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(todayISO());
  const [funny, setFunny] = useState(false);
  const [image, setImage] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const data = await compressImage(file);
      setImage(data);
    } catch {
      // ignore, keep no image
    } finally {
      setImgBusy(false);
    }
  }

  function reset() {
    setCaption("");
    setImage(null);
    setFunny(false);
    setDate(todayISO());
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!caption.trim() && !image) return;
    await onSubmit({ author: author || "Someone", caption: caption.trim() || "A moment worth keeping.", date, funny, image });
    reset();
  }

  return (
    <div>
      <label style={labelStyle}>Who's adding this?</label>
      <input style={inputStyle} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" />

      <label style={labelStyle}>What happened?</label>
      <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tell the story..." />

      <label style={labelStyle}>Date</label>
      <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />

      <label style={labelStyle}>Photo (optional)</label>
      <div style={{ marginBottom: 12 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} id="fmb-file" />
        <label
          htmlFor="fmb-file"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: `1px dashed ${PALETTE.hairline}`,
            borderRadius: 10,
            padding: "16px",
            cursor: "pointer",
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          {imgBusy ? <Loader2 size={16} className="fmb-spin" /> : <Camera size={16} />}
          {image ? "Photo added — tap to change" : imgBusy ? "Processing photo…" : "Tap to upload a photo"}
        </label>
        {image && <img src={image} alt="" style={{ width: "100%", borderRadius: 10, marginTop: 8, maxHeight: 180, objectFit: "cover" }} />}
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13.5, cursor: "pointer" }}>
        <input type="checkbox" checked={funny} onChange={(e) => setFunny(e.target.checked)} />
        Tag as a funny moment
      </label>

      <button
        onClick={submit}
        disabled={saving || imgBusy}
        style={{
          width: "100%",
          background: PALETTE.amber,
          color: PALETTE.amberDark,
          border: "none",
          borderRadius: 12,
          padding: "13px",
          fontSize: 15,
          fontWeight: 700,
          cursor: saving ? "default" : "pointer",
          opacity: saving || imgBusy ? 0.7 : 1,
        }}
      >
        {saving ? "Saving…" : "Add to the book"}
      </button>
    </div>
  );
}

function FriendForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [month, setMonth] = useState("01");
  const [day, setDay] = useState("01");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    await onSubmit({ id: uid(), name: name.trim(), birthday: `${month}-${day}` });
    setBusy(false);
    setName("");
  }

  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

  return (
    <div>
      <label style={labelStyle}>Friend's name</label>
      <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya" />

      <label style={labelStyle}>Birthday</label>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <select style={{ ...inputStyle, marginBottom: 0 }} value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(2000, Number(m) - 1, 1).toLocaleString(undefined, { month: "long" })}
            </option>
          ))}
        </select>
        <select style={{ ...inputStyle, marginBottom: 0, maxWidth: 90 }} value={day} onChange={(e) => setDay(e.target.value)}>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={submit}
        disabled={busy}
        style={{
          width: "100%",
          background: PALETTE.coral,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "13px",
          fontSize: 15,
          fontWeight: 700,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Saving…" : "Add friend"}
      </button>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "album", label: "Album", icon: ImageIcon },
    { id: "funny", label: "Funny", icon: Laugh },
    { id: "birthdays", label: "Birthdays", icon: Cake },
    { id: "add", label: "Add", icon: PlusCircle },
  ];
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        display: "flex",
        background: PALETTE.bgDeep,
        borderTop: `1px solid ${PALETTE.hairline}`,
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "6px 2px",
              cursor: "pointer",
              color: active ? PALETTE.amber : PALETTE.cloud,
              opacity: active ? 1 : 0.55,
            }}
          >
            <Icon size={19} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
