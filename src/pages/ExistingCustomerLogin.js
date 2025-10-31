import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useMask } from "@react-input/mask";
import { countryCodes } from "../countryCodes";
import { BACKEND_URL } from '../config';
import { setPhone as setReduxPhone, setCurrentStep, setViewMode, setFlowType } from "../store/slices/waiverSessionSlice";

function ExistingCustomerLogin() {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const [countryCode, setCountryCode] = useState("+1");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef(null);

  // ✅ Phone mask ref
  const phoneRef = useMask({
    mask: "(___) ___-____",
    replacement: { _: /\d/ },
  });

  // Handle country selection
  const handleCountrySelect = (code) => {
    setCountryCode(code);
    setIsDropdownOpen(false);
    setCountrySearch("");
  };

  // Filter countries based on search
  const filteredCountryCodes = countryCodes.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  );

  // Handle click outside and Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setCountrySearch("");
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setCountrySearch("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isDropdownOpen]);

  const handleKeypadClick = (value) => {
    if (value === "Clear") {
      setPhone("");
    } else if (value === "." || phone.replace(/\D/g, "").length >= 10) {
      return;
    } else {
      // Add digit → keep formatting
      const digits = (phone.replace(/\D/g, "") + value).slice(0, 10);
      formatPhone(digits);
    }
  };

  // ✅ Format digits to mask
  const formatPhone = (digits) => {
    let formatted = digits;
    if (digits.length > 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      formatted = `(${digits}`;
    }
    setPhone(formatted);
  };

  // ✅ Auto-trigger OTP when 10 digits entered
  useEffect(() => {
    if (phone.replace(/\D/g, "").length === 10) {
      sendOtp();
    }
    // eslint-disable-next-line
  }, [phone]);

  const sendOtp = async () => {
    if (loading) return;
    
    const cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.length === 0) {
      toast.error("Please enter your phone number to continue.");
      return;
    }
    
    if (cleanPhone.length < 10) {
      toast.error(`Phone number must be exactly 10 digits. You entered ${cleanPhone.length} digit${cleanPhone.length !== 1 ? 's' : ''}.`);
      return;
    }
    
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${cleanPhone}`;   
      const res = await axios.post(`${BACKEND_URL}/api/auth/send-otp`, { cell_phone: fullPhone, phone: cleanPhone });
      toast.success(res.data.message);
      
      dispatch(setReduxPhone(cleanPhone));
      dispatch(setFlowType('existing'));
      dispatch(setViewMode(false));
      dispatch(setCurrentStep('OTP_VERIFICATION'));
      navigate("/otp-verified");
    } catch (err) {
      toast.error(err?.response?.data?.message || "We couldn't send the verification code. Please check your phone number and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="container text-center">
        <div className="row">
          <div className="col-md-2">
            <div className="back-btn" style={{ 'margin-top': '50px'}}>
              <Link to="/">
                <img
                  className="img-fluid"
                  src="/assets/img/image 298.png"
                  alt="back"
                />&nbsp;Back
              </Link>
            </div>
          </div>

          <div className="col-12 col-md-8 col-xl-8">
            <div className="step-two step-three">
              <div className="logo">
                <img
                  className="img-fluid"
                  src="/assets/img/logo.png"
                  alt="logo"
                />
              </div>

              <div className="mb-4">
                <h5>Welcome Back</h5>
              </div>
              <h5 className="bold">Please enter your phone number</h5>
              <p className="bold mb-3">A text message will be sent to you for verification</p>
              {loading && <p className="text-center text-primary">Sending OTP...</p>} 

              <div className="pin-inputs d-flex justify-content-center align-items-center flex-wrap">
                <div className="custom-dropdown" style={{ position: "relative" }} ref={dropdownRef}>
                  <div
                    className="form-select"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                      cursor: "pointer",
                      minWidth: "75px",
                      height: "45px",
                      border: "1px solid #ccc",
                      borderRight: "0",
                      borderRadius: "unset",
                      borderTopLeftRadius: "8px",
                      borderBottomLeftRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8f2e5"                      
                    }}
                  >
                    {countryCode}
                  </div>

                  {isDropdownOpen && (
                    <div
                      className="dropdown-menu show"
                      style={{
                        position: "absolute",
                        maxHeight: "250px",
                        overflowY: "auto",
                        zIndex: 1000,
                        width: "300px",
                        top: "50px"
                      }}
                    >
                      <div style={{ position: 'sticky', top: 0, background: 'white', padding: '8px', borderBottom: '1px solid #ddd' }}>
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="form-control form-control-sm"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      {filteredCountryCodes.length > 0 ? (
                        filteredCountryCodes.map((c, index) => (
                          <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleCountrySelect(c.code)}
                            style={{ cursor: 'pointer' }}
                          >
                            {c.code} - {c.name}
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-item" style={{ color: '#999' }}>
                          No countries found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <input
                  ref={phoneRef}
                  type="text"
                  className="form-control mobile-number pin-box"
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    formatPhone(digits);
                  }}
                  style={{ width: "215px", height: "45px" }}
                />
              </div>



              <div className="keypad d-flex flex-wrap gap-3 justify-content-center mt-4 mx-auto w-75 pb-3">
                {["7", "8", "9", "4", "5", "6", "1", "2", "3", "Clear", "0"].map((num) => (
                  <div key={num} className="numbers" onClick={() => handleKeypadClick(num)}>
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExistingCustomerLogin;
