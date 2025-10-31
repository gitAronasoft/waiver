import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../../utils/axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Header from "./components/header";
import { getCurrentESTTime } from "../../utils/time";
import { BACKEND_URL } from '../../config';


function ProfilePage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [minors, setMinors] = useState([]);
  const [waiverHistory, setWaiverHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const pdfRef = useRef();

  useEffect(() => {
    // id is now user_id from the URL
    axios
      .get(`${BACKEND_URL}/api/waivers/waiver-details/${id}`)
      .then((res) => {
        setCustomer(res.data.customer);
        setMinors(res.data.minors || []);
        setWaiverHistory(res.data.waiverHistory || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading customer:", err);
        setIsLoading(false);
      });
  }, [id]);  

const handleDownloadPDF = async (waiverId) => {
  try {
    // Find the specific waiver from waiverHistory
    const selectedWaiver = waiverHistory.find(w => w.id === waiverId);
    if (!selectedWaiver) {
      console.error("Waiver not found in history");
      return;
    }
    
    // Parse minors from snapshot
    let snapshotMinors = [];
    if (selectedWaiver.minors_snapshot) {
      try {
        snapshotMinors = JSON.parse(selectedWaiver.minors_snapshot);
      } catch (e) {
        console.error("Error parsing minors snapshot:", e);
      }
    }
    
    // Store original state
    const originalCustomer = customer;
    const originalMinors = minors;
    const originalWaiverHistory = waiverHistory;
    
    // Create a temporary waiver history with only the selected waiver
    const tempWaiverHistory = [selectedWaiver];
    
    // Update state to show only this waiver's data
    setMinors(snapshotMinors);
    setWaiverHistory(tempWaiverHistory);
    
    // Wait for React to re-render with new data
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const input = pdfRef.current;

    // Lower scale to reduce resolution (and file size)
    const canvas = await html2canvas(input, {
      scale: 0.8,
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
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

      // Use JPEG with quality 0.7 to reduce size
      const pageData = pageCanvas.toDataURL("image/jpeg", 0.7);

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

    pdf.save(`waiver-${waiverId}.pdf`);
    
    // Restore original data after PDF generation
    setCustomer(originalCustomer);
    setMinors(originalMinors);
    setWaiverHistory(originalWaiverHistory);
  } catch (err) {
    console.error("PDF generation failed", err);
  }
};


function formatPhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone; // fallback
}


  return (
    <>
      <Header />
      
      {isLoading ? (
        <div className="text-center mt-5">Loading...</div>
      ) : !customer ? (
        <div className="text-center mt-5">Customer not found</div>
      ) : (
        <>
      {/* PDF Hidden Content */}
<div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
  
       <div className="container-fluid" ref={pdfRef}>
      <div className="container">
        <div className="row">
         
          <div className="col-12 col-md-12 col-xl-12">
            <div className="step-two step-three">
              <div className="logo">
                <img
                  src="/assets/img/logo.png"
                  className="img-fluid"
                  alt="logo"
                />
              </div>
              <h5 className="h5-heading my-3 text-center">
                Assumption of Risk, Release and Indemnification
              </h5>
            </div>
          </div>
        </div>
 <div class="row"> 

        <div class="col-md-12 mx-auto"> 
   <p>
  BY SIGNING THIS DOCUMENT, YOU WILL WAIVE OR GIVE UP CERTAIN LEGAL RIGHTS INCLUDING THE RIGHT TO SUE OR CLAIM COMPENSATION FOLLOWING AN ACCIDENT - <strong>PLEASE READ CAREFULLY</strong>
</p>
                        {customer && (
  <div className="info-table w-100 border p-3 my-4" style={{ fontSize: "14px" }}>
    <table cellPadding="8" cellSpacing="0" className="w-100">
      <tbody>
        <tr>
          <td><strong>Participant First Name:</strong><br />{customer.first_name}</td>
          <td><strong>Participant Last Name:</strong><br />{customer.last_name}</td>
          
          <td><strong>Date of Birth:</strong><br />{customer.dob?.split("T")[0]}</td>
         
        </tr>
        <tr>
          <td ><strong>Address:</strong><br />{customer.address}</td>
          <td><strong>City:</strong><br />{customer.city}</td>
          <td><strong>Province:</strong><br />{customer.province}</td>
         
        </tr>
        <tr>
           <td><strong>Postal Code:</strong><br />{customer.postal_code}</td>
        
          <td><strong>Cell Phone:</strong><br />{customer.country_code} {formatPhone(customer.cell_phone)}</td>
        
          <td><strong>Email:</strong><br />{customer.email || '--'}</td>
        
        </tr>
      </tbody>
    </table>
  </div>
)}
        </div>
      </div>

        <div class="row"> 

                        <div class="col-md-12 mx-auto"> 
                              
                            <p class="fs-6"> In consideration of being allowed to use the services, equipment, and facilities of Skate & Play Inc. (“SPI”), I hereby acknowledge 
and agree to the following terms and conditions: </p> <br></br>

                           <h6><strong>ASSUMPTION OF RISK:</strong> </h6>
                           <p>I hereby acknowledge, accept and agree that the use of or participation in SPIs Activities, as hereinafter defined, including the 
rink, and related activities, <strong>and the use of SPI’s services, equipment, and facilities </strong> is inherently dangerous which may result 
in serious injury or death resulting from my own actions, the actions of others, <strong>improper use of equipment, equipment 
failures, failure to act safely within one’s own ability, negligence of other persons, negligent first aid and negligence </strong>
on the part of the SPI. I understand that negligence includes failure on the part of SPI to take reasonable steps to safeguard or 
protect me from the risks, dangers and hazards of participating in SPI’s Activities. I freely accept and fully assume all risks, 
dangers and hazards associated with SPI Activities and the possibility of personal injury, death, property damage or loss 
resulting therefrom. I have received full information regarding SPI’s services, equipment, and facilities and have had the 
opportunity to ask any questions I may have regarding same. </p><br></br>

                            <h6><strong>MEDICAL CONDITION: </strong> </h6>
                            <p>Participation in a session may place unusual stresses on the body and is not recommended for persons suffering from asthma, 
epilepsy, cardio disorders, respiratory disorders, hypertension, skeletal, joint or ligament problems or conditions, and certain 
mental illnesses. Women who are pregnant or suspect they are pregnant and persons who have consumed alcohol or are 
otherwise intoxicated are not recommended to engage in activities.</p>

                            <p class="my-4"> <strong><strong>{`${customer.first_name} ${customer.last_name}` || "_______"}</strong></strong>&nbsp;&nbsp;  I agree that I will be responsible for property damage as a result of any unauthorized activity. </p>
                           

                            <p class="paragraph-heading"> RELEASE OF LIABILITY, WAIVER OF CLAIMS AND INDEMNITY AGREEMENT </p><br></br>

                           <p>In consideration of SPI agreeing to my participation, and permitting my use of SPIs equipment, room, and other facilities I hereby agree 
as follows: </p><br></br>

                            <p class="paragraph-heading"> In this Release Agreement the term “Activities” shall include all activities, functions, events, orientations, 
instruction sessions, competitions and services provided, arranged, organized, sponsored or authorized by SPI </p>


                            <p class="my-4"> <span class="paragraph-heading"> TO WAIVE ANY AND ALL CLAIMS AND TO RELEASE SPI </span>  from any and all liability for any loss, cost, damage, expense, or 
injury including death that I may suffer, or that my next of kin may suffer, due to any cause whatsoever during participation in any 
Activity including as a result of: negligence, breach of contract, or breach of any statutory or other duty care on the part of SPI in 
respect of the provision of or the failure to provide any warnings, ,<strong>failure of equipment,</strong> directions or instructions as to the 
Activities or the risks, dangers and hazards of participating in the Activities. I understand that negligence includes the failure on the 
part of SPI to take reasonable steps to safeguard or protect me from the risks.</p> 

                            <p> <span class="paragraph-heading"> TO HOLD HARMLESS AND INDEMNIFY SPI </span> from any and all liability for any property damage or personal injury to any third 
party resulting from any of my actions. </p><br></br>

                            <p> This waiver shall be effective in the Province of Ontario and binding upon my heirs, next of kin, executors, and administrators in the 
event of death, injury or incapacity. </p><br></br><br></br><br></br>

                            <p> Any litigation involving the parties to this document shall be brought solely within the Province of Ontario and shall be within the 
exclusive jurisdiction of the Courts residing in the City of Ottawa. </p>

                            <p class="my-4"><strong><strong>{`${customer.first_name} ${customer.last_name}` || "_______"}</strong></strong>&nbsp;&nbsp; <strong>  PHOTOGRAPH / VIDEO RELEASEInitial</strong>&nbsp;&nbsp;   I consent to photographs and videos being taken of me during my 
participation at SPI, and to the publication of the photographs and videos for advertising, promotional, and marketing purposes. I 
waive any and all claims against SPI arising out of SPI’s use of my photographic or video representation of me, including claims 
relating to defamation or invasion of any copyright, privacy, personality or publicity rights. I agree not to claim compensation from 
SPI for the use of photographic or video representation of me during my participation in SPI’s Activities. 
 </p>

                            <p class="my-4"><strong><strong>{`${customer.first_name} ${customer.last_name}` || "_______"}</strong></strong>&nbsp;&nbsp;  You agree that skating while under the influence of alcohol or any other drugs is strictly prohibited, as it significantly 
increases the risk of injury to yourself and others.  </p>

  <p class="my-4"><strong>{`${customer.first_name} ${customer.last_name}` || "_______"}</strong>&nbsp;&nbsp;  We encourage everyone to wear protective gear. You understand that Skate & Play Inc. has encouraged you to wear 
full protective gear, and by waiving that right, you acknowledge and accept all associated risks.   </p>


                            <p class="my-4"> In entering into the waiver, I am not relying on any oral or written representations or statements made my SPI with respect to the 
safety of the rooms other than what is set forth in this waiver.  </p>

                            <p class="my-4"> BY COMPLETING THIS FORM I HEREBY ACKNOWLEDGE THAT I AM NOT INTOXICATED NOR HAVE I CONSUMED ANY 
OTHER SUBSTANCES THAT MAY RESULT IN MY JUDGEMENT BEING IMPAIRED. I HEREBY ASSUME FULL 
RESPONSIBILITY FOR MY ACTIONS, RISKS, DANGERS, AND HAZARDS RESULTING FROM THE USE OF THE FACILITIES 
AND PARTICIPATION THE ACTIVITIES WHILE UNDER THE INFLUENCE OF ALCOHOL OR MIND ALTERING 
SUBSTANCES. I UNDERSTAND THAT AM GIVING UP CERTAIN RIGHTS WHICH I OR MY HEIRS, NEXT OF KIN, 
EXECUTORS, ADMINISTRATORS AND ASSIGNS MAY HAVE. THAT I AM AT LEAST 18 YEARS OLD AS OF THE DAY THIS 
FORM WAS FILLED OUT. I FREELY ACCEPT AND ASSUME ALL RISKS, DANGERS AND HAZARDS AND THE POSSIBILITY 
OF RESULTING PERSONAL INJURY, DEATH, PROPERTY DAMAGE OR LOSS DIRECTLY OR INDIRECTLY ASSOCIATED 
WITH MY PARTICIPATION IN THE ACTIVITY. I HAVE READ THIS RELEASE AGREEMENT AND FULLY UNDERSTAND ITS 
CONTENTS AND VOLUNTARILY AGREE TO ITS TERMS  </p> 

<p> <span class="paragraph-heading">I CONFIRM THAT I HAVE READ AND UNDERSTAND THIS WAIVER PRIOR TO SIGNING IT, AND I AM AWARE THAT BY 
SIGNING THIS WAIVER I AM WAIVING CERTIAN LEGAL RIGHTS WHICH I OR MY HEIRS, NEXT OF KIN, EXECUTORS, 
AND ADMINISTRATORS MAY HAVE AGAINST SKATE & PLAY INC. </span> </p>


<div>
  {minors.map((minor, index) => (
    <div
      key={index}
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        marginBottom: "15px",
      }}
    >
      <input
        type="text"
        value={minor.first_name}
        readOnly
        style={{
          flex: 1,
          padding: "12px 15px",
          border: "2px solid #333",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      />
      <input
        type="text"
        value={minor.last_name}
        readOnly
        style={{
          flex: 1,
          padding: "12px 15px",
          border: "2px solid #333",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      />
      <input
        type="text"
        value= {minor.dob ? new Date(minor.dob).toISOString().slice(0, 10) : ""}
        readOnly
        style={{
          flex: 1,
          padding: "12px 15px",
          border: "2px solid #333",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      />
    </div>
  ))}
</div>



{waiverHistory.length > 0 && waiverHistory[0].signature_image ? (
  <div style={{ textAlign: "center", marginTop: "20px" }}>
    <img
      src={waiverHistory[0].signature_image}
      alt="Signature"
      style={{ width: "500px", height: "200px", border: "1px solid #ccc" }}
    />
    <p><strong>Signed on:</strong> {waiverHistory[0].date}</p>
    <p><strong>PDF Generated on:</strong> {getCurrentESTTime("YYYY-MM-DD hh:mm A")}</p>
  </div>
) : (
  <div style={{ textAlign: "center", marginTop: "20px" }}>
    <p>No signature available.</p>
  </div>
)}

 
<div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', maxWidth: '800px', margin: '20px auto' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
    <div style={{ width: '48%' }}>
      <label>DATE__________________________________</label>
      <div style={{ marginTop: '30px' }}>__________________________________<br /><small>Signature</small></div>
      <div style={{ marginTop: '30px' }}>__________________________________<br /><small>Printed Name</small></div>
    </div>
    <div style={{ width: '48%' }}>
      <br />
      <div>__________________________________<br /><small>Signature or Witness</small></div>
      <div style={{ marginTop: '30px' }}>__________________________________<br /><small>Printed Name or Witness</small></div>
    </div>
  </div>

  <div style={{ border: '1px solid black', padding: '10px' }}>
    <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
      PLEASE COMPLETE IF THE PARTICIPANT IS UNDER THE AGE OF 18
    </p>
    <p>DATE OF BIRTH: __________________________________</p>
    <p>PARENT/GUARDIAN'S NAME: ____________________________</p>
    <p>PARENT/GUARDIAN SIGNATURE: ____________________________</p>
  </div>
</div>


    
    </div>
    </div>
    </div>
    </div>



    
  </div>


      {/* Main UI */}
      <div className="container">
        <div className="row">
          <div className="col-12 col-md-12 col-xl-7  mx-auto my-5">
            <div className="client-profile">
              <div>
                <h5 className="h5-heading">Account Details</h5>
                <div>
                  <img className="img-fluid my-3" src="/assets/img/Vector.png" alt="profile-img" />
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center gap-4">
                <div className="w-100 mb-3">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-control" value={`${customer.first_name} ${customer.last_name}`} readOnly />
                </div>
                <div className="w-100 mb-3">
                  <label className="form-label">Cell Phone</label>
                  <input type="text" className="form-control" value={customer.cell_phone ? `${customer.country_code || ''} ${formatPhone(customer.cell_phone)}` : 'Not available'} readOnly />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={customer.email} readOnly />
              </div>

              <div className="d-flex justify-content-between align-items-center gap-4 my-5">
                <div className="w-100">
                  <div className="d-flex gap-2 align-items-center">
                    <img src="/assets/img/Group 2493.png" alt="history icon" />
                    <div>Waiver history</div>
                  </div>
                </div>
                <div className="w-100 text-end">
                <button className="hide-btn" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? "Hide All" : "Show All"}
                </button>
              </div>

              </div>

              {showHistory && (
                <div className="w-100 w-md-75">
                  {waiverHistory.map((entry, index) => (
                    <div key={index} className={`my-4 ${index !== waiverHistory.length - 1 ? "border-bottom pb-3" : "pb-3"}`}>
                      <div className="d-flex justify-content-between gap-4 align-items-center">
                        <div className="d-flex gap-3 align-items-center">
                          <img src="/assets/img/Group 2465.png" alt="entry" />
                          <div>
                            <h6>{entry.name}</h6>
                            <p>{entry.date}</p>
                          </div>
                        </div>
                        <div>
                          <p><span>{entry.markedBy}</span></p>
                        </div>
                      </div>
                      <div className="w-100 text-end">
                        <button className="hide-btn" onClick={() => handleDownloadPDF(entry.id)}>Download PDF</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}


            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </>
  );
}

export default ProfilePage;
