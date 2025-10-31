import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setFlowType, clearWaiverSession } from "../store/slices/waiverSessionSlice";
import LazyImage from "../components/LazyImage";

export default function Index() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleStart = (type) => {
    dispatch(clearWaiverSession());
    
    if (type === "existing") {
      dispatch(setFlowType("existing"));
      navigate("/login");
    } else {
      dispatch(setFlowType("new"));
      navigate("/register");
    }
  };

  return (
    <div className="container-fluid">
      <div className="container text-center w-75 mx-auto">
        <div className="row">
          <div className="col-md-10 mx-auto">
            <div className="logo-img">
              <LazyImage
                className="img-fluid"
                src="/assets/img/logo.png"
                alt="logo"
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12 col-md-8 mx-auto">
            <div>
              <h2 className="h5-heading">
                Hi, Welcome! {" "}
                <LazyImage
                  className="img-fluid"
                  src="/assets/img/image 296.png"
                  alt="icon"
                />
              </h2>
            </div>

            <div className="d-flex justify-content-center align-items-center gap-4 flex-column mt-4">
              <button
                className="btn existing-customer"
                onClick={() => handleStart("existing")}
              >
                Existing Customer
              </button>
              <button
                className="btn new-waiver"
                onClick={() => handleStart("new")}
              >
                New Waiver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
