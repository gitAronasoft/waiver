import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "../../utils/axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from '../../config';
import { login } from "../../store/slices/authSlice";

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get("token");

    if (resetToken) {
      setToken(resetToken);
    } else {
      toast.error("Invalid reset link.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (form.password.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/staff/update-password`, {
        token,
        newPassword: form.password,
      });

      toast.success(response.data.message || "Password updated successfully!");

      // Dispatch to Redux instead of localStorage
      dispatch(login({
        token: response.data.token,
        staff: response.data.staff
      }));

      navigate("/admin/home");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Unable to reset your password. Please try again or request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
        <div className="container-fluid">
      <div className="container">
        <div className="row">
          <div className="col-12 col-md-6 col-xl-4 mx-auto">
            <div className="login-container">
              <div className="logo text-center mb-4">
                <img
                  className="img-fluid"
                  src="/assets/img/logo.png"
                  alt="logo"
                />
              </div>
      <form className="mt-4" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>New Password</label>
          <input
            type="password"
            className="form-control"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <label>Confirm Password</label>
          <input
            type="password"
            className="form-control"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordForm;
