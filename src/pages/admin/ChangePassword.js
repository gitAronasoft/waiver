import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/axios";
import { toast } from "react-toastify";
import Header from "./components/header";
import { BACKEND_URL } from '../../config';

function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    const staffData = localStorage.getItem("staff");
    if (!staffData) {
      toast.error("Please login to continue");
      navigate("/admin/login");
      return;
    }
    try {
      setStaff(JSON.parse(staffData));
    } catch (error) {
      console.error("Error parsing staff data:", error);
      toast.error("Session error. Please login again.");
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!staff) {
      toast.error("Session expired. Please login again.");
      navigate("/admin/login");
      return;
    }

    if (!form.currentPassword.trim()) {
      toast.error("Current password is required");
      return;
    }

    if (!form.newPassword.trim()) {
      toast.error("New password is required");
      return;
    }

    if (!form.confirmPassword.trim()) {
      toast.error("Confirm password is required");
      return;
    }

    const passwordError = validatePassword(form.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/staff/change-password`,
        {
          id: staff.id,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }
      );

      toast.success(response.data.message || "Password changed successfully! Please login with your new password.");

      // Clear form
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      // Clear session and redirect to login after password change
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("staff");
        navigate("/admin/login");
      }, 2000);
    } catch (err) {
      // Show error message without redirecting
      const errorMessage = err.response?.data?.error || "Failed to change password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!staff) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="text-center mt-5">
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="row">
          <div className="col-12 col-xl-7 col-md-10 mx-auto my-5">
            <div className="client-profile">
              <div>
                <h5 className="h5-heading mb-5">Change Password</h5>
                {/* <div>
                  <img
                    className="img-fluid my-3"
                    src="/assets/img/Vector.png"
                    alt="change-password"
                  />
                </div> */}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Current Password */}
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    className="form-control"
                    value={form.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    disabled={loading}
                  />
                </div>

                {/* New Password */}
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    className="form-control"
                    value={form.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                </div>

                {/* Confirm New Password */}
                <div className="mb-4">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter new password"
                    disabled={loading}
                  />
                </div>

                {/* Submit Button with Spinner */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Updating...
                    </>
                  ) : (
                    "Update Password"
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

export default ChangePassword;
