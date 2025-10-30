import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { BACKEND_URL } from "../config";
import UserHeader from "../components/UserHeader";
import { setCurrentStep } from "../store/slices/waiverSessionSlice";

function RuleReminder() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.waiverSession.customerId);
  const phone = useSelector((state) => state.waiverSession.phone);
  const waiverId = useSelector((state) => state.waiverSession.waiverId);
  const [loading, setLoading] = useState(false);

  // Route protection: Redirect if accessed directly without valid state
  React.useEffect(() => {
    if (!userId || !phone) {
      console.warn("No userId or phone found in Redux, redirecting to home");
      navigate("/", { replace: true });
    }
  }, [userId, phone, navigate]);

  // Prevent browser back button navigation
  React.useEffect(() => {
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

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/waivers/accept-rules`, { userId, waiverId });
      dispatch(setCurrentStep('COMPLETED'));
      toast.success("Thank you for reviewing our facility rules!");
      navigate("/all-done", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("We couldn't save your confirmation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UserHeader />
      <div className="container-fluid">
        <div className="container text-center">
          <div className="row">
            <div className="col-12">
              <h5 className="h5-headingcccc">Rule Reminder</h5>
            </div>
          </div>

        {/* Main Content Section */}
        <div className="row mt-4">
          <div className="col-12 col-md-12 mx-auto">
            {/* Rule Images Section */}
            <div className="d-flex justify-content-between align-items-center rule-images my-3 flex-wrap gap-3">
              <div className="d-flex flex-column align-items-center">
                <img src="/assets/img/image1.png" alt="On the Rink" />
                <h5>ON THE RINK</h5>
              </div>
              <div className="d-flex flex-column align-items-center">
                <img src="/assets/img/image3.png" alt="No speedskating" />
                <h5>
                  NO speedskating <br /> or rollerblade
                </h5>
              </div>
              <div className="d-flex flex-column align-items-center">
                <img src="/assets/img/image2.png" alt="Helmet" />
                <h5>
                  Children under 13 <br /> must wear a helmet
                </h5>
              </div>
            </div>

            {/* Rules List Section */}
            <div className="list-style mt-4 mt-md-5 px-3 px-md-4">
              <ul
                className="d-flex flex-column"
                style={{
                  listStyle: "disc",
                  textAlign: "left",
                  maxWidth: "600px",
                  margin: "0 auto",
                  padding: "0 20px",
                  fontSize: "1rem",
                  lineHeight: "1.8",
                }}
              >
                <li style={{ marginBottom: "2px" }}>
                  Everyone entering the facility must pay
                </li>
                <li style={{ marginBottom: "2px" }}>
                  No outside food or drinks
                </li>
                <li style={{ marginBottom: "2px" }}>
                  Be considerate of others' speed and learning
                </li>
                <li style={{ marginBottom: "2px" }}>
                  Seek assistance from our staff if needed
                </li>
                <li>
                  Respect the direction of rotation on the rink: no crossing
                </li>
              </ul>
            </div>

            {/* Have Fun Section */}
            <div className="mt-4 mt-md-5 mb-4">
              <h5
                className="h5-heading"
                style={{ fontSize: "1.5rem", fontWeight: "700", color: "#333" }}
              >
                Have Fun!
              </h5>
            </div>

            {/* Confirm Button */}
            <div className="mb-4 pb-3">
              <button
                className="confirm-btn"
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  padding: "14px 32px",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "none",
                  marginTop: "10px",
                }}
              >
                {loading ? "Confirming..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default RuleReminder;
