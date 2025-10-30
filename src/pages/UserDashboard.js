import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { BACKEND_URL } from '../config';
import UserHeader from '../components/UserHeader';
import { clearWaiverSession, setWaiverId, setViewMode } from "../store/slices/waiverSessionSlice";

function UserDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const phone = useSelector((state) => state.waiverSession.phone);
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    if (!phone) {
      console.warn("No phone found in Redux, redirecting to home");
      navigate("/", { replace: true });
      return;
    }

    fetchCustomerDashboard();
    // eslint-disable-next-line
  }, [phone]);

  const fetchCustomerDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BACKEND_URL}/api/waivers/customer-dashboard?phone=${phone}`
      );
      setWaivers(response.data.waivers || []);
      setIsVerified(response.data.isVerified || false);
    } catch (error) {
      console.error("Error fetching customer dashboard:", error);
      toast.error("We couldn't load your visit history. Please refresh the page or try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phoneNum) => {
    if (!phoneNum) return "";
    const cleaned = phoneNum.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNum;
  };

  const handleLogout = () => {
    dispatch(clearWaiverSession());
    localStorage.removeItem("userFlow");
    localStorage.removeItem("signatureForm");
    localStorage.removeItem("customerForm");
    navigate("/", { replace: true });
  };

  return (
    <>
      <style>{`
        .user-dashboard-container {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 40px 20px;
        }
        
        .dashboard-header-section {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .dashboard-header-section h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        
        .dashboard-header-section .phone-number {
          font-size: 0.95rem;
          color: #666;
          margin-bottom: 4px;
        }
        
        .dashboard-header-section .visits-count {
          font-size: 0.9rem;
          color: #6366f1;
          font-weight: 500;
        }
        
        .professional-table-wrapper {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .professional-table {
          width: 100%;
          margin: 0;
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .professional-table thead {
          background: #f8f9fa;
        }
        
        .professional-table thead th {
          padding: 16px 20px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a1a1a;
          text-align: left;
          border-bottom: 2px solid #6366f1;
          white-space: nowrap;
        }
        
        .professional-table tbody tr {
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s;
          cursor: pointer;
        }
        
        .professional-table tbody tr:hover {
          background-color: #f9fafb;
        }
        
        .professional-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .professional-table tbody td {
          padding: 18px 20px;
          font-size: 0.9rem;
          color: #4b5563;
          vertical-align: middle;
        }
        
        .waiver-id-cell {
          color: #6366f1;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .name-cell {
          font-weight: 500;
          color: #1a1a1a;
        }
        
        .email-cell {
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .date-cell {
          color: #4b5563;
          font-size: 0.875rem;
        }
        
        .minors-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-block;
        }
        
        .badge-pending {
          background-color: #FFD93D;
          color: #000;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          display: inline-block;
        }
        
        .badge-verified {
          background-color: #10b981;
          color: #fff;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          display: inline-block;
        }
        
        .badge-inaccurate {
          background-color: #ef4444;
          color: #fff;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          display: inline-block;
        }
        
        @media (max-width: 768px) {
          .professional-table thead th,
          .professional-table tbody td {
            padding: 12px 10px;
            font-size: 0.8rem;
          }
          
          .dashboard-header-section h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
      <UserHeader showLogout={true} onLogout={handleLogout} />
      <div className="user-dashboard-container">
        <div className="container" style={{ maxWidth: '1200px' }}>
          
          {/* Header Section */}
          <div className="dashboard-header-section">
            <h1>My Visit History</h1>
            <p className="phone-number">Phone: {formatPhone(phone)}</p>
            {waivers.length > 0 && (
              <p className="visits-count">{waivers.length} visit{waivers.length !== 1 ? 's' : ''} found</p>
            )}
          </div>

          {/* Content Section */}
          {loading ? (
            <div className="professional-table-wrapper">
              <Skeleton height={400} />
            </div>
          ) : waivers.length === 0 ? (
            <div className="text-center mt-5 py-5">
              <div 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  margin: '0 auto 20px',
                  background: '#e9ecef',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-file-signature" style={{ fontSize: '40px', color: '#6c757d' }}></i>
              </div>
              <h4 className="mb-3" style={{ fontWeight: '600', color: '#495057' }}>No Visits Yet</h4>
              <p className="text-muted mb-4">
                Start your skating journey today! Sign your first waiver to get started.
              </p>
              <Link 
                to="/new-customer" 
                className="btn btn-primary"
                style={{
                  padding: '12px 30px',
                  borderRadius: '8px',
                  fontWeight: '600'
                }}
              >
                <i className="fas fa-plus me-2"></i>
                Sign Your First Waiver
              </Link>
            </div>
          ) : (
            <div className="professional-table-wrapper">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Waiver ID</th>
                    <th>Name</th>
                    <th>Signed Date & Time</th>
                    <th>Minors</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {waivers.map((waiver) => {
                    const isPending = !waiver.signed_at;
                    return (
                    <tr 
                      key={waiver.waiver_id}
                      onClick={() => {
                        dispatch(setWaiverId(waiver.waiver_id));
                        dispatch(setViewMode(isPending ? false : true));
                        navigate("/confirm-info", { 
                          state: { 
                            phone, 
                            waiverId: waiver.waiver_id,
                            isReturning: true,
                            editToCreateNew: !isPending,
                            isPending: isPending
                          } 
                        });
                      }}
                    >
                      <td className="waiver-id-cell">#{waiver.waiver_id}</td>
                      <td>
                        <div className="name-cell">{waiver.first_name} {waiver.last_name}</div>
                        {waiver.email && (
                          <div className="email-cell">
                            <i className="fas fa-envelope me-1"></i>
                            {waiver.email}
                          </div>
                        )}
                      </td>
                      <td className="date-cell">
                        {waiver.signed_at ? (
                          <>
                            <i className="far fa-calendar me-1"></i>
                            {waiver.signed_at}
                          </>
                        ) : (
                          <span style={{color: '#f59e0b', fontWeight: '600'}}>
                            <i className="far fa-clock me-1"></i>
                            Draft
                          </span>
                        )}
                      </td>
                      <td>
                        {waiver.minors && waiver.minors.length > 0 ? (
                          <span className="minors-badge">+{waiver.minors.length}</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>None</span>
                        )}
                      </td>
                      <td>
                        {!waiver.signed_at ? (
                          <span className="badge-pending">Draft</span>
                        ) : waiver.verified_by_staff === 1 ? (
                          <span className="badge-verified">Verified</span>
                        ) : waiver.verified_by_staff === 2 ? (
                          <span className="badge-inaccurate">Issue</span>
                        ) : (
                          <span className="badge-pending">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default UserDashboard;