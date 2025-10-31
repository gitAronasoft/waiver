import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import Confetti from "react-confetti";
import UserHeader from "../components/UserHeader";
import { clearWaiverSession } from "../store/slices/waiverSessionSlice";


function AllDone() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [countdown, setCountdown] = useState(5);
  const currentStep = useSelector((state) => state.waiverSession.progress.currentStep);

  const handleReturn = () => {
    dispatch(clearWaiverSession());
    navigate("/", { replace: true });
  };

  useEffect(() => {
    // Route protection: Only accessible if coming from completed flow
    if (currentStep !== 'COMPLETED') {
      console.warn("Direct access to AllDone page blocked, redirecting to home");
      navigate("/", { replace: true });
      return;
    }
    
    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          
          dispatch(clearWaiverSession());
          navigate("/", { replace: true });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, currentStep, dispatch]);

  // Prevent browser back button navigation
  useEffect(() => {
    // Push current state to prevent back navigation
    window.history.pushState(null, "", window.location.href);
    
    const handlePopState = () => {
      // Push state again to prevent going back
      window.history.pushState(null, "", window.location.href);
    };
    
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);


  return (
    <>
      <UserHeader />
      <div className="container-fluid text-center" style={{ position: "relative" }}>
        {/* 🎉 Confetti Animation */}
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={300}
          gravity={0.2}
        />

        <div className="container">
          <div className="row">
            <div className="col-12 col-md-12 col-xl-8 mx-auto">

            <h3 className="my-4 h5-heading h3-heading" style={{ fontSize: "2rem", fontWeight: "bold" }}>
              🎉 YAY!!! ALL DONE 🎉 <br />
              ENJOY YOUR TIME!!!
            </h3>

            <p style={{ fontSize: "1.2rem", marginTop: "10px" }}>
              Redirecting to the main screen in <strong>{countdown}</strong> seconds...
            </p>

            <div className="mx-auto text-center">
              <button
                className="return-btn btn btn-primary mt-3 text-center"
                onClick={handleReturn}
              >
                Return to the MAIN screen now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default AllDone;
