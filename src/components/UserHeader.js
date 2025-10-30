import React from "react";
import { Link, useNavigate } from "react-router-dom";

function UserHeader({ 
  showBack = false, 
  onBack = null, 
  backTo = null, 
  backState = null,
  showLogout = false,
  onLogout = null
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo, backState ? { state: backState } : {});
    } else {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="container-fluid" style={{ backgroundColor: '#fff', paddingBottom: '15px' }}>
      <div className="container">
        <div className="row align-items-center">
          {/* Left side - Back Button */}
          <div className="col-6 col-md-2">
            {showBack && (
              <div className="back-btn" style={{ marginTop: "0px"}}>
                <div
                  style={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px'}}
                  onClick={handleBack}
                >
                  <img
                    src="/assets/img/image 298.png"
                    alt="back"
                    className="img-fluid"
                    style={{ maxWidth: '20px' }}
                  />
                  <span className="d-none d-md-inline">Back</span>
                </div>
              </div>
            )}
          </div>

          {/* Center - Logo */}
          <div className="col-12 col-md-8 col-xl-8 order-first order-md-0 mb-2 mb-md-0">
            <div className="step-two step-three">
              <div className="logo">
                <Link to="/">
                  <img
                    src="/assets/img/logo.png"
                    className="img-fluid"
                    alt="logo"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* Right side - Logout Button */}
          <div className="col-6 col-md-2 text-end">
            {showLogout && (
              <button
                onClick={handleLogout}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#FF6B6B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="d-none d-md-inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserHeader;
