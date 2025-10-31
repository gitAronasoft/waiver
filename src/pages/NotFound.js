import React from "react";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid">
      <div className="container text-center" style={{ marginTop: "100px" }}>
        <h1 style={{ fontSize: "72px", fontWeight: "bold", color: "#6c757d" }}>404</h1>
        <h2 style={{ fontSize: "32px", fontWeight: "600", color: "#333", marginBottom: "20px" }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: "18px", color: "#666", marginBottom: "40px" }}>
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 40px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}

export default NotFound;
