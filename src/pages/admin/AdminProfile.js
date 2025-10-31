import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Header from "./components/header";
import { BACKEND_URL } from '../../config';
import { updateStaff } from "../../store/slices/authSlice";

function AdminProfile() {
  const dispatch = useDispatch();
  const staff = useSelector((state) => state.auth.staff) || {};
  const token = useSelector((state) => state.auth.token);

  // Initialize admin state directly (no useEffect needed)
  const [admin, setAdmin] = useState({
    name: staff.name || "",
    email: staff.email || "",
    profileImage: staff.profile_image || "",
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
  };

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setAdmin({ ...admin, profileImage: file });
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!admin.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!admin.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (!validateEmail(admin.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("id", staff.id);
      formData.append("name", admin.name);
      formData.append("email", admin.email);

      if (admin.profileImage instanceof File) {
        formData.append("profileImage", admin.profileImage);
      }

      const response = await fetch(
        `${BACKEND_URL}/api/staff/update-profile`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully!");

        const updatedStaff = {
          ...staff,
          name: data.staff.name,
          email: data.staff.email,
          profile_image: data.staff.profile_image
        };
        dispatch(updateStaff(updatedStaff));

        setAdmin({
          name: data.staff.name,
          email: data.staff.email,
          profileImage: data.staff.profile_image
        });

        setPreview(null);
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile");
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
              <div className="text-center">
                <h5 className="h5-heading">Admin Profile</h5>
                <div className="my-3">
                  <img
                    src={
                      preview ||
                      (admin.profileImage && !(admin.profileImage instanceof File)
                        ? `${BACKEND_URL}/${admin.profileImage}`
                        : "../assets/img/Vector.png")
                    }
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: "120px", height: "120px", objectFit: "cover" }}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={admin.name}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter name"
                    disabled={loading}
                  />
                </div>

                {/* Email Field */}
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={admin.email}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter email"
                    disabled={loading}
                  />
                </div>

                {/* Profile Image */}
                <div className="mb-4">
                  <label className="form-label">Profile Image</label>
                  <input
                    type="file"
                    name="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="form-control"
                    disabled={loading}
                  />
                </div>

                {/* Submit */}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Updating...
                    </>
                  ) : (
                    "Update Profile"
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

export default AdminProfile;