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

  function formatEventSchedule(start, end) {
    if (!start) return "No schedule";
    const s = new Date(start);
    if (isNaN(s)) return "Invalid date";
    
    const pad = (n) => String(n).padStart(2, "0");
    const formatDT = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    const startStr = formatDT(s);
    if (!end) return startStr;
    
    const e = new Date(end);
    if (isNaN(e)) return startStr;
    
    return `${startStr} → ${formatDT(e)}`;
  }

  function getDayName(dayNum) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNum] || `Day ${dayNum}`;
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

  const isActive = (ev) => !isExpired(ev) && !!ev.is_public;

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
            <div className="card shadow-sm" style={{ border: '1px solid #e3e6f0', borderRadius: '12px', position: 'relative' }}>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={resetForm}
                  style={{ 
                    position: 'absolute',
                    top: '20px',
                    right: '24px',
                    zIndex: 10,
                    borderRadius: '8px',
                    padding: '6px 16px',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="bi bi-x-lg"></i> Cancel
                </button>
              )}
              <div className="card-header bg-white" style={{ 
                borderBottom: '1px solid #e3e6f0', 
                borderRadius: '12px 12px 0 0',
                padding: '20px 24px'
              }}>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>
                    {editingId ? "Edit Event" : "Add Event"}
                  </h5>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6c757d' }}>
                    {editingId ? "Update event details below" : "Fill in the form to create a new event"}
                  </p>
                </div>
              </div>
              
              <div className="card-body" style={{ padding: '24px' }}>

              <form
                onSubmit={editingId ? update : create}
                encType="multipart/form-data"
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                    Event Title <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    className="form-control"
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                    value={form.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px', resize: 'vertical' }}
                    rows={3}
                    value={form.description}
                    onChange={(e) => onChange("description", e.target.value)}
                    placeholder="Brief description of the event"
                  />
                </div>

                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                      Start Date & Time <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                      value={form.start_at}
                      onChange={(e) => onChange("start_at", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>End Date & Time</span>
                      {form.end_at && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => onChange("end_at", "")}
                          style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                      value={form.end_at}
                      onChange={(e) => onChange("end_at", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                    Payment URL
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                    placeholder="https://stripe.com/payment-link"
                    value={form.payment_url}
                    onChange={(e) => onChange("payment_url", e.target.value)}
                  />
                  <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    External payment link (Stripe/PayPal/etc). Leave blank if not applicable.
                  </small>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                    Button Label
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                    placeholder='e.g., "Register Now", "Buy Tickets"'
                    value={form.button_label}
                    maxLength={40}
                    onChange={(e) => onChange("button_label", e.target.value)}
                  />
                  <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    This text will appear on the event card button (max 40 characters).
                  </small>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#2c3e50' }}>
                    Recurrence Settings
                  </label>
                  <div className="row g-3">
                    <div className="col-12 col-sm-4">
                      <select
                        className="form-select"
                        style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                        value={form.recurrence_rule}
                        onChange={(e) => onChange("recurrence_rule", e.target.value)}
                      >
                        <option value="none">None</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>Repeat pattern</small>
                    </div>

                    <div className="col-12 col-sm-4">
                      <select
                        className="form-select"
                        style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                        value={form.recurrence_day_of_week}
                        onChange={(e) => onChange("recurrence_day_of_week", e.target.value)}
                        disabled={form.recurrence_rule !== "weekly"}
                      >
                        <option value="">Select day</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                      <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>Day of week</small>
                    </div>

                    <div className="col-12 col-sm-4">
                      <div style={{ position: 'relative' }}>
                        <input
                          type="date"
                          className="form-control"
                          style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px', paddingRight: form.recurrence_until ? '60px' : '14px' }}
                          value={form.recurrence_until}
                          onChange={(e) => onChange("recurrence_until", e.target.value)}
                          disabled={form.recurrence_rule === "none"}
                        />
                        {form.recurrence_until && form.recurrence_rule !== "none" && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => onChange("recurrence_until", "")}
                            style={{ 
                              position: 'absolute', 
                              right: '6px', 
                              top: '6px', 
                              fontSize: '10px', 
                              padding: '2px 6px', 
                              borderRadius: '4px' 
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>Until date</small>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: '#2c3e50' }}>
                    Event Image
                  </label>
                  <div className="row g-3 align-items-end">
                    <div className="col-12 col-sm-7">
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                        onChange={onImage}
                      />
                      <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {editingId ? "Upload new image to replace existing" : "Recommended: Square image (1:1 aspect ratio)"}
                      </small>
                    </div>
                    <div className="col-12 col-sm-5 d-flex justify-content-end">
                      {preview && (
                        <div
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: 10,
                            overflow: "hidden",
                            border: "2px solid #e3e6f0",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
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
                </div>

                <div className="row g-3 align-items-center" style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="col-12 col-sm-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        id="isPublic"
                        type="checkbox"
                        checked={!!form.is_public}
                        onChange={(e) => onChange("is_public", e.target.checked ? 1 : 0)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <label className="form-check-label" htmlFor="isPublic" style={{ marginLeft: '8px', fontWeight: 600, fontSize: '14px' }}>
                        Make this event public
                      </label>
                      <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginLeft: '26px' }}>
                        Visible to all users
                      </small>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: '#2c3e50' }}>
                      Display Order
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
                      value={form.sort_order}
                      onChange={(e) =>
                        onChange("sort_order", parseInt(e.target.value || 0, 10))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-3" style={{ borderTop: '1px solid #e3e6f0', marginTop: '4px' }}>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={resetForm}
                      style={{ borderRadius: '8px' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary details-btn" style={{ borderRadius: '8px', fontWeight: 600 }}>
                    {editingId ? "Update Event" : "Save Event"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <div className="card shadow-sm" style={{ border: '1px solid #e3e6f0', borderRadius: '12px', position: 'relative' }}>
              <div className="btn-group" style={{ 
                position: 'absolute',
                top: '20px',
                right: '24px',
                zIndex: 10,
                borderRadius: '8px', 
                overflow: 'hidden' 
              }}>
                <button
                  className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setTab("all")}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  All
                </button>
                <button
                  className={`btn btn-sm ${tab === "active" ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setTab("active")}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  Active
                </button>
                <button
                  className={`btn btn-sm ${tab === "expired" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setTab("expired")}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  Expired
                </button>
              </div>
              <div className="card-header bg-white" style={{ 
                borderBottom: '1px solid #e3e6f0', 
                borderRadius: '12px 12px 0 0',
                padding: '20px 24px'
              }}>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>Events List</h5>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6c757d' }}>
                    Manage and view all your events
                  </p>
                </div>
              </div>
              
              <div className="card-body" style={{ padding: '20px', maxHeight: '720px', overflowY: 'auto' }}>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredRows.map((ev) => {
                    const expired = isExpired(ev);
                    const active = isActive(ev);
                    return (
                      <div
                        key={ev.id}
                        style={{
                          border: editingId === ev.id ? "2px solid #0d6efd" : "1px solid #e3e6f0",
                          borderRadius: 10,
                          padding: 16,
                          opacity: expired ? 0.65 : 1,
                          background: editingId === ev.id ? "#f0f7ff" : "#fff",
                          transition: "all 0.2s ease",
                          cursor: "pointer"
                        }}
                        onClick={() => edit(ev)}
                      >
                        <div className="d-flex gap-3">
                          {ev.image_url ? (
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: 8,
                                overflow: "hidden",
                                flexShrink: 0,
                                border: "1px solid #e3e6f0"
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
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: 8,
                                background: "#f8f9fa",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                border: "1px solid #e3e6f0"
                              }}
                            >
                              <span style={{ fontSize: '32px' }}>📅</span>
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                              <h6 style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#2c3e50' }}>
                                {ev.title}
                              </h6>
                              <div className="d-flex gap-1 flex-wrap" style={{ flexShrink: 0 }}>
                                {active && <span className="badge bg-success" style={{ fontSize: '10px' }}>Active</span>}
                                {expired && <span className="badge bg-secondary" style={{ fontSize: '10px' }}>Expired</span>}
                                {ev.recurrence_rule !== "none" && (
                                  <span className="badge bg-info" style={{ fontSize: '10px' }}>Recurring</span>
                                )}
                                {!ev.is_public && <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>Private</span>}
                              </div>
                            </div>

                            {ev.description && (
                              <p style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '13px', 
                                color: '#6c757d',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {ev.description}
                              </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#495057', marginBottom: '8px' }}>
                              <div style={{ fontWeight: 600 }}>
                                📅 {formatEventSchedule(ev.start_at, ev.end_at)}
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#6c757d' }}>
                                {ev.button_label && (
                                  <span>🏷️ {ev.button_label}</span>
                                )}
                                {ev.payment_url && (
                                  <span style={{ color: '#28a745' }}>💳 Has Payment</span>
                                )}
                              </div>

                              {ev.recurrence_rule !== "none" && (
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  🔁 {ev.recurrence_rule.charAt(0).toUpperCase() + ev.recurrence_rule.slice(1)}
                                  {ev.recurrence_day_of_week !== null && ` - ${getDayName(ev.recurrence_day_of_week)}`}
                                  {ev.recurrence_until && ` until ${new Date(ev.recurrence_until).toLocaleDateString()}`}
                                </div>
                              )}
                            </div>

                            <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e3e6f0' }}>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                {ev.payment_url && (
                                  <a
                                    href={ev.payment_url.startsWith("http") ? ev.payment_url : toAbs(ev.payment_url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}
                                    title={ev.payment_url}
                                  >
                                    View Payment Link
                                  </a>
                                )}
                              </div>

                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-outline-primary btn-sm" 
                                  onClick={(e) => { e.stopPropagation(); edit(ev); }}
                                  style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', fontWeight: 600 }}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-outline-danger btn-sm" 
                                  onClick={(e) => { e.stopPropagation(); del(ev.id); }}
                                  style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', fontWeight: 600 }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
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
      </div>
    </>
  );
}
