import React, { useEffect, useState } from "react";
import Header from "./components/header";
import axiosInstance from "../../utils/axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from '../../config';

export default function AddEventsPage() {
  const toAbs = (maybe) => {
    if (!maybe) return null;
    try {
      return new URL(maybe).toString();
    } catch {
      const p = maybe.startsWith("/") ? maybe : `/${maybe}`;
      return new URL(p, BACKEND_URL).toString();
    }
  };

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

  function toDateInput(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

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
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_at: "",
    end_at: "",
    is_public: 1,
    sort_order: 0,
    payment_url: "",
    button_label: "",
    recurrence_rule: "none",
    recurrence_day_of_week: "",
    recurrence_until: "",
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
      button_label: "",
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
      const { data } = await axiosInstance.get('/api/events');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onImage = (e) => {
    const f = e.target.files?.[0];
    setImageFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const normLabel = (s) => {
    if (typeof s !== "string") return "";
    const t = s.trim();
    return t.slice(0, 40);
  };

  const create = async (e) => {
    e.preventDefault();

    if (form.payment_url && !/^https?:\/\//i.test(form.payment_url)) {
      toast.error("Payment URL must start with http:// or https://");
      return;
    }

    const fd = new FormData();
    Object.entries({
      ...form,
      button_label: normLabel(form.button_label),
    }).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (imageFile) fd.append("image", imageFile);

    try {
      await axiosInstance.post('/api/events', fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Event created");
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create event");
    }
  };

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
      button_label: ev.button_label || "",
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

  const update = async (e) => {
    e.preventDefault();
    if (!editingId) return;

    if (form.payment_url && !/^https?:\/\//i.test(form.payment_url)) {
      toast.error("Payment URL must start with http:// or https://");
      return;
    }

    const fd = new FormData();
    Object.entries({
      ...form,
      button_label: normLabel(form.button_label),
    }).forEach(([k, v]) => fd.append(k, v ?? ""));
    if (imageFile) fd.append("image", imageFile);

    try {
      await axiosInstance.put(`/api/events/${editingId}`, fd, {
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
      await axiosInstance.delete(`/api/events/${id}`);
      toast.success("Event deleted");
      if (editingId === id) resetForm();
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const [tab, setTab] = useState("all");
  const filteredRows = rows.filter((ev) => {
    if (tab === "active") return isActive(ev);
    if (tab === "expired") return isExpired(ev);
    return true;
  });

  return (
    <>
      <Header />
      <div className="container">
        <div className="row">
          <div className="col-12 mx-auto my-5">
            <div className="text-center mb-4">
              <h5 className="h5-heading">Events Management</h5>
              <p style={{ color: "#6c757d", margin: 0 }}>Create, edit, and manage your facility events</p>
            </div>

        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <div className="card p-3 shadow-sm">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 style={{ margin: 0, fontWeight: 600 }}>
                  {editingId ? (
                    <span>
                      <span className="badge bg-warning text-dark me-2">Editing</span>
                      Update Event
                    </span>
                  ) : (
                    <span>
                      <span className="badge bg-success me-2">New</span>
                      Add Event
                    </span>
                  )}
                </h5>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={resetForm}
                  >
                    ✕ Cancel
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
                    External link (Stripe/PayPal/etc). Leave blank if not applicable.
                  </small>
                </div>

                <div>
                  <label className="form-label">Button Label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder='e.g., "Register Now", "Buy Tickets"'
                    value={form.button_label}
                    maxLength={40}
                    onChange={(e) => onChange("button_label", e.target.value)}
                  />
                  <small className="text-muted">
                    This text will appear on the event card button (max 40 characters).
                  </small>
                </div>

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

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label">
                      Image {editingId ? "(replace optional)" : "(1:1 aspect ratio)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      onChange={onImage}
                    />
                    {preview && (
                      <small className="text-muted d-block mt-1">
                        Preview shown on the right
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

          <div className="col-12 col-lg-7">
            <div className="card p-3 shadow-sm">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 style={{ margin: 0, fontWeight: 600 }}>Events List</h5>

                <div className="btn-group">
                  <button
                    className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setTab("all")}
                  >
                    All
                  </button>
                  <button
                    className={`btn btn-sm ${tab === "active" ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => setTab("active")}
                  >
                    Active
                  </button>
                  <button
                    className={`btn btn-sm ${tab === "expired" ? "btn-secondary" : "btn-outline-secondary"}`}
                    onClick={() => setTab("expired")}
                  >
                    Expired
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted mt-2">Loading events...</p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                  <p className="text-muted">No {tab !== "all" ? tab : ""} events found.</p>
                </div>
              ) : (
                <div className="card-grid">
                  {filteredRows.map((ev) => {
                    const expired = isExpired(ev);
                    const active = isActive(ev);
                    return (
                      <div
                        key={ev.id}
                        className="person-card"
                        style={{
                          border: editingId === ev.id ? "2px solid #0d6efd" : "1px solid #e9ecef",
                          borderRadius: 12,
                          padding: 14,
                          opacity: expired ? 0.7 : 1,
                          background: editingId === ev.id ? "#f8f9fa" : "#fff",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <div className="card-header d-flex justify-content-between">
                          <div className="card-name" style={{ paddingRight: 10 }}>
                            <div className="d-flex align-items-start gap-2 mb-2">
                              <h5 className="mb-0" style={{ flex: 1 }}>{ev.title}</h5>
                              <div className="d-flex gap-1 flex-wrap">
                                {active && <span className="badge bg-success">Active</span>}
                                {expired && <span className="badge bg-secondary">Expired</span>}
                                {ev.recurrence_rule !== "none" && (
                                  <span className="badge bg-info">Recurring</span>
                                )}
                                {!ev.is_public && <span className="badge bg-warning text-dark">Private</span>}
                              </div>
                            </div>
                            <p className="mb-1 text-muted">{ev.description || ""}</p>

                            <small className="text-muted d-block">
                              {new Date(ev.start_at).toLocaleString()}
                              {ev.end_at ? ` → ${new Date(ev.end_at).toLocaleString()}` : ""}
                            </small>

                            <small className="text-muted d-block">
                              {ev.is_public ? "Public" : "Hidden"} · Order {ev.sort_order}
                            </small>

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
                          <button className="btn btn-outline-primary btn-sm" onClick={() => edit(ev)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => del(ev.id)}>
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
          </div>
        </div>
      </div>
    </>
  );
}
