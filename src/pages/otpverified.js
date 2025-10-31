import React, { useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from 'react-toastify';
import { BACKEND_URL } from '../config';
import { setCurrentStep, setCustomerId } from "../store/slices/waiverSessionSlice";

function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const phone = useSelector((state) => state.waiverSession.phone);
  const flowType = useSelector((state) => state.waiverSession.flowType);
  const otpVerifiedRef = useRef(false);

  // console.log("OTP Verified:", customerType);

  const handleKeypadClick = (value) => {
    if (value === "Clear") {
      setOtp("");
    } else if (value === "." || otp.length >= 4) {
      return;
    } else {
      setOtp((prev) => {
        const newOtp = prev + value;
        if (newOtp.length === 4) {
          verifyOtp(newOtp);
        }
        return newOtp;
      });
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setOtp(value);
    if (value.length === 4) {
      verifyOtp(value);
    }
  };

const verifyOtp = async (otpValue) => {
  if (otpVerifiedRef.current) return;
  
  if (!otpValue || otpValue.trim() === "") {
    toast.error("Please enter the 4-digit code sent to your phone.");
    return;
  }
  
  if (otpValue.length < 4) {
    toast.error(`The code must be 4 digits. You entered ${otpValue.length} digit${otpValue.length !== 1 ? 's' : ''}.`);
    return;
  }
  
  otpVerifiedRef.current = true;
  setLoading(true);

  try {
    const res = await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, {
      phone,
      otp: otpValue,
    });

    if (res.data.authenticated) {
      toast.success("Phone number verified successfully!");
      
      // Set customerId in Redux for existing customers to fix Rules page redirect
      if (res.data.userId) {
        dispatch(setCustomerId(res.data.userId));
        console.log("Set customerId in Redux:", res.data.userId);
      }

      if (flowType === "existing") {
        dispatch(setCurrentStep('DASHBOARD'));
        navigate("/my-waivers", { replace: true });
      } else if (flowType === "new") {
        dispatch(setCurrentStep('SIGNATURE'));
        navigate("/signature", { replace: true });
      }
    } else {
      toast.error("The code you entered is incorrect. Please try again.");
      otpVerifiedRef.current = false;
      setLoading(false);
      setOtp("");
    }
  } catch (err) {
    toast.error(err?.response?.data?.message || "We couldn't verify your code. Please try again or request a new code.");
    otpVerifiedRef.current = false;
    setLoading(false);
    setOtp("");
  }
};


  return (
    <div className="container-fluid">
      <div className="container text-center">
        <div className="row">
          <div className="col-md-2">
            <div className="back-btn">
              <Link to="/existing-customer">
                <img
                  className="img-fluid"
                  src="/assets/img/image 298.png"
                  alt="back"
                />
                &nbsp;Back
              </Link>
            </div>
          </div>

          <div className="col-12 col-md-8 col-xl-8">
            <div className="step-two step-three">
              <div className="logo mb-3">
                <img
                  className="img-fluid"
                  src="/assets/img/logo.png"
                  alt="logo"
                />
              </div>

              <h5 className="my-4">
                Please enter the 4 digit PIN sent to your phone number
              </h5>
              {loading && <p className="text-center text-primary">Verifying OTP...</p>}

              <div className="pin-inputs d-flex justify-content-center gap-3">
                <input
                  type="text"
                  maxLength="4"
                  className="pin-box otp-number"
                  value={otp}
                  onChange={handleChange}
                />
              </div>

              <div className="keypad d-flex flex-wrap gap-3 justify-content-center mt-4 mx-auto w-75">
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

export default VerifyOtp;
