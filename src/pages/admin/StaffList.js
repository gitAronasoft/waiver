import React, { useEffect, useState, useCallback } from "react";
import axios from "../../utils/axios";
import Header from "./components/header";
import { toast } from "react-toastify";
import Switch from "react-switch";
import { useNavigate } from "react-router-dom";
import DataTable from 'react-data-table-component';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { BACKEND_URL } from '../../config';
import { useSelector } from 'react-redux';
import { selectCurrentStaff } from '../../store/slices/authSlice';

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Get current user from Redux store
  const currentUser = useSelector(selectCurrentStaff);

  const navigate = useNavigate();

  // Debug log to check user role
  useEffect(() => {
    console.log('Current user from Redux:', currentUser);
    console.log('User role:', currentUser?.role);
    console.log('Is superadmin?', currentUser?.role === 'superadmin');
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/staff/getstaff`);
      const sortedData = response.data.sort((a, b) => b.id - a.id);
      setStaff(sortedData);
      setFiltered(sortedData);
    } catch (err) {
      console.error("Failed to fetch staff", err);
      toast.error("Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (search.trim() === "") {
      setFiltered(staff);
    } else {
      const lowerSearch = search.toLowerCase();
      const filtered = staff.filter(s => 
        s.name.toLowerCase().includes(lowerSearch) ||
        s.email.toLowerCase().includes(lowerSearch)
      );
      setFiltered(filtered);
    }
  }, [search, staff]);

  const openModal = (id, name, type) => {
    setSelectedStaffId(id);
    setSelectedStaffName(name);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStaffId(null);
    setSelectedStaffName("");
    setModalType("");
  };

  const handleConfirmModalAction = async () => {
    if (!selectedStaffId) return;
    try {
      if (modalType === "delete") {
        await axios.delete(`${BACKEND_URL}/api/staff/delete-staff/${selectedStaffId}`);
        toast.success("Staff deleted successfully");
        setStaff(prev => prev.filter(s => s.id !== selectedStaffId));
      } else if (modalType === "status") {
        const staffMember = staff.find(s => s.id === selectedStaffId);
        const newStatus = staffMember.status === 1 ? 0 : 1;
        await axios.put(`${BACKEND_URL}/api/staff/update-status/${selectedStaffId}`, {
          status: newStatus,
        });
        toast.success("Status updated successfully");
        setStaff(prev =>
          prev.map(s => s.id === selectedStaffId ? { ...s, status: newStatus } : s)
        );
      }
    } catch (error) {
      toast.error(`Failed to ${modalType === "delete" ? "delete" : "update"} staff`);
    } finally {
      closeModal();
    }
  };

  const desktopColumns = [
    { name: "#", cell: (row, index) => index + 1, width: "60px", sortable: true },
    {
      name: "Name",
      selector: row => row.name,
      sortable: true,
      cell: row => <span title={row.name}>{row.name}</span>
    },
    {
      name: "Email",
      selector: row => row.email,
      sortable: true,
      cell: row => <span title={row.email}>{row.email}</span>
    },
    {
      name: "Role",
      selector: row => {
        if (row.role === 'superadmin') return 'Superadmin';
        if (row.role === 'admin') return 'Admin';
        return 'Staff';
      },
      sortable: true
    },
    {
      name: "Status",
      cell: row => (
        currentUser?.role === 'superadmin' ? (
          <Switch
            onChange={() => openModal(row.id, row.name, "status")}
            checked={row.status === 1}
            onColor="#4CAF50"
            offColor="#ccc"
            handleDiameter={20}
            uncheckedIcon={false}
            checkedIcon={false}
            height={20}
            width={40}
          />
        ) : (
          <span>{row.status === 1 ? 'Active' : 'Inactive'}</span>
        )
      )
    },
    ...(currentUser?.role === 'superadmin' ? [{
      name: "Action",
      cell: row => (
        <div className="d-flex gap-3">
          <i
            className="fas fa-edit"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/admin/update-staff/${row.id}`)}
          />
          <i
            className="fas fa-trash"
            style={{ cursor: "pointer", color: "red" }}
            onClick={() => openModal(row.id, row.name, "delete")}
          />
        </div>
      )
    }] : [])
  ];

  const mobileColumns = [
    {
      name: "Name",
      selector: row => row.name,
      sortable: true
    },
    {
      name: "Email",
      selector: row => row.email,
      sortable: true
    }
  ];

  const ExpandedComponent = ({ data }) => (
    <div style={{ padding: "10px 20px" }}>
      <div>
        <strong>Role:</strong> {data.role === 'superadmin' ? 'Superadmin' : data.role === 'admin' ? 'Admin' : 'Staff'}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Status:</strong>{" "}
        {currentUser?.role === 'superadmin' ? (
          <Switch
            onChange={() => openModal(data.id, data.name, "status")}
            checked={data.status === 1}
            onColor="#4CAF50"
            offColor="#ccc"
            handleDiameter={20}
            uncheckedIcon={false}
            checkedIcon={false}
            height={20}
            width={40}
          />
        ) : (
          <span>{data.status === 1 ? 'Active' : 'Inactive'}</span>
        )}
      </div>
      {currentUser?.role === 'superadmin' && (
        <div style={{ marginTop: "10px" }}>
          <strong>Action:</strong>{" "}
          <div className="d-flex gap-3">
            <i
              className="fas fa-edit"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/admin/update-staff/${data.id}`)}
            />
            <i
              className="fas fa-trash"
              style={{ cursor: "pointer", color: "red" }}
              onClick={() => openModal(data.id, data.name, "delete")}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Header />
      <div className="container mt-5">
        <div className="row">
          <div className="col-md-12">

            <div className="d-flex flex-wrap justify-content-between mb-4">
              <h2>Staff List</h2>
              {currentUser?.role === 'superadmin' && (
                <button
                  onClick={() => navigate("/admin/add-staff")}
                  className="btn btn-primary"
                >
                  + Add Staff
                </button>
              )}
            </div>

            <div className="d-flex flex-wrap justify-content-between mb-4">
              <div className="custom-search-box mb-2 custom-search-mobile-view">
                <span className="search-icon">
                  <img src="/assets/img/solar_magnifer-outline.png" alt="Search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <Skeleton height={50} count={5} />
            ) : (
              <div className="history-table">
                <DataTable
                  columns={isMobile ? mobileColumns : desktopColumns}
                  data={filtered}
                  pagination
                  responsive
                  highlightOnHover
                  noHeader
                  keyField="id"
                  expandableRows={isMobile}
                  expandableRowsComponent={ExpandedComponent}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalType === "delete" ? "Delete Staff Member" : "Change Status"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                ></button>
              </div>
              <div className="modal-body">
                {modalType === "delete" ? (
                  <p>
                    Are you sure you want to delete <strong>{selectedStaffName}</strong>?
                  </p>
                ) : (
                  <p>
                    Are you sure you want to change the status of <strong>{selectedStaffName}</strong>?
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleConfirmModalAction}>
                  Yes, {modalType === "delete" ? "Delete" : "Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffList;
