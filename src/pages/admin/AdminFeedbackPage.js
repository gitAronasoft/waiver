import React, { useEffect, useState, useRef } from "react";
import axios from "../../utils/axios";
import Header from "./components/header";
import { convertToEST } from "../../utils/time";
import DataTable from 'react-data-table-component';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { toast } from "react-toastify";
import { BACKEND_URL } from '../../config';

const AdminFeedbackPage = () => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch feedback with server-side pagination and sorting
  const fetchFeedback = (page = 1, limit = 20, searchQuery = "", sort = sortBy, order = sortOrder) => {
    setLoading(true);
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: sort,
      sortOrder: order,
      ...(searchQuery && { search: searchQuery })
    });

    axios.get(`${BACKEND_URL}/api/feedback/list?${params}`)
      .then(res => {
        setData(res.data.data || res.data);
        setTotalRows(res.data.pagination?.total || res.data.length || 0);
      })
      .catch(err => {
        console.error("Failed to fetch feedback", err);
        toast.error("Failed to load feedback.");
      })
      .finally(() => setLoading(false));
  };

  // Handle column sort
  const handleSort = (column) => {
    const newSortOrder = sortBy === column && sortOrder === 'ASC' ? 'DESC' : 'ASC';
    setSortBy(column);
    setSortOrder(newSortOrder);
    fetchFeedback(currentPage, rowsPerPage, search, column, newSortOrder);
  };

  // Initial fetch
  useEffect(() => {
    fetchFeedback(currentPage, rowsPerPage, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when search changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
    fetchFeedback(1, rowsPerPage, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Handle page change
  const handlePageChange = (page) => {
    if (page === currentPage) return;
    setCurrentPage(page);
    fetchFeedback(page, rowsPerPage, search);
  };

  // Handle rows per page change
  const handlePerRowsChange = (newPerPage, page) => {
    if (newPerPage === rowsPerPage) return;
    setRowsPerPage(newPerPage);
    setCurrentPage(page);
    fetchFeedback(page, newPerPage, search);
  };

  const desktopColumns = [
    { name: "#", cell: (row, index) => index + 1, width: "60px" },
    {
      name: "Customer",
      selector: row => `${row.first_name || ""} ${row.last_name || ""}`,
      cell: row => (
        <span title={`${row.first_name || ""} ${row.last_name || ""}`}>
          {row.first_name || ""} {row.last_name || ""}
        </span>
      )
    },
    {
      name: (
        <div 
          onClick={() => handleSort('email')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          Email {sortBy === 'email' && (sortOrder === 'ASC' ? '↑' : '↓')}
        </div>
      ),
      selector: row => row.email || "-",
      cell: row => <span title={row.email || "-"}>{row.email || "-"}</span>,
      wrap: true,
      minWidth: "200px"
    },
    {
      name: (
        <div 
          onClick={() => handleSort('cell_phone')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          Phone {sortBy === 'cell_phone' && (sortOrder === 'ASC' ? '↑' : '↓')}
        </div>
      ),
      selector: row => row.cell_phone || "-",
      cell: row => <span title={row.cell_phone || "-"}>{row.cell_phone || "-"}</span>,
      width: "150px"
    },
    {
      name: (
        <div 
          onClick={() => handleSort('waiver_id')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          Waiver ID {sortBy === 'waiver_id' && (sortOrder === 'ASC' ? '↑' : '↓')}
        </div>
      ),
      selector: row => row.waiver_id || "-",
      width: "120px"
    },
    {
      name: (
        <div 
          onClick={() => handleSort('rating')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          Rating {sortBy === 'rating' && (sortOrder === 'ASC' ? '↑' : '↓')}
        </div>
      ),
      selector: row => row.rating || "-",
      width: "110px"
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
        <strong>Email:</strong> {data.email || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
        <strong>Phone:</strong> {data.cell_phone || "-"}
      </div>
      <div style={{ marginTop: "10px" }}>
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
                  data={data}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationDefaultPage={currentPage}
                  paginationPerPage={rowsPerPage}
                  onChangePage={handlePageChange}
                  onChangeRowsPerPage={handlePerRowsChange}
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
