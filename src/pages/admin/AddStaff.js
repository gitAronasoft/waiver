import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "../../utils/axios";
import { toast } from "react-toastify";
import Header from "./components/header";
import { BACKEND_URL } from '../../config';

function AddStaff() {
    const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", role: "" });
  const [loading, setLoading] = useState(false);
  const staff = useSelector((state) => state.auth.staff);

  // Check if user is superadmin
  React.useEffect(() => {
    if (staff && staff.role !== 'superadmin') {
      toast.error('Access denied. Only superadmin can add staff.');
      navigate('/admin/staff-list');
    }
  }, [navigate, staff]);

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

    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/staff/addstaff`, form);
      toast.success(res.data.message || "Staff added successfully! A setup email has been sent.");
      navigate("/admin/staff-list");
      setForm({ name: "", email: "", role: "" });
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to add staff member. Please check the details and try again.");
    } finally {
      setLoading(false);
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
                <h5 className="h5-heading">Add New Staff</h5>
                <div>
                  <img
                    className="img-fluid my-3"
                    src="/assets/img/Vector.png"
                    alt="profile-img"
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="add-staff-input">
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <small className="text-muted">An account setup email will be sent to this address</small>
                </div>

                {/* Role Select Box */}
                <div className="mb-4">
                  <label className="form-label">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="form-control"
                    disabled={loading}
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                  <small className="text-muted">A secure password setup link will be sent to the staff member's email</small>
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Adding...
                    </>
                  ) : (
                    "Add Staff"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AddStaff;
