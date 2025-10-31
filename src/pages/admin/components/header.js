import React, { useRef } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { BACKEND_URL } from '../../../config';
import { logout } from "../../../store/slices/authSlice";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentPath = location.pathname;

  const staff = useSelector((state) => state.auth.staff);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/admin/login");
  };


  return (
    <div className="container-fluid container-header ">
     <div className="container">



  <header className="header">
    <nav className="navbar navbar-expand-lg py-2">
      <div className="container-fluid">

        {/* Logo */}
        <Link className="navbar-brand" to="/admin/home">
          <img
            src="/assets/img/logo.png"
            className="img-fluid"
            alt="logo"
            style={{ height: "50px" }}
          />
        </Link>

        {/* Hamburger Button */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavDropdown"
          aria-controls="navbarNavDropdown"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span><i className="fa-solid fa-bars"></i></span>
        </button>


        <div className="d-flex d-lg-none align-items-center flex-wrap flex-lg-nowrap header-mobile-view ">

            {/* Notification Bell */}
            {/* <img
              src="/assets/img/bell-icon.png"
              alt="bell"
              className="me-3"
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            /> */}

            {/* Profile Dropdown */}
            <div className="dropdown" ref={dropdownRef}>
              <img
                src={
                  staff?.profile_image
                    ? `${BACKEND_URL}/${staff.profile_image}`
                    : "/assets/img/Vector.png"
                }
                alt="profile"
                className="dropdown-toggle"
                data-bs-toggle="dropdown"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  objectFit: "cover",
                  cursor: "pointer"
                }}
              />

              <ul className="dropdown-menu dropdown-menu-end" style={{ padding: "10px 0", minWidth: "200px" }}>
                <li className="text-center px-3" style={{ paddingBottom: "10px", borderBottom: "1px solid #e0e0e0", marginBottom: "10px" }}>
                    <img
                      src={
                        staff?.profile_image?.startsWith("http")
                          ? staff.profile_image
                          : staff?.profile_image
                          ? `${BACKEND_URL}/${staff.profile_image}`
                          : "/assets/img/Vector.png"
                      }
                    alt="profile"
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      marginBottom: "8px",
                      objectFit: "cover",
                    }}
                  />
                  <h6 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>{staff?.name || "Admin User"}</h6>
                </li>
                <li style={{ margin: "5px 0" }}><Link className="dropdown-item" to="/admin/change-password" style={{ padding: "8px 16px" }}>Change Password</Link></li>
                <li style={{ margin: "5px 0" }}><Link className="dropdown-item" to="/admin/update-profile" style={{ padding: "8px 16px" }}>Update Profile</Link></li>
                <li style={{ margin: "5px 0" }}><span className="dropdown-item" style={{ cursor: "pointer", padding: "8px 16px" }} onClick={handleLogout}>Sign Out</span></li>
              </ul>
            </div>
          </div>



        {/* Nav Items */}
        <div className="collapse navbar-collapse" id="navbarNavDropdown">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-4">
            <NavItem
              to="/admin/home"
              icon="/assets/img/Icon.png"
              label="Home"
              isActive={currentPath === "/admin/home"}
            />
            <NavItem
              to="/admin/staff-list"
              icon="/assets/img/team.png"
              label="Team"
              isActive={currentPath === "/admin/staff-list"}
            />
            <NavItem
              to="/admin/history"
              icon="/assets/img/refresh.png"
              label="History"
              isActive={currentPath === "/admin/history"}
            />
            <NavItem
              to="/admin/feedback-list"
              icon="/assets/img/review.png"
              label="Feedback"
              isActive={currentPath === "/admin/feedback-list"}
            />
          </ul>

          {/* Right Side Icons */} 
          {/* <div className="d-flex align-items-center flex-wrap flex-lg-nowrap"> */}
            <div className="d-none d-lg-flex align-items-center flex-wrap flex-lg-nowrap">

            {/* Notification Bell */}
            {/* <img
              src="/assets/img/bell-icon.png"
              alt="bell"
              className="me-3"
              style={{ width: "24px", height: "24px", cursor: "pointer" }}
            /> */}

            {/* Profile Dropdown */}
            <div className="dropdown" ref={dropdownRef}>
              <img
                src={
                  staff?.profile_image
                    ? `${BACKEND_URL}/${staff.profile_image}`
                    : "/assets/img/Vector.png"
                }
                alt="profile"
                className="dropdown-toggle"
                data-bs-toggle="dropdown"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  objectFit: "cover",
                  cursor: "pointer"
                }}
              />

              <ul className="dropdown-menu dropdown-menu-end" style={{ padding: "10px 0", minWidth: "200px" }}>
                <li className="text-center px-3" style={{ paddingBottom: "10px", borderBottom: "1px solid #e0e0e0", marginBottom: "10px" }}>
                  <img
                    src={
                      staff?.profile_image?.startsWith("http")
                        ? staff.profile_image
                        : staff?.profile_image
                        ? `${BACKEND_URL}/${staff.profile_image}`
                        : "/assets/img/Vector.png"
                    }
                    alt="profile"
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      marginBottom: "8px",
                      objectFit: "cover",
                    }}
                  />
                  <h6 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>{staff?.name || "Admin User"}</h6>
                </li>
                <li style={{ margin: "5px 0" }}><Link className="dropdown-item" to="/admin/change-password" style={{ padding: "8px 16px" }}>Change Password</Link></li>
                <li style={{ margin: "5px 0" }}><Link className="dropdown-item" to="/admin/update-profile" style={{ padding: "8px 16px" }}>Update Profile</Link></li>
                <li style={{ margin: "5px 0" }}><span className="dropdown-item" style={{ cursor: "pointer", padding: "8px 16px" }} onClick={handleLogout}>Sign Out</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </header>
</div>

    </div>
  );
}

function NavItem({ to, icon, label, isActive }) {
  return (
    <div>
      <Link to={to} className={`nav-link${isActive ? " active" : ""}`}>
        <div className="d-flex gap-1 flex-column text-white align-items-center">
          <div>
            <img src={icon} alt={label} />
          </div>
          <div>{label}</div>
        </div>
      </Link>
    </div>
  );
}

export default Header;