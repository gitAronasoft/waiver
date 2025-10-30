import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/axios";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./components/header";
import { BACKEND_URL } from '../../config';

function UpdateStaff() {
  const { id } = useParams(); // Staff ID from URL
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Check if user is superadmin
  React.useEffect(() => {
    const staffData = localStorage.getItem('staff');
    if (staffData) {
      const user = JSON.parse(staffData);
      if (user.role !== 'superadmin') {
        toast.error('Access denied. Only superadmin can edit staff.');
        navigate('/admin/staff-list');
      }
    }
  }, [navigate]);

  // Fetch Staff Details
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/staff/${id}`);
      setForm(res.data); // Pre-fill form
    } catch (error) {
      toast.error("Failed to fetch staff details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      return toast.error("Name is required");
    }
    
    if (!form.email.trim()) {
      return toast.error("Email is required");
    }
    
    if (!validateEmail(form.email)) {
      return toast.error("Please enter a valid email address");
    }
    
    if (!form.role) {
      return toast.error("Please select a role");
    }

    setSubmitting(true);
    try {
      const res = await axios.put(`${BACKEND_URL}/api/staff/update-staff/${id}`, form);
      toast.success(res.data.message || "Staff updated successfully");
      navigate("/admin/staff-list");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update staff");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="row">
          <div className="col-12 col-xl-7 col-md-10 mx-auto my-5">
            <div className="client-profile">
              <div>
                <h5 className="h5-heading">Update Staff</h5>
                <div>
                  <img
                    className="img-fluid my-3"
                    src="/assets/img/Vector.png"
                    alt="profile-img"
                  />
                </div>
              </div>

              {loading ? (
                <p className="text-center">Loading staff details...</p>
              ) : (
              <form onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter staff name"
                  />
                </div>

                {/* Email Field */}
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter staff email"
                  />
                </div>

                {/* Role Select Box */}
                <div className="mb-4">
                  <label className="form-label">Role</label>
                  <select
                    name="role"
                    value={form.role || ""}
                    onChange={handleChange}
                    className="form-control"
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Staff"}
                </button>
              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UpdateStaff;
