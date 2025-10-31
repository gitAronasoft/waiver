import React, { useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from 'react-toastify';
import { BACKEND_URL } from '../config';
import { setCurrentStep, setCustomerId, setWaiverId, setViewMode, setCustomerData, setMinors, setSignature } from "../store/slices/waiverSessionSlice";
import LazyImage from "../components/LazyImage";

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
      
      // Set customerId in Redux
      if (res.data.userId) {
        dispatch(setCustomerId(res.data.userId));
        console.log("Set customerId in Redux:", res.data.userId);
      }

      if (flowType === "existing") {
        // Fetch latest waiver with complete customer data and minors from waiver snapshot
        try {
          const latestWaiverRes = await axios.get(`${BACKEND_URL}/api/waivers/latest-waiver?phone=${phone}`);
          
          if (latestWaiverRes.data.waiverId) {
            dispatch(setWaiverId(latestWaiverRes.data.waiverId));
            dispatch(setViewMode(true));
            console.log("✅ Loaded latest waiver:", latestWaiverRes.data.waiverId);
            
            // Store complete customer data from waiver signer snapshot
            if (latestWaiverRes.data.customer) {
              dispatch(setCustomerData(latestWaiverRes.data.customer));
              console.log("✅ Stored customer data from waiver snapshot in Redux");
            }
            
            // Store minors from waiver minors_snapshot
            if (latestWaiverRes.data.minors) {
              dispatch(setMinors(latestWaiverRes.data.minors));
              console.log("✅ Stored minors from waiver snapshot in Redux");
            }
            
            // Store signature from latest waiver
            if (latestWaiverRes.data.signature) {
              dispatch(setSignature(latestWaiverRes.data.signature));
              console.log("✅ Stored signature from latest waiver in Redux");
            }
          }
        } catch (error) {
          console.error("Error fetching latest waiver:", error);
          toast.error("Unable to load your waiver information. Please try again.");
          setLoading(false);
          return;
        }
        dispatch(setCurrentStep('CONFIRM_INFO'));
        navigate("/review-information", { replace: true });
      } else if (flowType === "new") {
        // New customers already have data in Redux from NewCustomerForm
        // No need to fetch - just navigate to signature page
        dispatch(setCurrentStep('SIGNATURE'));
        navigate("/sign-waiver", { replace: true });
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
              <Link to="/login">
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
                <LazyImage
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
