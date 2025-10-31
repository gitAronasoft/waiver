import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../utils/axios';
import Header from './components/header';
import { toast } from 'react-toastify';
import { BACKEND_URL } from '../../config';

function HomePage() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null); // { customer, waiverId }
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const staff = useSelector((state) => state.auth.staff) || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/waivers/getAllCustomers`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Unable to load waivers. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyWaiver = async (waiverId, verified_by_staff) => {
    setVerifying(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/waivers/verify/${waiverId}`, {
        staff_id: staff.id,
        verified_by_staff
      });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      console.error('Error verifying waiver:', err);
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCustomers = customers.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const phone = c.phone_number?.toLowerCase() || '';
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <>
      <Header />
      <div className="container">
        <div className="row my-4">
          <div className="col-10 col-md-6 col-xl-4 mx-auto text-center">
            <h5 className="h5-heading my-3">{filteredCustomers.length} Waiver{filteredCustomers.length !== 1 ? 's' : ''} Completed</h5>
            <div className='search-waiver'> 
            <input
              className="form-control"
              placeholder="Search Name or Phone Number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12 col-xl-12">
            {loading ? (
              <p className="text-center">Loading waivers...</p>
            ) : (
              <div className="card-grid mb-5">
                {filteredCustomers.map((c) => (
                  <PersonCard
                    key={c.id}
                    customer={c}
                    onDetails={(waiverId) => setSelected({ customer: c, waiverId })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <DetailsModal
            customer={selected.customer}
            waiverId={selected.waiverId}
            onClose={() => setSelected(null)}
            onVerify={(waiverId, verified_by_staff) => {
              verifyWaiver(waiverId, verified_by_staff);
              setSelected(null);
            }}
            verifying={verifying}
          />
        )}
      </div>
    </>
  );
}

function PersonCard({ customer, onDetails }) {
  return (
    <div className="person-card">
      <div className="card-header d-flex justify-content-between">
        <div className="card-name">
          <h5>{customer.first_name} {customer.last_name}</h5>
          {customer.minors.map((m, i) => (
            <p key={i}>{m.first_name} {m.last_name}</p>
          ))}
        </div>
        <img src="/assets/img/Closed.png" alt="icon" />
      </div>
      <div className="card-footer">
        <span>Verify their ID - No enter if NO ID</span>
        <button className="details-btn btn btn-primary" onClick={() => onDetails(customer.waiver_id)}>
          Details
        </button>
      </div>
    </div>
  );
}

function DetailsModal({ customer, waiverId, onClose, onVerify, verifying }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState(null); // 'verify' or 'notAccurate'

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (
      e.target.classList.contains("modal-backdrop") ||
      e.target.classList.contains("modal")
    ) {
      onClose();
    }
  };

  const handleConfirmAction = () => {
    if (actionType === "verify") {
      onVerify(waiverId, 1); // Verified
    } else if (actionType === "notAccurate") {
      onVerify(waiverId, 2); // Not accurate
    }
    setShowConfirm(false);
    onClose();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      {/* Main Modal Backdrop */}
      <div className="modal-backdrop fade show" onClick={handleBackdropClick}></div>

      {/* Main Modal */}
      <div
        className="modal show fade d-block"
        tabIndex="-1"
        role="dialog"
        onClick={handleBackdropClick}
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content p-3 position-relative">
            <div className="modal-body text-center">
              <h5>
                {customer.first_name} {customer.last_name} |{" "}
                {customer.dob ? new Date(customer.dob).toISOString().slice(0, 10) : ""}
              </h5>

              <p className="mt-2">
                <strong>Address:</strong>{" "}
                {customer.address
                  ? `${customer.address}, ${customer.city || ""}, ${customer.province || ""} ${customer.postal_code || ""}`
                  : "Not Provided"}
              </p>

              {customer.minors && customer.minors.length > 0 && (
                <>
                  <h6 className="mt-3">Minors:</h6>
                  {customer.minors.map((m, i) => (
                    <p key={i}>
                      {m.first_name} {m.last_name} |{" "}
                      {m.dob ? new Date(m.dob).toISOString().slice(0, 10) : ""}
                    </p>
                  ))}
                </>
              )}
            </div>

            <div className="modal-footer justify-content-center gap-3">
              <button
                onClick={() => {
                  setActionType("verify");
                  setShowConfirm(true);
                }}
                className="btn details-btn"
              >
                I VERIFIED THEIR ID
              </button>
              <button
                onClick={() => {
                  setActionType("notAccurate");
                  setShowConfirm(true);
                }}
                className="btn btn-danger"
              >
                ⚠ Information is NOT accurate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal show fade d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content p-3 text-center">
                <div className="modal-body">
                  <p>
                    {actionType === "verify"
                      ? "Are you sure you want to verify this ID?"
                      : "Are you sure this information is NOT accurate?"}
                  </p>
                  <div className="d-flex justify-content-center gap-3 mt-3">
                    <button className="btn btn-success" onClick={handleConfirmAction}>
                      Yes
                    </button>
                    <button className="btn btn-secondary" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default HomePage;
