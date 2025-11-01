import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import UserHeader from "../components/UserHeader";
import { setCurrentStep, setCustomerData, setMinors, setProgress } from "../store/slices/waiverSessionSlice";

function ConfirmCustomerInfo() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const phone = useSelector((state) => state.waiverSession.phone);
  const customerId = useSelector((state) => state.waiverSession.customerId);
  const waiverId = useSelector((state) => state.waiverSession.waiverId);

  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [originalMinors, setOriginalMinors] = useState([]);

  // Route protection: Redirect if accessed directly without valid state
  useEffect(() => {
    if (!phone && !customerId && !waiverId) {
      console.warn("No phone, customerId, or waiverId found in state, redirecting to home");
      navigate("/", { replace: true });
    }
  }, [phone, customerId, waiverId, navigate]);
  const [minorList, setMinorList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minorErrors, setMinorErrors] = useState({});

  // Get Redux data at component top level
  const reduxCustomerData = useSelector((state) => state.waiverSession.customerData);
  const reduxMinors = useSelector((state) => state.waiverSession.minors);

  useEffect(() => {
    // Use data from Redux that was already fetched after login
    if (reduxCustomerData && reduxCustomerData.id) {
      console.log('📊 Using cached data from Redux');
      
      // Format phone numbers for display
      const formatPhone = (num) => {
        if (!num) return "";
        const digits = num.replace(/\D/g, "").slice(0, 10);
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return digits;
      };

      const formattedData = {
        ...reduxCustomerData,
        home_phone: formatPhone(reduxCustomerData.home_phone),
        cell_phone: formatPhone(reduxCustomerData.cell_phone),
        work_phone: formatPhone(reduxCustomerData.work_phone),
        dob: reduxCustomerData.dob ? new Date(reduxCustomerData.dob).toISOString().split("T")[0] : "",
        can_email: reduxCustomerData.can_email === 1 || reduxCustomerData.can_email === "1",
      };

      setFormData(formattedData);
      
      if (waiverId) {
        setOriginalData(JSON.parse(JSON.stringify(formattedData)));
      }

      // Set minors from Redux
      if (reduxMinors && reduxMinors.length > 0) {
        const minorsWithFlags = reduxMinors.map((minor) => ({
          ...minor,
          dob: minor.dob ? new Date(minor.dob).toISOString().split("T")[0] : "",
          checked: minor.checked !== undefined ? minor.checked : true,
          isNew: minor.isNew || false,
        }));
        setMinorList(minorsWithFlags);
        
        if (waiverId) {
          setOriginalMinors(JSON.parse(JSON.stringify(minorsWithFlags)));
        }
      }
      
      setLoading(false);
    } else {
      // If Redux data is missing, redirect to login to fetch it again
      console.warn("No customer data in Redux, redirecting to login");
      toast.error("Session expired. Please log in again.");
      navigate("/login", { replace: true });
    }
  }, [reduxCustomerData, reduxMinors, waiverId, navigate, dispatch]);

  // const handleChange = (e) => {
  //   const { name, value, type } = e.target;
  //   setFormData((prev) => ({
  //     ...prev,
  //     [name]: type === "number" ? Number(value) : value,
  //   }));
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ If it's a phone → only store masked for UI
    if (["cell_phone"].includes(name)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateMinorField = (index, field, value) => {
    const errorKey = `${index}_${field}`;
    const errors = { ...minorErrors };

    if (field === "first_name" || field === "last_name") {
      if (!value || value.trim() === "") {
        errors[errorKey] = `This field is required`;
      } else if (value.trim().length < 2) {
        errors[errorKey] = `Must be at least 2 characters`;
      } else {
        delete errors[errorKey];
      }
    } else if (field === "dob") {
      if (!value) {
        errors[errorKey] = "This field is required";
      } else {
        const dobDate = new Date(value);
        const today = new Date();
        if (dobDate > today) {
          errors[errorKey] = "Date cannot be in the future";
        } else {
          delete errors[errorKey];
        }
      }
    }

    setMinorErrors(errors);
  };

  const handleMinorChange = (index, field, value) => {
    const updated = [...minorList];
    updated[index][field] = value;
    setMinorList(updated);

    // Validate all minors when editing
    if (updated[index].isNew) {
      validateMinorField(index, field, value);
    }
  };

  const validateAllNewMinors = () => {
    const errors = {};
    minorList.forEach((minor, index) => {
      if (minor.isNew) {
        if (!minor.first_name || minor.first_name.trim() === "") {
          errors[`${index}_first_name`] = "This field is required";
        }
        if (!minor.last_name || minor.last_name.trim() === "") {
          errors[`${index}_last_name`] = "This field is required";
        }
        if (!minor.dob) {
          errors[`${index}_dob`] = "This field is required";
        }
      }
    });
    setMinorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const removeMinor = (index) => {
    const updated = [...minorList];
    updated.splice(index, 1);
    setMinorList(updated);

    // Clear validation errors for removed minor and reindex errors
    const newErrors = {};
    Object.keys(minorErrors).forEach((key) => {
      const [errorIndex, field] = key.split("_");
      const idx = parseInt(errorIndex);
      if (idx < index) {
        newErrors[key] = minorErrors[key];
      } else if (idx > index) {
        newErrors[`${idx - 1}_${field}`] = minorErrors[key];
      }
    });
    setMinorErrors(newErrors);
  };

  // Function to detect if any modifications were made
  const hasModifications = () => {
    // Only check modifications when we loaded from a waiver (editing to create new)
    if (!waiverId || !originalData || !originalMinors) {
      return false;
    }

    // Check for new minors added
    const newMinorsAdded = minorList.some(m => m.isNew);
    if (newMinorsAdded) return true;

    // Check if number of minors changed
    if (minorList.length !== originalMinors.length) return true;

    // Check for changes in minor checked status or data
    for (let i = 0; i < minorList.length; i++) {
      const current = minorList[i];
      const original = originalMinors.find(m => m.id === current.id);
      
      if (!original) return true; // Minor was removed or added
      
      // Check if checked status changed (convert to boolean for comparison)
      const currentChecked = Boolean(current.checked);
      const originalChecked = Boolean(original.checked);
      if (currentChecked !== originalChecked) return true;
      
      // Check if minor data changed (shouldn't happen as fields are readonly, but checking anyway)
      if (current.first_name !== original.first_name ||
          current.last_name !== original.last_name ||
          current.dob !== original.dob) {
        return true;
      }
    }

    // Check for changes in customer data
    if (formData.first_name !== originalData.first_name ||
        formData.last_name !== originalData.last_name ||
        formData.email !== originalData.email ||
        formData.dob !== originalData.dob ||
        formData.address !== originalData.address ||
        formData.city !== originalData.city ||
        formData.province !== originalData.province ||
        formData.postal_code !== originalData.postal_code) {
      return true;
    }

    return false;
  };

  const goToSignature = async () => {
    // Validate all new minors and show errors
    const isValid = validateAllNewMinors();
    if (!isValid) {
      toast.error("Please complete all required information for each minor.");
      return;
    }

    // Validate dates are not in the future
    const newMinors = minorList.filter((minor) => minor.isNew);
    const minorsWithFutureDOB = newMinors.filter((minor) => {
      if (!minor.dob) return false;
      const dobDate = new Date(minor.dob);
      const today = new Date();
      return dobDate > today;
    });

    if (minorsWithFutureDOB.length > 0) {
      toast.error("Please enter a valid date of birth for each minor. Future dates are not allowed.");
      return;
    }

    // Directly proceed to signature page without confirmation
    const isModified = hasModifications();
    const stripMask = (val) => (val ? val.replace(/\D/g, "") : "");
    const updatedData = {
      ...formData,
      id: formData.id || customerId,
      cell_phone: stripMask(formData.cell_phone),
      minors: minorList.map((minor) => ({
        id: minor.id,
        first_name: minor.first_name,
        last_name: minor.last_name,
        dob: minor.dob,
        isNew: minor.isNew,
        checked: minor.checked,
      })),
    };

    // Store flag in Redux so SignaturePage can check it (no database update here)
    if (isModified) {
      dispatch(setProgress({ hasDataModifications: true }));
      console.log("✅ Modifications detected, flagged for signature page to update database");
    } else {
      dispatch(setProgress({ hasDataModifications: false }));
    }

    // Save customer data and minors to Redux so signature page can use them
    dispatch(setCustomerData(updatedData));
    dispatch(setMinors(updatedData.minors));
    dispatch(setCurrentStep('SIGNATURE'));
    navigate("/sign-waiver", { replace: true });
  };

  const handleMinorCheckChange = (index, checked) => {
    const updated = [...minorList];
    updated[index] = {
      ...updated[index],
      checked: checked
    };
    setMinorList(updated);
    // Update Redux immediately so signature page reflects changes
    dispatch(setMinors(updated));
  };

  if (loading || !formData) {
    return <div className="text-center mt-5">Loading customer info...</div>;
  }

  return (
    <>
      <UserHeader />
      <div className="container-fluid">
        <div className="container text-center">
        <div className="row">
          <div className="col-md-12 col-xl-10 mx-auto">
            <h3 className="h5-heading">
              Please confirm that all information below is still accurate
            </h3>

            <form>
              <div className="info-table w-100">
                <table cellPadding="8" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td>
                        Participant First Name:
                        <br />
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                      <td>
                        Participant Last Name:
                        <br />
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>

                      <td>
                        Date of Birth:
                        <br />
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Address:
                        <br />
                        <input
                          type="text"
                          name="address"
                          value={formData.address || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                      <td>
                        City:
                        <br />
                        <input
                          type="text"
                          name="city"
                          value={formData.city || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                      <td>
                        Province:
                        <br />
                        <input
                          type="text"
                          name="province"
                          value={formData.province || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Postal Code:
                        <br />
                        <input
                          type="text"
                          name="postal_code"
                          value={formData.postal_code || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                      {/* <td>
                        Cell Phone:<br />
                        <input
                          ref={cellPhoneRef}
                          type="tel"
                          name="cell_phone"
                          value={`${formData.country_code} ${formData.cell_phone}` || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                        />
                      </td> */}

                      <td>
                        Cell Phone:
                        <br />
                        <input
                          type="tel"
                          name="cell_phone"
                          value={
                            formData.country_code && formData.cell_phone
                              ? `${formData.country_code} ${formData.cell_phone}`.trim()
                              : formData.cell_phone || ""
                          }
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>

                      <td>
                        Email:
                        <br />
                        <input
                          type="email"
                          name="email"
                          value={formData.email || ""}
                          onChange={handleChange}
                          className="form-control"
                          readOnly
                          style={{
                            backgroundColor: "#e9ecef",
                            cursor: "not-allowed",
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ✅ Minor Section */}
              <div className="minor-section my-4 text-start w-100">
                <h5
                  className="mb-4"
                  style={{ fontWeight: "700", fontSize: "18px" }}
                >
                  Please check mark to sign on behalf of the below minor or
                  dependent
                </h5>

                {minorList.map((minor, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-start gap-3 mb-3 minor-form-enter"
                    style={{ width: "100%" }}
                  >
                    <div style={{ paddingTop: "8px" }}>
                      <input
                        type="checkbox"
                        checked={!!minor.checked}
                        onChange={(e) => handleMinorCheckChange(index, e.target.checked)}
                        className="custom-checkbox"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>

                    <div
                      style={{
                        flex: "1",
                        display: "flex",
                        gap: "12px",
                        alignItems: "start",
                      }}
                    >
                      <div style={{ flex: "1 0 33%" }}>
                        <input
                          type="text"
                          className={`form-control ${minorErrors[`${index}_first_name`] ? "is-invalid" : ""}`}
                          placeholder="First Name"
                          value={minor.first_name}
                          onChange={(e) =>
                            handleMinorChange(
                              index,
                              "first_name",
                              e.target.value,
                            )
                          }
                          readOnly={!minor.isNew}
                          style={{
                            backgroundColor: "#e9ecef",
                            border: "1px solid #dee2e6",
                            padding: "10px 12px",
                            cursor: minor.isNew ? "text" : "not-allowed",
                            borderRadius: "4px",
                          }}
                        />
                        {minorErrors[`${index}_first_name`] && (
                          <div className="text-danger small mt-1">
                            {minorErrors[`${index}_first_name`]}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: "1 0 33%" }}>
                        <input
                          type="text"
                          className={`form-control ${minorErrors[`${index}_last_name`] ? "is-invalid" : ""}`}
                          placeholder="Last Name"
                          value={minor.last_name}
                          onChange={(e) =>
                            handleMinorChange(
                              index,
                              "last_name",
                              e.target.value,
                            )
                          }
                          readOnly={!minor.isNew}
                          style={{
                            backgroundColor: "#e9ecef",
                            border: "1px solid #dee2e6",
                            padding: "10px 12px",
                            cursor: minor.isNew ? "text" : "not-allowed",
                            borderRadius: "4px",
                          }}
                        />
                        {minorErrors[`${index}_last_name`] && (
                          <div className="text-danger small mt-1">
                            {minorErrors[`${index}_last_name`]}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: "1" }}>
                        <input
                          type="date"
                          className={`form-control ${minorErrors[`${index}_dob`] ? "is-invalid" : ""}`}
                          placeholder="dd-mm-yyyy"
                          value={minor.dob}
                          onChange={(e) =>
                            handleMinorChange(index, "dob", e.target.value)
                          }
                          readOnly={!minor.isNew}
                          style={{
                            backgroundColor: "#e9ecef",
                            border: "1px solid #dee2e6",
                            padding: "10px 12px",
                            cursor: minor.isNew ? "text" : "not-allowed",
                            borderRadius: "4px",
                          }}
                        />
                        {minorErrors[`${index}_dob`] && (
                          <div className="text-danger small mt-1">
                            {minorErrors[`${index}_dob`]}
                          </div>
                        )}
                      </div>

                      {minor.isNew && (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => removeMinor(index)}
                          style={{
                            backgroundColor: "#6c757d",
                            color: "white",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            border: "none",
                            fontSize: "14px",
                            fontWeight: "500",
                            whiteSpace: "nowrap",
                            minWidth: "90px",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      setMinorList([
                        ...minorList,
                        {
                          first_name: "",
                          last_name: "",
                          dob: "",
                          checked: true,
                          isNew: true,
                        },
                      ])
                    }
                    style={{
                      backgroundColor: "#007bff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px 40px",
                      fontSize: "16px",
                      fontWeight: "500",
                      minWidth: "200px",
                    }}
                  >
                    Add another minor
                  </button>
                  <span className="fw-bold" style={{ fontSize: "18px" }}>
                    or
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={goToSignature}
                    style={{
                      backgroundColor: "#007bff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px 40px",
                      fontSize: "16px",
                      fontWeight: "500",
                      minWidth: "200px",
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>           
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default ConfirmCustomerInfo;
