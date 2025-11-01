import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "../../utils/axios";
import { BACKEND_URL } from '../../config';


function WaiverPDFPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [minors, setMinors] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/waivers/waiver-details/${id}`)
      .then((res) => {
        setCustomer(res.data.customer);
        setMinors(res.data.minors || []);
      })
      .catch((err) => console.error("Failed to load waiver data", err));
  }, [id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const element = pdfRef.current;
      
      // Reduce scale from 0.8 to 0.6 for optimal file size
      const canvas = await html2canvas(element, {
        scale: 0.6,
        useCORS: true,
        scrollY: -window.scrollY,
      });

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true
      });
      const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const pageCanvasHeight = (usableHeight * canvas.width) / imgWidth;

    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

      const context = pageCanvas.getContext("2d");
      context.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        pageCanvas.height,
        0,
        0,
        canvas.width,
        pageCanvas.height
      );

      // Convert to JPEG with 50% quality for smaller file size (reduced from 70%)
      const pageData = pageCanvas.toDataURL("image/jpeg", 0.5);

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        pageData,
        "JPEG",
        margin,
        margin,
        imgWidth,
        (pageCanvas.height * imgWidth) / canvas.width
      );

      renderedHeight += pageCanvasHeight;
      pageIndex++;
    }

    pdf.save(`waiver-${id}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (!customer) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid">
      <div className="text-end p-3">
        <button 
          className="btn btn-success" 
          onClick={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Generating PDF...
            </>
          ) : (
            'Download PDF'
          )}
        </button>
      </div>

      <div className="container" ref={pdfRef}>
        <div className="row">
          <div className="col-md-2">
            <div className="back-btn">
              <a href={`/profile/${id}`}>
                <img className="img-fluid" src="/assets/img/image 298.png" alt="Back" /> BACK
              </a>
            </div>
          </div>

          <div className="col-12 col-md-8 col-xl-8">
            <div className="step-two step-three">
              <div className="logo">
                <img
                  className="img-fluid"
                  src="/assets/img/logo.png"
                  alt="Logo"
                />
              </div>
              <div className="mb-3">
                <h5 className="h5-heading">Assumption of Risk, Release and Indemnification</h5>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12 mx-auto">
            <p>
              BY SIGNING THIS DOCUMENT, YOU WILL WAIVE OR GIVE UP CERTAIN LEGAL RIGHTS INCLUDING
              THE RIGHT TO SUE OR CLAIM COMPENSATION FOLLOWING AN ACCIDENT - PLEASE READ CAREFULLY
            </p>
            <p>I ACKNOWLEDGE RISKS: ...</p>
            <p>
              Customer: <strong>{customer.first_name} {customer.last_name}</strong><br />
              Phone: <strong>{customer.cell_phone}</strong><br />
              Email: <strong>{customer.email}</strong>
            </p>

            <p className="paragraph-heading">Minors:</p>
            {minors.map((minor, idx) => (
              <div key={idx} className="minor-group d-flex gap-3 align-items-center my-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Minor First Name"
                  value={minor.first_name || ''}
                  readOnly
                  style={{
                    border: '2px solid #333',
                    padding: '12px 15px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Minor Last Name"
                  value={minor.last_name || ''}
                  readOnly
                  style={{
                    border: '2px solid #333',
                    padding: '12px 15px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
                <input
                  type="date"
                  className="form-control"
                  value={minor.dob ? minor.dob.split('T')[0] : ''}
                  readOnly
                  style={{
                    border: '2px solid #333',
                    padding: '12px 15px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
              </div>
            ))}

            <p className="my-4">Signature: _____________________</p>
            <p>Date: _____________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaiverPDFPage;
