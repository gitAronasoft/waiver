import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from '../../utils/axios';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from "react-toastify";
import Header from './components/header';
import Switch from "react-switch";
import DataTable from 'react-data-table-component';
import { BACKEND_URL } from '../../config';

function HistoryPage() {
  const [waivers, setWaivers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const navigate = useNavigate();

  // Detect mobile resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch waivers
  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/waivers/getallwaivers`)
      .then(res => {
        setWaivers(res.data);
        setFiltered(res.data);
      })
      .catch(err => {
        console.error("Error fetching waivers:", err);
        toast.error("Failed to load waivers.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter & search
  useEffect(() => {
    let data = [...waivers];

    if (filter !== 'All') {
      data = data.filter(w => {
        if (filter === 'Confirmed') return w.status === 1;
        if (filter === 'Unconfirmed') return w.status === 0;
        if (filter === 'Inaccurate') return w.status === 2;
        return true;
      });
    }

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      data = data.filter(w => {
        const fullName = `${w.first_name} ${w.last_name}`.toLowerCase();
        const minorNames = (w.minors || []).map(m => `${m.first_name} ${m.last_name}`.toLowerCase());
        return fullName.includes(lowerSearch) || minorNames.some(name => name.includes(lowerSearch));
      });
    }

    setFiltered(data);
  }, [filter, search, waivers]);

  const openModal = (entry, type) => {
    setSelectedEntry(entry);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
    setModalType("");
  };

  const handleConfirmModalAction = async () => {
    if (!selectedEntry) return;
    try {
      if (modalType === "delete") {
        await axios.delete(`${BACKEND_URL}/api/waivers/${selectedEntry.waiver_id}`);
        toast.success("Waiver deleted successfully.");
        setWaivers(prev => prev.filter(w => w.waiver_id !== selectedEntry.waiver_id));
      } else if (modalType === "status") {
        const newStatus = selectedEntry.status === 1 ? 0 : 1;
        await axios.put(`${BACKEND_URL}/api/waivers/${selectedEntry.waiver_id}/status`, { status: newStatus });
        toast.success(`Waiver marked as ${newStatus === 1 ? 'Confirmed' : 'Unconfirmed'}.`);
        setWaivers(prev =>
          prev.map(w => w.waiver_id === selectedEntry.waiver_id ? { ...w, status: newStatus } : w)
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Action failed.");
    } finally {
      closeModal();
    }
  };

  // Desktop columns
//   const desktopColumns = [
//     { name: "#", cell: (row, index) => index + 1, width: "60px", sortable: true },
//     // { name: "Name", selector: row => `${row.first_name} ${row.last_name}`, sortable: true },
//       {
//         name: "Name",
//         selector: row => `${row.first_name} ${row.last_name}`,
//         sortable: true,
//         cell: row => (
//           <span title={`${row.first_name} ${row.last_name}`}>
//             {row.first_name} {row.last_name}
//           </span>
//         )
//       },
//     { name: "Signed Date & Time", selector: row => row.signed_at, sortable: true,  wrap: true,  grow: 2, minWidth: "200px" },
//     { 
//       name: "Status", 
//       cell: row => (
//         <span className={`status-badge ${row.status === 1 ? 'confirmed' : row.status === 0 ? 'unconfirmed' : 'inaccurate'}`}>
//           {row.status === 1 ? 'Confirmed' : row.status === 0 ? 'Unconfirmed' : 'Inaccurate'}
//         </span>
//       ),
//       sortable: true
//     },
//     { 
//       name: "Verified", 
//       cell: row => (
//         <Switch
//           onChange={() => {
//             if (row.status === 2) {
//               toast.info("Inaccurate waivers cannot be updated.");
//               return;
//             }
//             openModal(row, "status");
//           }}
//           checked={row.status === 1}
//           onColor="#4CAF50"
//           offColor="#ccc"
//           handleDiameter={20}
//           uncheckedIcon={false}
//           checkedIcon={false}
//           height={20}
//           width={40}
//           disabled={row.status === 2}
//         />
//       )
//     },
//    {
//   name: "Review Mail",
//   cell: row => (
//     <span
//       className={`status-badge ${row.rating_email_sent === 1 ? 'confirmed' : 'unconfirmed'}`}
//     >
//       {row.rating_email_sent == 1 ? "Mail Sent" : "Not Sent"}
//     </span>
//   ),
//   sortable: true
// },

// {
//   name: "Review SMS",
//   cell: row => (
//     <span
//       className={`status-badge ${row.rating_sms_sent === 1 ? 'confirmed' : 'unconfirmed'}`}
//     >
//       {row.rating_sms_sent == 1 ? "Mail SMS" : "Not Sent"}
//     </span>
//   ),
//   sortable: true
// },

//     { 
//       name: "Action", 
//       cell: row => (
//         <div className="d-flex gap-3 ">
//           <i className="fas fa-eye" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/client-profile/${row.id}`)} />
//           <i className="fas fa-trash" style={{ cursor: 'pointer', color: 'red' }} onClick={() => openModal(row, "delete")} />
//         </div>
//       )
//     }
//   ];
const desktopColumns = [
  { 
    name: "Waiver ID", 
    selector: row => row.waiver_id,
    cell: (row) => <strong>#{row.waiver_id}</strong>, 
    width: "100px", 
    sortable: true 
  },

  {
    name: "Name",
    selector: row => `${row.first_name} ${row.last_name}`,
    sortable: true,
    cell: row => (
      <span title={`${row.first_name} ${row.last_name}`}>
        {row.first_name} {row.last_name}
      </span>
    )
  },

{
      name: "Minors",
      cell: row =>
        row.minors?.length > 0
          ? row.minors.map(m => `${m.first_name} ${m.last_name}`).join(", ")
          : "-",
      wrap: true
    },

  { 
    name: "Signed Date & Time", 
    selector: row => row.signed_at, 
    cell: row => <span>{row.signed_at || '-'}</span>,
    sortable: true, 
    wrap: true, 
    grow: 2, 
    minWidth: "200px" 
  },

  { 
    name: "Status", 
    cell: row => (
      <span className={`status-badge ${row.status === 1 ? 'confirmed' : row.status === 0 ? 'unconfirmed' : 'inaccurate'}`}>
        {row.status === 1 ? 'Confirmed' : row.status === 0 ? 'Unconfirmed' : 'Inaccurate'}
      </span>
    ),
    sortable: true
  },

  { 
    name: "Verified", 
    cell: row => (
      <Switch
        onChange={() => {
          if (row.status === 2) {
            toast.info("Inaccurate waivers cannot be updated.");
            return;
          }
          openModal(row, "status");
        }}
        checked={row.status === 1}
        onColor="#4CAF50"
        offColor="#ccc"
        handleDiameter={20}
        uncheckedIcon={false}
        checkedIcon={false}
        height={20}
        width={40}
        disabled={row.status === 2}
      />
    )
  },

  {
    name: "Review Mail",
    cell: row => (
      <span className={`status-badge ${row.rating_email_sent === 1 ? 'confirmed' : 'unconfirmed'}`}>
        {row.rating_email_sent === 1 ? "Mail Sent" : "Not Sent"}
      </span>
    ),
    sortable: true
  },

  {
    name: "Review SMS",
    cell: row => (
      <span className={`status-badge ${row.rating_sms_sent === 1 ? 'confirmed' : 'unconfirmed'}`}>
        {row.rating_sms_sent === 1 ? "SMS Sent" : "Not Sent"}
      </span>
    ),
    sortable: true
  },

  { 
    name: "Action", 
    cell: row => (
      <div className="d-flex gap-3">
        <i className="fas fa-eye" style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/client-profile/${row.id}`)} title="View Profile" />
        <i className="fas fa-trash" style={{ cursor: 'pointer', color: 'red' }} onClick={() => openModal(row, "delete")} title="Delete Waiver" />
      </div>
    )
  }
];


  // Mobile columns
  const mobileColumns = [
    { 
      name: "Waiver ID", 
      selector: row => row.waiver_id,
      cell: (row) => <strong>#{row.waiver_id}</strong>,
      sortable: true,
      width: "100px"
    },
    { name: "Name", selector: row => `${row.first_name} ${row.last_name}`, sortable: true }
  ];

  // Expandable component for mobile
// Expandable component for mobile
const ExpandedComponent = ({ data }) => (
  <div style={{ padding: "10px 20px" }}>
    {/* Minors */}
    <div>
      <strong>Minors:</strong>
      {data.minors?.length > 0
        ? data.minors.map((m, i) => (
            <div key={`${data.waiver_id}-minor-${i}`}>
              {m.first_name} {m.last_name}
            </div>
          ))
        : <div>No minors</div>}
    </div>

    {/* Status */}
    <div style={{ marginTop: "10px" }}>
      <strong>Status:</strong>{" "}
      <span
        className={`status-badge ${
          data.status === 1
            ? "confirmed"
            : data.status === 0
            ? "unconfirmed"
            : "inaccurate"
        }`}
      >
        {data.status === 1
          ? "Confirmed"
          : data.status === 0
          ? "Unconfirmed"
          : "Inaccurate"}
      </span>
    </div>

    {/* Verified Switch */}
    <div style={{ marginTop: "10px" }}>
      <strong>Verified:</strong>{" "}
      <Switch
        onChange={() => {
          if (data.status === 2) {
            toast.info("Inaccurate waivers cannot be updated.");
            return;
          }
          openModal(data, "status");
        }}
        checked={data.status === 1}
        onColor="#4CAF50"
        offColor="#ccc"
        handleDiameter={20}
        uncheckedIcon={false}
        checkedIcon={false}
        height={20}
        width={40}
        disabled={data.status === 2}
      />
    </div>

    {/* Review Mail */}
    <div style={{ marginTop: "10px" }}>
      <strong>Review Mail:</strong>{" "}
      <span
        className={`status-badge ${
          data.rating_email_sent === 1 ? "confirmed" : "unconfirmed"
        }`}
      >
        {data.rating_email_sent === 1 ? "Mail Sent" : "Not Sent"}
      </span>
    </div>

    {/* Review SMS */}
    <div style={{ marginTop: "10px" }}>
      <strong>Review SMS:</strong>{" "}
      <span
        className={`status-badge ${
          data.rating_sms_sent === 1 ? "confirmed" : "unconfirmed"
        }`}
      >
        {data.rating_sms_sent === 1 ? "Mail SMS" : "Not Sent"}
      </span>
    </div>

    {/* Action */}
    <div style={{ marginTop: "10px" }}>
      <strong>Action:</strong>{" "}
      <div className="d-flex gap-3">
        <i
          className="fas fa-eye"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/admin/client-profile/${data.id}`)}
        />
        <i
          className="fas fa-trash"
          style={{ cursor: "pointer", color: "red" }}
          onClick={() => openModal(data, "delete")}
        />
      </div>
    </div>
  </div>
);

  return (
    <>
      <Header />
      <div className="container mt-5">
        <div className="row">
          <div className="col-md-12">

            {/* Search & filter */}
            <div className="d-flex flex-wrap justify-content-between mb-4">
              <div className="custom-search-box mb-2 custom-search-mobile-view">
                <span className="search-icon">
                  <img src="/assets/img/solar_magnifer-outline.png" alt="Search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or minors"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2  gap-md-2 align-items-center mb-2">
                {['All', 'Confirmed', 'Unconfirmed', 'Inaccurate'].map(type => (
                  <div
                    key={type}
                    className={`all-waiver ${filter === type ? 'active-tab' : ''}`}
                    onClick={() => setFilter(type)}
                    style={{ cursor: "pointer" }}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            {loading ? (
              <Skeleton height={50} count={5} />
            ) : (
              <div class="history-table">
              <DataTable
                columns={isMobile ? mobileColumns : desktopColumns}
                data={filtered}
                pagination
                responsive
                highlightOnHover
                noHeader
                keyField="waiver_id"
                expandableRows={isMobile}
                expandableRowsComponent={ExpandedComponent}
              />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedEntry && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {modalType === "delete" ? "Delete Waiver" : "Change Status"}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                {modalType === "delete" ? (
                  <p>Are you sure you want to delete this waiver for <strong>{selectedEntry.first_name} {selectedEntry.last_name}</strong>?</p>
                ) : (
                  <p>
                    Are you sure you want to <strong>{selectedEntry.status === 1 ? "Unconfirm" : "Confirm"}</strong> this waiver for <strong>{selectedEntry.first_name} {selectedEntry.last_name}</strong>?
                  </p>
                )}
              </div>
               <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger" onClick={handleConfirmModalAction}>
                  Yes, {modalType === "delete" ? "Delete" : selectedEntry.status === 1 ? "Unconfirm" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistoryPage;
