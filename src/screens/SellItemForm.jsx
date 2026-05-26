import React, { useState, useRef, useEffect } from "react";

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fff7ed";

const CATEGORIES = [
  { label: "Electronics", icon: "📱" },
  { label: "Furniture", icon: "🛋️" },
  { label: "Vehicles", icon: "🚲" },
  { label: "Clothes", icon: "👕" },
  { label: "Books", icon: "📚" },
  { label: "Appliances", icon: "📺" },
  { label: "Sports", icon: "⚽" },
  { label: "Other", icon: "📦" },
];

const CONDITIONS = [
  { label: "Like New", sub: "Hardly used, mint condition" },
  { label: "Good", sub: "Used but well maintained" },
  { label: "Fair / Used", sub: "Shows signs of wear and tear" },
  { label: "Brand New", sub: "Unopened / Unused" },
];

const AGE_OPTIONS = [
  "Less than 6 months", "6 months – 1 Year", "1-2 Years",
  "2-3 Years", "3-5 Years", "More than 5 Years",
];

const AREAS = [
  "Nanded City", "Vazirabad", "Cidco", "Shivaji Nagar",
  "Old Nanded", "Ardhapur", "Naigaon", "Taroda",
  "SRTMU Area", "Station Road", "Other",
];

const PLANS = [
  { days: 7, label: "7 Days", price: 39, strikePrice: null, popular: false },
  { days: 15, label: "15 Days", price: 59, strikePrice: 79, popular: true },
  { days: 30, label: "30 Days", price: 89, strikePrice: null, popular: false },
];

const STEP_META = [
  { title: "Item Details", sub: "What are you selling?" },
  { title: "Pricing & Location", sub: "Set your expected price" },
  { title: "Photos & Description", sub: "Add photos and details" },
  { title: "Choose Plan", sub: "How long should your listing stay live?" },
  { title: "Review & Post", sub: "Confirm your listing before going live" },
];

const TOTAL = 5;

// ── Real backend API call ─────────────────────────────────────────────────────
// Photos are sent as plain file references (FormData multipart), NOT base64,
// to avoid bloated JSON payloads and the 5 MB body limit. The server stores
// the uploaded file URLs (e.g. from object storage) and returns them in the
// listing response.
async function postItemToServer(formData, photoFiles) {
  try {
    const token = localStorage.getItem("cityplus_token") || "";

    // Build a multipart/form-data request so images are streamed as binary
    // rather than inflated ~33% as base64 text stored in the database.
    const body = new FormData();
    body.append("title",       formData.title.trim());
    body.append("category",    formData.category);
    body.append("condition",   formData.condition);
    body.append("age",         formData.age);
    body.append("price",       String(parseInt(formData.price) || 0));
    body.append("negotiable",  String(formData.negotiable));
    body.append("area",        formData.area);
    body.append("description", formData.description.trim());
    body.append("whatsapp",    formData.whatsapp.trim());
    body.append("plan_days",   String(formData.plan.days));
    body.append("plan_label",  formData.plan.label);
    body.append("plan_price",  String(formData.plan.price));

    // Attach each photo as a binary file — not base64
    photoFiles.forEach((file, i) => {
      body.append(`photo_${i}`, file, file.name || `photo_${i}.jpg`);
    });

    const apiBase = (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL)
      || "https://thecityplus.in";

    const res = await fetch(`${apiBase}/api/buysell`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Do NOT set Content-Type — the browser sets it automatically with the
      // correct multipart boundary when the body is FormData.
      body,
    });

    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {
      return { ok: false, error: "Server error. Please try again." };
    }
    return { ok: data.ok ?? res.ok, id: data.id, error: data.error };
  } catch (e) {
    return { ok: false, error: "Unable to connect. Check your internet connection." };
  }
}

// ── Animated slide wrapper ────────────────────────────────────────────────────
function SlideIn({ children, dir, trigger }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = dir === "next" ? "60px" : "-60px";
    el.animate([
      { transform: `translateX(${from})`, opacity: 0 },
      { transform: "translateX(0)", opacity: 1 },
    ], { duration: 280, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" });
  }, [trigger]);
  return <div ref={ref} style={{ opacity: 0 }}>{children}</div>;
}

// ── Radio option ──────────────────────────────────────────────────────────────
function RadioOption({ label, sub, selected, onPress }) {
  return (
    <button onClick={onPress} style={{
      display: "flex", alignItems: "center", gap: 12,
      width: "100%", textAlign: "left", cursor: "pointer",
      background: selected ? ORANGE_LIGHT : "#fff",
      border: `1.5px solid ${selected ? ORANGE : "#e8e8e8"}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
      transition: "all 0.2s ease",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        border: `2px solid ${selected ? ORANGE : "#ccc"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "border-color 0.2s",
      }}>
        {selected && (
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: ORANGE }} />
        )}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: selected ? ORANGE : "#222" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
function Label({ text, required }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 0.6, marginBottom: 8, textTransform: "uppercase" }}>
      {text}{required && <span style={{ color: ORANGE }}> *</span>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, type = "text", maxLength, multiline, rows = 5, prefix }) {
  const baseStyle = {
    background: "#fff", borderRadius: 12,
    border: "1.5px solid #ebebeb", fontSize: 14, color: "#111",
    padding: "13px 14px", width: "100%", boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };
  if (prefix) {
    return (
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: 16 }}>
        <div style={{
          background: "#f5f5f5", border: "1.5px solid #ebebeb", borderRight: "none",
          borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
          padding: "0 14px", display: "flex", alignItems: "center",
          fontSize: 15, fontWeight: 700, color: "#555", flexShrink: 0,
        }}>{prefix}</div>
        <input
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} type={type} maxLength={maxLength}
          style={{ ...baseStyle, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginBottom: 0 }}
        />
      </div>
    );
  }
  if (multiline) {
    return (
      <textarea
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows} maxLength={maxLength}
        style={{ ...baseStyle, resize: "vertical", lineHeight: 1.5 }}
      />
    );
  }
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} type={type} maxLength={maxLength}
      style={{ ...baseStyle, marginBottom: 0 }}
    />
  );
}

// ── Step progress dots ────────────────────────────────────────────────────────
function StepDots({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 22, height: 4, borderRadius: 3,
          background: i === step - 1 ? "#fff" : i < step ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ── Hero header ───────────────────────────────────────────────────────────────
function HeroHeader({ step, total, title, sub, onBack }) {
  return (
    <div style={{
      background: ORANGE, padding: "28px 24px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", width: 160, height: 160, borderRadius: "50%",
        background: "rgba(255,255,255,0.10)", top: -40, right: -30,
      }} />
      <div style={{
        position: "absolute", width: 90, height: 90, borderRadius: "50%",
        background: "rgba(255,255,255,0.07)", bottom: -20, right: 80,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, position: "relative" }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "rgba(255,255,255,0.22)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff", fontSize: 18, flexShrink: 0,
        }}>←</button>
        <StepDots step={step} total={total} />
        <div style={{
          marginLeft: "auto", background: "rgba(255,255,255,0.25)",
          borderRadius: 20, padding: "4px 12px",
        }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Step {step} of {total}</span>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Chip picker ───────────────────────────────────────────────────────────────
function ChipPicker({ value, options, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {options.map(opt => {
        const label = typeof opt === "string" ? opt : opt.label;
        const active = value === label;
        return (
          <button key={label} onClick={() => onSelect(label)} style={{
            padding: "8px 16px", borderRadius: 100,
            border: `1.5px solid ${active ? "#111" : "#e0e0e0"}`,
            background: active ? "#111" : "#fff",
            color: active ? "#fff" : "#555",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            transition: "all 0.2s ease",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════
export default function SellItemForm() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("next");
  const [trigger, setTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  // Store File objects (not blob URLs) so we can send them as multipart binary
  const [photoFiles, setPhotoFiles] = useState([]);
  // Blob URL previews only used for display — never stored in DB
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [customCategory, setCustomCategory] = useState('');
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    category: "Electronics",
    condition: "Good",
    age: "1-2 Years",
    price: "",
    negotiable: true,
    area: "Nanded City",
    description: "",
    whatsapp: "",
    plan: PLANS[1],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validate(s) {
    const e = {};
    if (s === 1 && !form.title.trim()) e.title = "Item title is required";
    if (s === 2 && !form.price.trim()) e.price = "Selling price is required";
    if (s === 3 && !form.whatsapp.trim()) e.whatsapp = "WhatsApp number is required";
    if (s === 3 && form.whatsapp.trim().length !== 10) e.whatsapp = "Enter a valid 10-digit number";
    return e;
  }

  function goNext() {
    const e = validate(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step < TOTAL) {
      setDir("next"); setTrigger(t => t + 1); setStep(s => s + 1);
    }
  }

  function goBack() {
    if (step > 1) {
      setDir("back"); setTrigger(t => t + 1); setStep(s => s - 1);
    }
  }

  async function submit() {
    if (!form.title || !form.price || !form.whatsapp) {
      setErrors({ submit: "Title, price and WhatsApp are required" });
      return;
    }
    if (form.category === "Other" && !customCategory.trim()) {
      setErrors({ submit: "Please type your category name" });
      return;
    }
    setLoading(true);
    // Use the real backend — photos sent as binary multipart, not base64
    const finalForm = {
      ...form,
      category: form.category === "Other" ? customCategory.trim() : form.category,
    };
    const res = await postItemToServer(finalForm, photoFiles);
    setLoading(false);
    if (res.ok) setSubmitted(true);
    else setErrors({ submit: res.error });
  }

  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    // Keep File objects for the real API call (binary multipart)
    setPhotoFiles(prev => [...prev, ...files].slice(0, 6));
    // Generate blob URL previews only for display in the UI
    const previews = files.map(f => URL.createObjectURL(f));
    setPhotoPreviews(prev => [...prev, ...previews].slice(0, 6));
  }

  function removePhoto(index) {
    // Revoke the blob URL to free memory
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    // Revoke any remaining blob preview URLs
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setSubmitted(false);
    setStep(1);
    setForm({
      title: "", category: "Electronics", condition: "Good",
      age: "1-2 Years", price: "", negotiable: true,
      area: "Nanded City", description: "", whatsapp: "", plan: PLANS[1],
    });
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setCustomCategory('');
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
        minHeight: 500, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", textAlign: "center",
        animation: "fadeIn 0.5s ease",
      }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} @keyframes bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "#fff7ed",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, marginBottom: 20, border: `2px solid ${ORANGE}`,
          animation: "bounce 0.6s ease 0.3s",
        }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 8 }}>Item Listed!</div>
        <div style={{ fontSize: 15, color: "#666", marginBottom: 8 }}>
          <strong style={{ color: "#111" }}>{form.title}</strong> is now live on Buy &amp; Sell.
        </div>
        <div style={{
          background: "#fff7ed", border: `1px solid ${ORANGE}`,
          borderRadius: 12, padding: "12px 20px", marginBottom: 24, fontSize: 13, color: "#c2410c",
        }}>
          📅 Active for <strong>{form.plan.label}</strong> · Paid ₹{form.plan.price}
        </div>
        <button onClick={resetForm} style={{
          background: ORANGE, color: "#fff", border: "none",
          borderRadius: 14, padding: "14px 32px",
          fontSize: 15, fontWeight: 800, cursor: "pointer",
        }}>Post Another Item</button>
      </div>
    );
  }

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  function Step1() {
    return (
      <div style={{ padding: "20px 24px" }}>
        <Label text="Ad Title" required />
        <Input
          value={form.title} onChange={v => { set("title", v); setErrors({}); }}
          placeholder="e.g. Samsung 42 inch TV, Wooden Study Table" maxLength={80}
        />
        {errors.title && <div style={{ color: "#ef4444", fontSize: 12, marginTop: -8, marginBottom: 12 }}>{errors.title}</div>}
        <div style={{ textAlign: "right", fontSize: 11, color: "#bbb", marginBottom: 16 }}>{form.title.length}/80</div>

        <Label text="Category" required />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: form.category === 'Other' ? 10 : 20 }}>
          {CATEGORIES.map(c => (
            <button key={c.label} onClick={() => { set("category", c.label); if (c.label !== 'Other') setCustomCategory(''); }} style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: form.category === c.label ? ORANGE_LIGHT : "#fff",
              border: `1.5px solid ${form.category === c.label ? ORANGE : "#ebebeb"}`,
              borderRadius: 12, padding: "12px 6px", cursor: "pointer", gap: 6,
              transition: "all 0.2s ease",
            }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: form.category === c.label ? ORANGE : "#888", textAlign: "center" }}>{c.label}</span>
            </button>
          ))}
        </div>
        {form.category === 'Other' && (
          <input
            type="text"
            value={customCategory}
            onChange={e => setCustomCategory(e.target.value)}
            placeholder="Type your category (e.g. Musical Instruments, Garden Tools…)"
            maxLength={60}
            style={{
              width: "100%", boxSizing: "border-box", marginBottom: 20,
              border: `1.5px solid ${ORANGE}`, borderRadius: 10,
              padding: "11px 14px", fontSize: 14, color: "#111", outline: "none",
            }}
          />
        )}

        <Label text="Condition" />
        {CONDITIONS.map(c => (
          <RadioOption key={c.label} label={c.label} sub={c.sub}
            selected={form.condition === c.label} onPress={() => set("condition", c.label)} />
        ))}

        <Label text="How old is it?" />
        <ChipPicker value={form.age} options={AGE_OPTIONS} onSelect={v => set("age", v)} />
      </div>
    );
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  function Step2() {
    return (
      <div style={{ padding: "20px 24px" }}>
        <Label text="Selling Price (₹)" required />
        <Input
          value={form.price} onChange={v => { set("price", v.replace(/[^0-9]/g, "")); setErrors({}); }}
          placeholder="e.g. 5000" type="text" prefix="₹"
        />
        {errors.price && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{errors.price}</div>}
        <div style={{ height: 8 }} />

        <Label text="Price Negotiable?" />
        <RadioOption label="Yes, Negotiable" selected={form.negotiable === true} onPress={() => set("negotiable", true)} />
        <RadioOption label="No, Fixed Price" selected={form.negotiable === false} onPress={() => set("negotiable", false)} />
        <div style={{ height: 8 }} />

        <Label text="Your Location / Area" required />
        <ChipPicker value={form.area} options={AREAS} onSelect={v => set("area", v)} />
      </div>
    );
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  function Step3() {
    return (
      <div style={{ padding: "20px 24px" }}>
        <Label text="Item Photos" />
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: "#fff", borderRadius: 14,
            border: `2px dashed #ffe5cc`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "28px 20px", marginBottom: 12, cursor: "pointer", gap: 8,
            transition: "border-color 0.2s",
          }}
        >
          <span style={{ fontSize: 28 }}>📤</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>Upload item photos</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Include multiple angles and any damage</div>
        </div>
        {/* accept only images; multiple allowed; captured as File objects, not base64 */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: "none" }} />
        {photoPreviews.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1.5px solid #ebebeb" }} />
                <button onClick={() => removePhoto(i)} style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20,
                  borderRadius: "50%", background: "#ef4444", color: "#fff",
                  border: "none", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        <Label text="Item Description" />
        <Input
          value={form.description} onChange={v => set("description", v)}
          placeholder="Provide details like brand, model, reason for selling, accessories included..."
          multiline maxLength={500}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: "#bbb", marginBottom: 16 }}>{form.description.length}/500</div>

        <Label text="WhatsApp Number" required />
        <Input
          value={form.whatsapp} onChange={v => { set("whatsapp", v.replace(/[^0-9]/g, "")); setErrors({}); }}
          placeholder="98765 43210" type="tel" maxLength={10} prefix="+91"
        />
        {errors.whatsapp && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{errors.whatsapp}</div>}
      </div>
    );
  }

  // ── Step 4 ─────────────────────────────────────────────────────────────────
  function Step4() {
    return (
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>How long should your listing stay live?</div>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>Your listing is automatically removed after the selected period.</div>

        {PLANS.map(plan => {
          const active = form.plan.days === plan.days;
          return (
            <button key={plan.days} onClick={() => set("plan", plan)} style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              background: active ? ORANGE : "#fff",
              border: `1.5px solid ${active ? ORANGE : "#ebebeb"}`,
              borderRadius: 14, padding: "16px", marginBottom: 12,
              cursor: "pointer", textAlign: "left",
              transition: "all 0.25s ease",
              position: "relative",
            }}>
              {plan.popular && !active && (
                <div style={{
                  position: "absolute", top: -10, right: 16,
                  background: "#111", color: "#fff",
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                }}>POPULAR</div>
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: active ? "rgba(255,255,255,0.25)" : ORANGE_LIGHT,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: active ? "#fff" : "#111" }}>{plan.label}</div>
                <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.75)" : "#aaa", marginTop: 2 }}>listing duration · pay once</div>
              </div>
              <div style={{ textAlign: "right", marginRight: 12 }}>
                {plan.strikePrice && (
                  <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.5)" : "#ccc", textDecoration: "line-through" }}>₹{plan.strikePrice}</div>
                )}
                <div style={{ fontSize: 16, fontWeight: 800, color: active ? "#fff" : ORANGE }}>₹{plan.price}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `2px solid ${active ? "#fff" : "#e0e0e0"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {active && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />}
              </div>
            </button>
          );
        })}

        <div style={{
          display: "flex", background: "#fff", borderRadius: 14,
          border: "1.5px solid #ebebeb", padding: 14,
          justifyContent: "space-around", marginTop: 8,
        }}>
          {[
            { icon: "⚡", label: "INSTANT ACTIVATION" },
            { icon: "🔒", label: "SECURE UPI / CARD" },
            { icon: "🔄", label: "RENEWABLE ANYTIME" },
          ].map(b => (
            <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#888", textAlign: "center", letterSpacing: 0.3 }}>{b.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    );
  }

  // ── Step 5 ─────────────────────────────────────────────────────────────────
  function Step5() {
    const groups = [
      {
        rows: [
          ["TITLE", form.title || "Not set", !form.title],
          ["CATEGORY", form.category === 'Other' ? (customCategory.trim() || 'Other') : form.category],
          ["CONDITION", form.condition],
          ["AGE", form.age],
        ]
      },
      {
        rows: [
          ["PRICE", form.price ? `₹${parseInt(form.price).toLocaleString("en-IN")}` : "Not set", !form.price],
          ["NEGOTIABLE", form.negotiable ? "Yes" : "No, Fixed Price"],
          ["LOCATION", form.area],
        ]
      },
      {
        rows: [["WHATSAPP", form.whatsapp ? `+91 ${form.whatsapp}` : "Not set", !form.whatsapp]]
      },
    ];

    return (
      <div style={{ padding: "20px 24px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#555", marginBottom: 14 }}>Review your item listing:</div>

        {groups.map((g, gi) => (
          <div key={gi} style={{
            background: "#fff", borderRadius: 14, border: "1.5px solid #ebebeb",
            overflow: "hidden", marginBottom: 10,
          }}>
            {g.rows.map(([k, v, err], ri) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 16px",
                borderBottom: ri < g.rows.length - 1 ? "1px solid #f5f5f5" : "none",
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 0.5 }}>{k}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: err ? "#ef4444" : "#111" }}>{v}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{
          background: "#fffbeb", border: "1.5px solid #fde68a",
          borderRadius: 14, overflow: "hidden", marginBottom: 10,
        }}>
          {[["DURATION", `${form.plan.label} listing`], ["AMOUNT", `₹${form.plan.price}`, true]].map(([k, v, accent], ri) => (
            <div key={k} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "13px 16px", borderBottom: ri === 0 ? "1px solid #fef3c7" : "none",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 0.5 }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: accent ? 800 : 600, color: accent ? ORANGE : "#111" }}>{v}</span>
            </div>
          ))}
        </div>

        {errors.submit && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 13, marginBottom: 12 }}>
            {errors.submit}
          </div>
        )}
        <div style={{ height: 8 }} />
      </div>
    );
  }

  const steps = [Step1, Step2, Step3, Step4, Step5];
  const StepComponent = steps[step - 1];

  return (
    <div style={{
      background: "#f5f5f5", borderRadius: 20, overflow: "hidden",
      maxWidth: 480, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        button { font-family: inherit; }
        input, textarea { font-family: inherit; }
        input:focus, textarea:focus { border-color: ${ORANGE} !important; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      <HeroHeader step={step} total={TOTAL} title={STEP_META[step - 1].title} sub={STEP_META[step - 1].sub} onBack={goBack} />

      <div style={{ overflowY: "auto", maxHeight: 460 }}>
        <SlideIn dir={dir} trigger={trigger}>
          <StepComponent />
        </SlideIn>
      </div>

      {/* Bottom bar */}
      <div style={{
        display: "flex", gap: 12, background: "#fff",
        padding: "16px 20px", borderTop: "1px solid #f0f0f0",
      }}>
        <button onClick={goBack} style={{
          flex: 1, padding: "15px 0", borderRadius: 14,
          border: "1.5px solid #e0e0e0", background: "#fff",
          fontSize: 15, fontWeight: 700, color: "#555", cursor: "pointer",
          transition: "background 0.2s",
        }}>Back</button>

        <button onClick={step === TOTAL ? submit : goNext} disabled={loading} style={{
          flex: 2.2, padding: "15px 0", borderRadius: 14,
          background: loading ? "#fbd5b0" : ORANGE, border: "none",
          fontSize: 15, fontWeight: 800, color: "#fff", cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : `0 4px 16px rgba(249,115,22,0.3)`,
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading ? (
            <>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                animation: "spin 0.7s linear infinite",
              }} />
              Posting...
            </>
          ) : step === TOTAL ? "Post Item 🚀" : "Continue →"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
