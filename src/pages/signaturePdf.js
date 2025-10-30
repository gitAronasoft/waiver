import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SignaturePad from "react-signature-canvas";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from 'react-toastify';
import html2pdf from "html2pdf.js";
import { getCurrentESTTime } from "../utils/time";



function Signature() {
  const location = useLocation();
  const navigate = useNavigate();
  const sigPadRef = useRef();
  const pdfRef = useRef();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [signatureImage, setSignatureImage] = useState(null);
  const [initials, setInitials] = useState("");
  const [customerData, setCustomerData] = useState(null);

  const customerType = location.state?.customerType || "existing";
  const phone = location.state?.phone;

  const [form, setForm] = useState({
    date: "",
    fullName: "",
    consented: false,
    subscribed: false,
    minors: [],
  });

  // Utility to persist form data
  const persistToLocalStorage = (updatedForm) => {
    localStorage.setItem(
      "signatureForm",
      JSON.stringify({
        form: updatedForm || form,
        initials,
        signatureImage,
      })
    );
  };

  // Load data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("signatureForm");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setForm(parsed.form || form);
      setInitials(parsed.initials || "");
      setSignatureImage(parsed.signatureImage || null);

      if (parsed.signatureImage && sigPadRef.current) {
        setTimeout(() => {
          sigPadRef.current.fromDataURL(parsed.signatureImage);
        }, 300);
      }
    }
  }, []);

  // Save data to localStorage whenever form/signature changes
  useEffect(() => {
    persistToLocalStorage();
  }, [form, initials, signatureImage]);

  // Fetch customer data only if no meaningful local data exists
  useEffect(() => {
    if (!phone) return;

    const savedData = localStorage.getItem("signatureForm");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      const hasData =
        parsed.form &&
        (parsed.form.fullName ||
          (parsed.form.minors && parsed.form.minors.length > 0));

      if (hasData) {
        console.log("Skipping fetch because saved data has content");
        return;
      }
    }

    console.log("LocalStorage empty, fetching customer data...");

    const fetchCustomer = async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/waivers/getminors?phone=${phone}`
        );
        const data = response.data;

        setCustomerData(data);
        setForm((prev) => ({
          ...prev,
          date: new Date().toISOString().split("T")[0],
          fullName: `${data.first_name} ${data.last_name}`,
          minors: (data.minors || []).map((m) => ({
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            dob: m.dob ? new Date(m.dob).toISOString().split("T")[0] : "",
            checked: m.status === 1,
            isNew: false,
          })),
        }));
      } catch (error) {
        console.error("Failed to fetch customer data:", error);
        toast.error("Failed to load customer data.");
      }
    };

    fetchCustomer();
  }, [phone]);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    const updated = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };
    setForm(updated);
    persistToLocalStorage(updated);
  };

  const handleMinorChange = (index, field, value) => {
    const minors = [...form.minors];
    minors[index][field] = value;
    const updated = { ...form, minors };
    setForm(updated);
    persistToLocalStorage(updated);
  };

  const handleMinorCheckbox = (index) => {
    const minors = [...form.minors];
    minors[index].checked = !minors[index].checked;
    const updated = { ...form, minors };
    setForm(updated);
    persistToLocalStorage(updated);
  };

  const handleAddMinor = () => {
    const updated = {
      ...form,
      minors: [
        ...form.minors,
        { first_name: "", last_name: "", dob: "", checked: false, isNew: true },
      ],
    };
    setForm(updated);
    persistToLocalStorage(updated);
  };

  const handleRemoveMinor = (index) => {
    const minors = [...form.minors];
    minors.splice(index, 1);
    const updated = { ...form, minors };
    setForm(updated);
    persistToLocalStorage(updated);
  };

  const handleClearSignature = () => {
    sigPadRef.current.clear();
    setSignatureImage(null);
    persistToLocalStorage();
  };

  const handleSubmit = async () => {
    if (!form.consented || sigPadRef.current.isEmpty()) {
      toast.error("Please agree to the terms and provide a signature.");
      return;
    }

    // const signatureData = sigPadRef.current.getCanvas().toDataURL("image/png");
    const signatureData = sigPadRef.current.getCanvas().toDataURL("image/jpeg", 0.6); // ✅ Compress signature

    setSignatureImage(signatureData);
    localStorage.setItem(
      "signatureForm",
      JSON.stringify({ form, initials, signatureImage: signatureData })
    );

    const payload = {
      id: customerData?.id,
      phone,
      date: form.date,
      fullName: form.fullName,
      minors: form.minors,
      subscribed: form.subscribed,
      consented: form.consented,
      signature: signatureData,
    };

    try {
      await axios.post(`${BACKEND_URL}/api/waivers/save-signature`, payload);
      await generatePDF();
      toast.success("Signature submitted and PDF downloaded.");
      navigate("/rules", {
        state: { userId: customerData?.id, phone, customerType },
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save signature.");
    }
  };


  //generatePDF with html 
  // const generatePDF = () => {
  //   const element = pdfRef.current;
  //    const signedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");      // ✅ EST Time
  // const generatedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");   // ✅ EST Time

  //   const footerDiv = document.createElement("div");
  //   footerDiv.style.textAlign = "center";
  //   footerDiv.style.fontSize = "12px";
  //   footerDiv.style.marginTop = "20px";
  //   footerDiv.innerHTML = `
  //     <p><strong>Signed on:</strong> ${signedDate}</p>
  //     <p><strong>PDF Generated on:</strong> ${generatedDate}</p>
  //   `;
  //   element.appendChild(footerDiv);

  //   const elementsToHide = element.querySelectorAll(".no-print");
  //   elementsToHide.forEach((el) => (el.style.display = "none"));

  //   const opt = {
  //     margin: [10, 10],
  //     filename: "waiver-form.pdf",
  //     image: { type: "jpeg", quality: 1.0 },
  //     html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
  //     jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  //     pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  //   };

  //   html2pdf()
  //     .set(opt)
  //     .from(element)
  //     .save()
  //     .then(() => {
  //       footerDiv.remove();
  //       elementsToHide.forEach((el) => (el.style.display = ""));
  //     });
  // };

// const generatePDF = async () => {
//   const input = pdfRef.current;

//   // Get EST time for footer
// //   const signedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");
// //   const generatedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");

// //   // Footer
// //   const footerDiv = document.createElement("div");
// //   footerDiv.style.textAlign = "center";
// //   footerDiv.style.fontSize = "12px";
// //   footerDiv.style.marginTop = "20px";
// //   footerDiv.innerHTML = `
// //     <p><strong>Signed on:</strong> ${signedDate}</p>
// //     <p><strong>PDF Generated on:</strong> ${generatedDate}</p>
// //   `;
// //   input.appendChild(footerDiv);

// const signedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");
// const generatedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");

// // Example dynamic values — replace with actual form values
// const printedName = form.fullName || "_____________________";
// const dob = customerData?.dob?.split("T")[0] || "_____________________";

// const footerDiv = document.createElement("div");
// footerDiv.style.fontSize = "12px";
// footerDiv.style.marginTop = "40px";
// footerDiv.style.borderTop = "1px solid #000";
// footerDiv.style.paddingTop = "10px";
// footerDiv.style.lineHeight = "1.6";
// footerDiv.innerHTML = `
//   <div style="text-align: center;">
//     <p><strong>Signed on:</strong> ${signedDate}</p>
//     <p><strong>PDF Generated on:</strong> ${generatedDate}</p>
//   </div>

//   <div style="font-family: Arial, sans-serif; font-size: 14px; max-width: 800px; margin: 20px auto;">

//   <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
//     <div style="width: 48%;">
//       <label>DATE__________________________________</label>
//       <div style="margin-top: 30px;">__________________________________<br><small>Signature</small></div>
//       <div style="margin-top: 30px;">__________________________________<br><small>Printed Name</small></div>
//     </div>
//     <div style="width: 48%;">
//       <br>
//       <div>__________________________________<br><small>Signature or Witness</small></div>
//       <div style="margin-top: 30px;">__________________________________<br><small>Printed Name or Witness</small></div>
//     </div>
//   </div>

//   <div style="border: 1px solid black; padding: 10px;">
//     <p style="font-weight: bold; text-align: center;">PLEASE COMPLETE IF THE PARTICIPANT IS UNDER THE AGE OF 18</p>
//     <p>DATE OF BIRTH: __________________________________</p>
//     <p>PARENT/GUARDIAN'S NAME: ____________________________</p>
//     <p>PARENT/GUARDIAN SIGNATURE: ____________________________</p>
//   </div>

// </div>

// `;

// input.appendChild(footerDiv);


//   // Hide non-printable elements
//   const elementsToHide = input.querySelectorAll(".no-print");
//   elementsToHide.forEach(el => el.style.display = "none");

// // Wait a short tick to allow re-render
// await new Promise((resolve) => setTimeout(resolve, 200));

//   try {
//     const canvas = await html2canvas(input, {
//       scale: 2,
//       useCORS: true,
//       scrollY: -window.scrollY,
//     });

//     const pdf = new jsPDF("p", "mm", "a4");

//     const margin = 10;
//     const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
//     const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
//     const usableWidth = pageWidth - margin * 2;
//     const usableHeight = pageHeight - margin * 2;

//     const imgWidth = usableWidth;
//     const imgHeight = (canvas.height * imgWidth) / canvas.width;

//     const pageCanvasHeight = (usableHeight * canvas.width) / imgWidth; // slice height in px

//     let renderedHeight = 0;
//     let pageIndex = 0;

//     while (renderedHeight < canvas.height) {
//       const pageCanvas = document.createElement("canvas");
//       pageCanvas.width = canvas.width;
//       pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

//       const context = pageCanvas.getContext("2d");
//       context.drawImage(
//         canvas,
//         0,
//         renderedHeight,
//         canvas.width,
//         pageCanvas.height,
//         0,
//         0,
//         canvas.width,
//         pageCanvas.height
//       );

//       const pageData = pageCanvas.toDataURL("image/png");
//       if (pageIndex > 0) pdf.addPage();
//       pdf.addImage(pageData, "PNG", margin, margin, imgWidth, (pageCanvas.height * imgWidth) / canvas.width);

//       renderedHeight += pageCanvasHeight;
//       pageIndex++;
//     }

//     pdf.save("SKAT&PLAY.pdf");
//   } catch (err) {
//     console.error("PDF generation failed", err);
//     toast.error("Failed to generate PDF.");
//   } finally {
//     // Restore UI
//     footerDiv.remove();
//     elementsToHide.forEach(el => el.style.display = "");
//   }
// };


const generatePDF = async () => {
  const input = pdfRef.current;

  // Prepare timestamp values (in EST)
  const signedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");
  const generatedDate = getCurrentESTTime("YYYY-MM-DD hh:mm A");

  // Add a footer for signature and metadata
  const footerDiv = document.createElement("div");
  footerDiv.style.fontSize = "12px";
  footerDiv.style.marginTop = "40px";
  footerDiv.style.borderTop = "1px solid #000";
  footerDiv.style.paddingTop = "10px";
  footerDiv.style.lineHeight = "1.6";
  footerDiv.innerHTML = `
    <div style="text-align: center;">
      <p><strong>Signed on:</strong> ${signedDate}</p>
      <p><strong>PDF Generated on:</strong> ${generatedDate}</p>
    </div>

    <div style="font-family: Arial, sans-serif; font-size: 14px; max-width: 800px; margin: 20px auto;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div style="width: 48%;">
          <label>DATE__________________________________</label>
          <div style="margin-top: 30px;">__________________________________<br><small>Signature</small></div>
          <div style="margin-top: 30px;">${form.fullName || "_____________________"}<br><small>Printed Name</small></div>
        </div>
        <div style="width: 48%;">
          <br>
          <div>__________________________________<br><small>Signature or Witness</small></div>
          <div style="margin-top: 30px;">__________________________________<br><small>Printed Name or Witness</small></div>
        </div>
      </div>

      <div style="border: 1px solid black; padding: 10px;">
        <p style="font-weight: bold; text-align: center;">PLEASE COMPLETE IF THE PARTICIPANT IS UNDER THE AGE OF 18</p>
        <p>DATE OF BIRTH: ${customerData?.dob?.split("T")[0] || "_____________________"}</p>
        <p>PARENT/GUARDIAN'S NAME: ____________________________</p>
        <p>PARENT/GUARDIAN SIGNATURE: ____________________________</p>
      </div>
    </div>
  `;

  input.appendChild(footerDiv);

  // Hide elements not for print
  const elementsToHide = input.querySelectorAll(".no-print");
  elementsToHide.forEach(el => el.style.display = "none");

  // Wait a short tick to allow DOM changes to apply
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    const canvas = await html2canvas(input, {
      scale: 1, // ✅ reduced from 2
      useCORS: true,
      scrollY: -window.scrollY,
    });

    const pdf = new jsPDF("p", "mm", "a4");

    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pageCanvasHeight = (usableHeight * canvas.width) / imgWidth; // height in canvas pixels

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

      const pageData = pageCanvas.toDataURL("image/jpeg", 0.7); // ✅ use JPEG with 70% quality

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(pageData, "JPEG", margin, margin, imgWidth, (pageCanvas.height * imgWidth) / canvas.width, undefined, 'FAST'); // ✅ 'FAST' compression

      renderedHeight += pageCanvasHeight;
      pageIndex++;
    }

    pdf.save("SKATE_AND_PLAY_Waiver.pdf");
  } catch (err) {
    console.error("PDF generation failed", err);
    toast.error("Failed to generate PDF.");
  } finally {
    // Restore DOM
    footerDiv.remove();
    elementsToHide.forEach(el => el.style.display = "");
  }
};


  // if (!customerData) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid" ref={pdfRef}>
      <div className="container">
        <div className="row">
          <div className="col-md-2">
            {/* <div className="back-btn">
              <a href="/existing-customer">
                <img src="/assets/img/image 298.png" className="img-fluid" alt="back" /> BACK
              </a>
            </div> */}
                      <div className="back-btn no-print" style={{ cursor: "pointer" }} onClick={() => {
                        if (customerType === "new") {
                          navigate("/verify-otp", { state: { phone, customerType } });
                        } else {
                          navigate("/confirm-info", { state: { phone, customerType } });
                        }
                      }}>
                         
                        <img src="/assets/img/image 298.png" className="img-fluid" alt="back" /> BACK
                       
                      </div>
          </div>



          <div className="col-12 col-md-8 col-xl-8">
            <div className="step-two step-three">
              <div className="logo">
                <img
                  src="/assets/img/logo.png"
                  className="img-fluid"
                  alt="logo"
                />
              </div>
              <h5 className="h5-heading my-3 mt-3 text-center">
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


                        {customerData && (
  <div className="info-table w-100 border p-3 my-4" style={{ fontSize: "14px" }}>
    <table cellPadding="8" cellSpacing="0" className="w-100">
      <tbody>
        <tr>
          <td><strong>Participant First Name:</strong><br /> <span> {customerData.first_name} </span> </td>
          <td><strong>Participant Last Name:</strong><br /> <span> {customerData.last_name } </span></td>
          <td><strong>Middle Initial:</strong><br /> <span>{customerData.middle_initial || 'None'} </span> </td>
          <td><strong>Date of Birth:</strong><br /> <span>{customerData.dob?.split("T")[0]} </span> </td>
          <td><strong>Age:</strong><br /> <span> {customerData.age || '--'} </span></td>
        </tr>
        <tr>
          <td colSpan="2"><strong>Address:</strong><br /> <span> {customerData.address} </span></td>
          <td><strong>City:</strong><br /> <span> {customerData.city} </span></td>
          <td><strong>Province:</strong><br /> <span>{customerData.province} </span></td>
          <td><strong>Postal Code:</strong><br /> <span>{customerData.postal_code} </span></td>
        </tr>
        <tr>
          <td><strong>Home Phone:</strong><br /> <span> {customerData.home_phone} </span></td>
          <td><strong>Cell Phone:</strong><br /> <span> {customerData.cell_phone} </span></td>
          <td><strong>Work Phone:</strong><br /> <span> {customerData.work_phone} </span></td>
          <td><strong>Email:</strong><br /> <span> {customerData.email || '--'} </span></td>
          <td>
            <strong>Can we email?</strong><br /> <span>
            {customerData.can_email ? 'Yes' : 'No'}  </span>
          </td>
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
                          

                           

                                <p class="my-4"> <strong>{form.fullName || "_______"}</strong>&nbsp;&nbsp;  I agree that I will be responsible for property damage as a result of any unauthorized activity. </p>
                           

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
event of death, injury or incapacity. </p><br></br><br></br>

                            <p> Any litigation involving the parties to this document shall be brought solely within the Province of Ontario and shall be within the 
exclusive jurisdiction of the Courts residing in the City of Ottawa. </p>

                            <p class="my-4"><strong>{form.fullName || "_______"}</strong>&nbsp;&nbsp; <strong>  PHOTOGRAPH / VIDEO RELEASEInitial</strong>&nbsp;&nbsp;   I consent to photographs and videos being taken of me during my 
participation at SPI, and to the publication of the photographs and videos for advertising, promotional, and marketing purposes. I 
waive any and all claims against SPI arising out of SPI’s use of my photographic or video representation of me, including claims 
relating to defamation or invasion of any copyright, privacy, personality or publicity rights. I agree not to claim compensation from 
SPI for the use of photographic or video representation of me during my participation in SPI’s Activities. 
 </p>

                            <p class="my-4"><strong>{form.fullName || "_______"}</strong>&nbsp;&nbsp;  You agree that skating while under the influence of alcohol or any other drugs is strictly prohibited, as it significantly 
increases the risk of injury to yourself and others.  </p>

  <p class="my-4"><strong>{form.fullName || "_______"}</strong>&nbsp;&nbsp;  We encourage everyone to wear protective gear. You understand that Skate & Play Inc. has encouraged you to wear 
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

            {form.minors.map((minor, index) => (
              <div key={index} className="minor-group d-flex gap-3 align-items-center my-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Minor First Name"
                  value={minor.first_name}
                  onChange={(e) => handleMinorChange(index, "first_name", e.target.value)}
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
                  value={minor.last_name}
                  onChange={(e) => handleMinorChange(index, "last_name", e.target.value)}
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
                  value={minor.dob}
                  onChange={(e) => handleMinorChange(index, "dob", e.target.value)}
                  style={{
                    border: '2px solid #333',
                    padding: '12px 15px',
                    fontSize: '16px',
                    borderRadius: '8px'
                  }}
                />
                <button type="button" className="btn btn-danger no-print" onClick={() => handleRemoveMinor(index)}>
                  Remove
                </button>
              </div>
            ))}

            <button className="btn btn-secondary my-3 no-print" onClick={handleAddMinor} style={{
              padding: '10px 20px',
              fontSize: '16px'
            }}>
              Add another minor
            </button>

              {/* <div className="mt-3 mb-4 no-print">
                <label>
                  <input
                    type="checkbox"
                    name="subscribed"
                    checked
                    onChange={handleChange}
                  />{" "}
                  I would like to subscribe to updates from Elevation Trampoline South Shore
                </label>
              </div> */}



            <div className="confirm-box mt-4 mb-3 no-print">
              <label className="custom-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  name="consented"
                  checked={form.consented}
                  onChange={handleChange}
                />
                <span className="custom-checkbox-label">
                  <h5>
                    By checking this box, you confirm signing for yourself and all listed minors or
                    dependents above, as of the provided date.
                  </h5>
                </span>
              </label>
            </div>

            <div className="signature-section mx-auto w-50 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div class="no-print">Please sign here:</div>
                <div  class="no-print" style={{ cursor: "pointer", color: "red" }} onClick={handleClearSignature}>
                  ✕ Clear
                </div>
              </div>

              <SignaturePad
                ref={sigPadRef}
                canvasProps={{ width: 500, height: 150, className: "border" }}
              />

       

              <div>
                <button className="btn btn-primary no-print" onClick={handleSubmit}>
                  Accept and Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signature;
