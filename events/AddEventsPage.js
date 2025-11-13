// ...imports...
import React, { useEffect, useState } from "react";
import Header from "./components/header";
import axios from "axios";
import { toast } from "react-toastify";

export default function AddEventsPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // ===== Helpers =====
  const toAbs = (maybe) => {
    if (!maybe) return null;
    try {
      return new URL(maybe).toString();
    } catch {
      const p = maybe.startsWith("/") ? maybe : `/${maybe}`;
      return new URL(p, BACKEND_URL).toString();
    }
  };

  // Convertit un ISO string / date DB en "yyyy-MM-ddTHH:mm" pour l'input datetime-local
  function toDatetimeLocal(value) {
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  // Convertit une date (ou string) en "yyyy-MM-dd" pour input[type=date]
  function toDateInput(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Statuts (pour l’onglet Active/Expired)
  const isExpired = (ev) => {
    const now = new Date();
    if (ev.recurrence_rule && ev.recurrence_rule !== "none") {
      if (ev.recurrence_until) {
        const until = new Date(ev.recurrence_until);
        until.setHours(23, 59, 59, 999);
        return until < now;
      }
      return false;
    }
    if (ev.end_at) return new Date(ev.end_at) < now;
    return false;
  };

  const isActive = (ev) => !isExpired(ev);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Image states
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // Mode: create vs edit
  const [editingId, setEditingId] = useState(null); // null = create, sinon id en édition

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_at: "",
    end_at: "",
    is_public: 1,
    sort_order: 0,
    payment_url: "",
    button_label: "",              // ⬅️ nouveau
    recurrence_rule: "none",       // 'none' | 'weekly'
    recurrence_day_of_week: "",    // 0..6 si weekly
    recurrence_until: "",          // yyyy-MM-dd
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      start_at: "",
      end_at: "",
      is_public: 1,
      sort_order: 0,
      payment_url: "",
      button_label: "",            // ⬅️ nouveau
      recurrence_rule: "none",
      recurrence_day_of_week: "",
      recurrence_until: "",
    });
    setImageFile(null);
    setPreview(null);
    setEditingId(null);
  };

  const load = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/events`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); // eslint-disable-next-line
  }, []);

  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onImage = (e) => {
    const f = e.target.files?.[0];
    setImageFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  // normalise le label (trim + limite 40)
  const normLabel = (s) => {
    if (typeof s !== "string") return "";
    const t = s.trim();
    return t.slice(0, 40);
  };

  // ===== Create =====
  const create = async (e) => {
    e.preventDefault();

    if (form.payment_url && !/^https?:\/\//i.test(form.payment_url)) {
      toast.error("payment_url invalide (http/https requis)");
      return;
    }

    const fd = new FormData();
    Object.entries({
      ...form,
      button_label: normLabel(form.button_label), // ⬅️ propre
    }).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (imageFile) fd.append("image", imageFile);

    try {
      await axios.post(`${BACKEND_URL}/events`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Event created");
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create event");
    }
  };

  // ===== Enter edit mode =====
  const edit = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title || "",
      description: ev.description || "",
      start_at: ev.start_at ? toDatetimeLocal(ev.start_at) : "",
      end_at: ev.end_at ? toDatetimeLocal(ev.end_at) : "",
      is_public: ev.is_public ? 1 : 0,
      sort_order: typeof ev.sort_order === "number" ? ev.sort_order : parseInt(ev.sort_order || 0, 10),
      payment_url: ev.payment_url || "",
      button_label: ev.button_label || "", // ⬅️ nouveau
      recurrence_rule: ev.recurrence_rule || "none",
      recurrence_day_of_week:
        ev.recurrence_day_of_week === 0 || ev.recurrence_day_of_week
          ? String(ev.recurrence_day_of_week)
          : "",
      recurrence_until: toDateInput(ev.recurrence_until || ""),
    });
    setImageFile(null);
    const existing = ev.image_url
      ? (ev.image_url.startsWith("http") ? ev.image_url : `${BACKEND_URL}${ev.image_url}`)
      : null;
    setPreview(existing);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== Update =====
  const update = async (e) => {
    e.preventDefault();
    if (!editingId) return;

    if (form.payment_url && !/^https?:\/\//i.test(form.payment_url)) {
      toast.error("payment_url invalide (http/https requis)");
      return;
    }

    const fd = new FormData();
    Object.entries({
      ...form,
      button_label: normLabel(form.button_label), // ⬅️ propre
    }).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (imageFile) fd.append("image", imageFile);

    try {
      await axios.put(`${BACKEND_URL}/events/${editingId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Event updated");
      resetForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update event");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/events/${id}`);
      toast.success("Event deleted");
      if (editingId === id) resetForm();
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  // ===== Tabs (All / Active / Expired) =====
  const [tab, setTab] = useState("all"); // 'all' | 'active' | 'expired'
  const filteredRows = rows.filter((ev) => {
    if (tab === "active") return isActive(ev);
    if (tab === "expired") return isExpired(ev);
    return true;
  });

  return (
    <>
      <Header />
      <div className="container my-4">
        <div className="row g-4">
          {/* ===== Formulaire ===== */}
          <div className="col-12 col-lg-5">
            <div className="card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-3">{editingId ? "Edit Event" : "Add Event"}</h5>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form
                onSubmit={editingId ? update : create}
                className="d-grid gap-3"
                encType="multipart/form-data"
              >
                <div>
                  <label className="form-label">Title *</label>
                  <input
                    className="form-control"
                    value={form.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) => onChange("description", e.target.value)}
                  />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">Start *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.start_at}
                      onChange={(e) => onChange("start_at", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label">End</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.end_at}
                      onChange={(e) => onChange("end_at", e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment URL */}
                <div>
                  <label className="form-label">Payment URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://..."
                    value={form.payment_url}
                    onChange={(e) => onChange("payment_url", e.target.value)}
                  />
                  <small className="text-muted">
                    Lien externe (Stripe/PayPal/autre). Laisse vide si non applicable.
                  </small>
                </div>

                {/* Button label */}
                <div>
                  <label className="form-label">Button label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder='ex: "Payer maintenant", "Réserver"…'
                    value={form.button_label}
                    maxLength={40}
                    onChange={(e) => onChange("button_label", e.target.value)}
                  />
                  <small className="text-muted">
                    Ce texte s&rsquo;affichera sur le bouton des cartes d&rsquo;événements (max 40 caractères).
                  </small>
                </div>

                {/* Récurrence */}
                <div className="row g-3">
                  <div className="col-12 col-sm-4">
                    <label className="form-label">Recurrence</label>
                    <select
                      className="form-select"
                      value={form.recurrence_rule}
                      onChange={(e) => onChange("recurrence_rule", e.target.value)}
                    >
                      <option value="none">None</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div className="col-12 col-sm-4">
                    <label className="form-label">Day (if weekly)</label>
                    <select
                      className="form-select"
                      value={form.recurrence_day_of_week}
                      onChange={(e) => onChange("recurrence_day_of_week", e.target.value)}
                      disabled={form.recurrence_rule !== "weekly"}
                    >
                      <option value="">—</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>

                  <div className="col-12 col-sm-4">
                    <label className="form-label">Until (optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.recurrence_until}
                      onChange={(e) => onChange("recurrence_until", e.target.value)}
                      disabled={form.recurrence_rule === "none"}
                    />
                  </div>
                </div>

                {/* Visibilité + ordre + image */}
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">
                      Image {editingId ? "(replace optional)" : "(1:1)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={onImage}
                    />
                    {preview && (
                      <small className="text-muted d-block mt-1">
                        Current/preview shown on the right
                      </small>
                    )}
                  </div>
                  <div className="col-12 col-sm-6 d-flex align-items-end">
                    {preview && (
                      <div
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid #eee",
                          marginLeft: "auto",
                        }}
                      >
                        <img
                          src={preview}
                          alt="preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      id="isPublic"
                      type="checkbox"
                      checked={!!form.is_public}
                      onChange={(e) => onChange("is_public", e.target.checked ? 1 : 0)}
                    />
                    <label className="form-check-label" htmlFor="isPublic">
                      Public
                    </label>
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="form-label">Sort Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.sort_order}
                      onChange={(e) =>
                        onChange("sort_order", parseInt(e.target.value || 0, 10))
                      }
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary details-btn">
                    {editingId ? "Update Event" : "Save Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ===== Liste ===== */}
          <div className="col-12 col-lg-7">
            <div className="card p-3">
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-3">Events List</h5>

                <div className="btn-group">
                  <button
                    className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setTab("all")}
                  >
                    All
                  </button>
                  <button
                    className={`btn btn-sm ${tab === "active" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setTab("active")}
                  >
                    Active
                  </button>
                  <button
                    className={`btn btn-sm ${tab === "expired" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setTab("expired")}
                  >
                    Expired
                  </button>
                </div>
              </div>

              {loading ? (
                <p className="text-muted">Loading…</p>
              ) : filteredRows.length === 0 ? (
                <p className="text-muted">No events.</p>
              ) : (
                <div className="card-grid">
                  {filteredRows.map((ev) => {
                    const expired = isExpired(ev);
                    return (
                      <div
                        key={ev.id}
                        className="person-card"
                        style={{
                          border: editingId === ev.id ? "2px solid #0d6efd" : "1px solid #eaeaea",
                          borderRadius: 10,
                          padding: 10,
                          opacity: expired ? 0.65 : 1,
                        }}
                      >
                        <div className="card-header d-flex justify-content-between">
                          <div className="card-name" style={{ paddingRight: 10 }}>
                            <h5 className="mb-1">
                              {ev.title}{" "}
                              {ev.recurrence_rule !== "none" && (
                                <span className="badge text-bg-info ms-1">Recurring</span>
                              )}
                              {expired && <span className="badge text-bg-secondary ms-1">Expired</span>}
                            </h5>
                            <p className="mb-1 text-muted">{ev.description || ""}</p>

                            <small className="text-muted d-block">
                              {new Date(ev.start_at).toLocaleString()}
                              {ev.end_at ? ` → ${new Date(ev.end_at).toLocaleString()}` : ""}
                            </small>

                            <small className="text-muted d-block">
                              {ev.is_public ? "Public" : "Hidden"} · Order {ev.sort_order}
                            </small>

                            {/* Aperçu du label de bouton */}
                            <small className="d-block mt-1">
                              Button label: <strong>{ev.button_label || <em>(none)</em>}</strong>
                            </small>

                            {ev.payment_url && (
                              <small className="d-block mt-1">
                                <a
                                  href={ev.payment_url.startsWith("http") ? ev.payment_url : toAbs(ev.payment_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Payment link
                                </a>
                              </small>
                            )}

                            {ev.recurrence_rule !== "none" && (
                              <small className="d-block text-muted">
                                Rule: {ev.recurrence_rule}
                                {ev.recurrence_day_of_week !== null &&
                                  ev.recurrence_day_of_week !== undefined &&
                                  ` · DOW ${ev.recurrence_day_of_week}`}
                                {ev.recurrence_until && ` · until ${toDateInput(ev.recurrence_until)}`}
                              </small>
                            )}
                          </div>

                          {ev.image_url ? (
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 8,
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={
                                  ev.image_url?.startsWith("http")
                                    ? ev.image_url
                                    : `${BACKEND_URL}${ev.image_url}`
                                }
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          ) : (
                            <img src="/assets/img/Closed.png" alt="icon" />
                          )}
                        </div>

                        <div className="card-footer d-flex justify-content-end gap-2">
                          <button className="btn btn-outline-primary" onClick={() => edit(ev)}>
                            Edit
                          </button>
                          <button className="btn btn-danger" onClick={() => del(ev.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </>
  );
}
