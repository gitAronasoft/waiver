import React, { useEffect, useState } from "react";
import axios from "../../utils/axios";
import Header from "./components/header";
import { convertToEST } from "../../utils/time";
import DataTable from 'react-data-table-component';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { BACKEND_URL } from '../../config';

const AdminFeedbackPage = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(
          `${BACKEND_URL}/api/feedback/list`
        );
        const sorted = data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setFeedbackList(sorted);
        setFiltered(sorted);
      } catch (err) {
        console.error("Failed to fetch feedback", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFiltered(feedbackList);
    } else {
      const lowerSearch = search.toLowerCase();
      const filtered = feedbackList.filter(f => {
        const fullName = `${f.first_name || ""} ${f.last_name || ""}`.toLowerCase();
        const staffName = (f.staff_name || "").toLowerCase();
        const message = (f.message || "").toLowerCase();
        const issue = (f.issue || "").toLowerCase();
        return fullName.includes(lowerSearch) || 
               staffName.includes(lowerSearch) || 
               message.includes(lowerSearch) ||
               issue.includes(lowerSearch);
      });
      setFiltered(filtered);
    }
  }, [search, feedbackList]);

  const desktopColumns = [
    { name: "#", cell: (row, index) => index + 1, width: "60px", sortable: true },
    {
      name: "Customer",
      selector: row => `${row.first_name || ""} ${row.last_name || ""}`,
      sortable: true,
      cell: row => (
        <span title={`${row.first_name || ""} ${row.last_name || ""}`}>
          {row.first_name || ""} {row.last_name || ""}
        </span>
      )
    },
    {
      name: "Waiver ID",
      selector: row => row.waiver_id || "-",
      sortable: true,
      width: "100px"
    },
    {
      name: "Rating",
      selector: row => row.rating || "-",
      sortable: true,
      width: "100px"
    },
    {
      name: "Visit Date",
      selector: row => row.visit_date ? convertToEST(row.visit_date) : "-",
      sortable: true,
      wrap: true,
      minWidth: "150px"
    },
    {
      name: "Issue",
      selector: row => row.issue || "-",
      sortable: true,
      cell: row => <span title={row.issue || "-"}>{row.issue || "-"}</span>
    },
    {
      name: "Staff Name",
      selector: row => row.staff_name || "-",
      sortable: true,
      cell: row => <span title={row.staff_name || "-"}>{row.staff_name || "-"}</span>
    },
    {
      name: "Message",
      selector: row => row.message || "-",
      sortable: true,
      cell: row => <span title={row.message || "-"}>{row.message || "-"}</span>,
      wrap: true,
      grow: 2
    },
    {
      name: "Date",
      selector: row => row.created_at ? convertToEST(row.created_at) : "-",
      sortable: true,
      wrap: true,
      minWidth: "150px"
    }
  ];

  const mobileColumns = [
    {
      name: "Customer",
      selector: row => `${row.first_name || ""} ${row.last_name || ""}`,
      sortable: true
    },
    {
      name: "Rating",
      selector: row => row.rating || "-",
      sortable: true
    }
  ];

  const ExpandedComponent = ({ data }) => (
    <div style={{ padding: "10px 20px" }}>
      <div>
        <strong>Waiver ID:</strong> {data.waiver_id || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Visit Date:</strong> {data.visit_date ? convertToEST(data.visit_date) : "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Issue:</strong> {data.issue || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Staff Name:</strong> {data.staff_name || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Message:</strong> {data.message || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Date Submitted:</strong> {data.created_at ? convertToEST(data.created_at) : "-"}
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <div className="container mt-5">
        <div className="row">
          <div className="col-md-12">

            <h5 className="h5-heading my-3 pb-3">Customer Feedback</h5>

            <div className="d-flex flex-wrap justify-content-between mb-4">
              <div className="custom-search-box mb-2 custom-search-mobile-view">
                <span className="search-icon">
                  <img src="/assets/img/solar_magnifer-outline.png" alt="Search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search feedback..."
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
    </>
  );
};

export default AdminFeedbackPage;
