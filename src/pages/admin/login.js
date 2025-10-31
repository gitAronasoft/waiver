import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from 'axios';
import { toast } from 'react-toastify';
import { BACKEND_URL } from '../../config';
import { login } from "../../store/slices/authSlice";

function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/staff/login`, {
        email,
        password,
      });

      // Save to Redux (redux-persist will automatically sync to localStorage)
      dispatch(login({
        token: response.data.token,
        staff: response.data.staff
      }));

      console.log('User logged in with role:', response.data.staff.role);

      toast.success("Login successful!");
      navigate("/admin/home");
    } catch (err) {
      if (err.response) {
        toast.error(err.response.data.error || err.response.data.message || "Invalid email or password");
      } else {
        toast.error("Unable to connect. Please check your internet connection and try again.");
      }
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

              <form className="login-form" onSubmit={handleLogin}>
                <div className="text-center mb-4">
                  <h2 className="h5-heading">Welcome Back</h2>
                  <p className="subtitle">Please login to your account</p>
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="actions mb-3">
                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                    />{" "}
                    Remember me
                  </label>
                </div>

                <button type="submit" className="login-btn btn btn-primary w-100" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>

             <p className="signup-text text-center mt-3">
  Don’t have an account? <Link to="/admin/forgot-password">Forgot password?</Link>
</p>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;