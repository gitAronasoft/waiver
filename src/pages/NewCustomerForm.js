import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useMask } from "@react-input/mask";
import { countryCodes } from "../countryCodes";
import { BACKEND_URL } from "../config";
import { 
  setPhone, 
  setCustomerId, 
  setWaiverId, 
  setCustomerData, 
  setMinors,
  setCurrentStep,
  setViewMode 
} from "../store/slices/waiverSessionSlice";

function NewCustomerForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isChecked, setIsChecked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const cellPhoneRef = useMask({
    mask: "(___) ___-____",
    replacement: { _: /\d/ },
  });

  const stripMask = (val) => (val ? val.replace(/\D/g, "") : "");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (dobDate > today) {
        newErrors.dob = "Date of birth cannot be in the future";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email =
        "Please enter a valid email address (e.g., name@example.com)";
    }

    const phoneDigits = stripMask(formData.cell_phone);
    if (!phoneDigits) {
      newErrors.cell_phone = "Phone number is required";
    } else if (phoneDigits.length !== 10) {
      newErrors.cell_phone = "Phone number must be exactly 10 digits";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.province.trim()) {
      newErrors.province = "Province is required";
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = "Postal code is required";
    }

    if (formData.signing_for_minor && minorList.length > 0) {
      minorList.forEach((minor, index) => {
        if (!minor.first_name.trim()) {
          newErrors[`minor_${index}_first_name`] =
            `Minor ${index + 1} first name is required`;
        }
        if (!minor.last_name.trim()) {
          newErrors[`minor_${index}_last_name`] =
            `Minor ${index + 1} last name is required`;
        }
        if (!minor.dob) {
          newErrors[`minor_${index}_dob`] =
            `Minor ${index + 1} date of birth is required`;
        } else {
          const minorDobDate = new Date(minor.dob);
          const today = new Date();
          if (minorDobDate > today) {
            newErrors[`minor_${index}_dob`] =
              `Minor ${index + 1} date of birth cannot be in the future`;
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }; // remove formatting

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef(null);

  // Add this function to handle country selection
  const handleCountrySelect = (code) => {
    setFormData((prev) => ({
      ...prev,
      country_code: code,
    }));
    setIsDropdownOpen(false);
    setCountrySearch("");
  };

  // Filter countries based on search
  const filteredCountryCodes = countryCodes.filter(
    (country) =>
      country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.code.includes(countrySearch),
  );

  // Handle click outside and Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setCountrySearch("");
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        setCountrySearch("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isDropdownOpen]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    cell_phone: "",
    email: "",
    signing_for_minor: false,
    minors: [],
    country_code: "+1",
  });

  const [minorList, setMinorList] = useState([]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMinorChange = (index, field, value) => {
    const updated = [...minorList];
    updated[index][field] = value;
    setMinorList(updated);
  };

  const addMinor = () => {
    setMinorList([...minorList, { first_name: "", last_name: "", dob: "" }]);
  };

  const removeMinor = (index) => {
    const updated = [...minorList];
    updated.splice(index, 1);
    setMinorList(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      const firstErrorMessage =
        errors[firstErrorKey] || "Please correct the errors in the form";
      toast.error(firstErrorMessage);
      return;
    }

    setIsSubmitting(true);

    const cleanPhone = stripMask(formData.cell_phone);
    const phoneWithCode = `${formData.country_code}${cleanPhone}`;
    const fullData = {
      ...formData,
      cell_phone: cleanPhone,
      cc_cell_phone: phoneWithCode,
      minors: minorList,
      send_otp: isChecked,
    };

    try {
      const response = await axios.post(`${BACKEND_URL}/api/waivers`, fullData);
      const { waiverId, userId } = response.data;
      
      const phoneNumber = stripMask(formData.cell_phone);
      
      dispatch(setPhone(phoneNumber));
      dispatch(setCustomerId(userId));
      dispatch(setWaiverId(waiverId));
      dispatch(setViewMode(false));
      dispatch(setCustomerData({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postal_code,
        cell_phone: phoneNumber,
      }));
      dispatch(setMinors(minorList.map(m => ({ ...m, status: 1, checked: true }))));
      
      if (isChecked) {
        dispatch(setCurrentStep('OTP_VERIFICATION'));
        toast.success("Your information has been saved. Please check your phone for the verification code.");
        navigate("/otp-verified");
      } else {
        dispatch(setCurrentStep('SIGNATURE'));
        toast.success("Your information has been saved successfully.");
        navigate("/signature");
      }
    } catch (err) {
      if (err.response && err.response.data?.error) {
        toast.error(`${err.response.data.error}`);
      } else {
        console.error(err);
        toast.error("We couldn't submit your information. Please check the form and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="container text-center">
        <div className="row align-items-center">
          <div className="col-md-2">
            <div className="back-btn" style={{'margin-top': '0px'}}>
              <Link to="/">
                <img
                  className="img-fluid"
                  src="/assets/img/image 298.png"
                  alt="back-icon"
                />&nbsp;Back
              </Link>
            </div>
          </div>

          <div className="col-12 col-md-8 col-xl-8">
            <div className="step-two step-three">
              <div className="logo">
                <img
                  className="img-fluid"
                  src="/assets/img/logo.png"
                  alt="logo"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12 col-xl-10 mx-auto">
            <h3 className="h5-heading">Your details </h3>
            <form onSubmit={handleSubmit}>
              <div className="info-table w-100">
                <table cellPadding="8" cellSpacing="0">
                  <tbody>
                    <tr>
                      <td>
                        First Name:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                          className={`form-control ${errors.first_name ? "is-invalid" : ""}`}
                        />
                        {errors.first_name && (
                          <small className="text-danger">
                            {errors.first_name}
                          </small>
                        )}
                      </td>
                      <td>
                        Last Name:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                          className={`form-control ${errors.last_name ? "is-invalid" : ""}`}
                        />
                        {errors.last_name && (
                          <small className="text-danger">
                            {errors.last_name}
                          </small>
                        )}
                      </td>
                      <td>
                        DOB:<span className="required-star">*</span>
                        <br />
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          className={`form-control ${errors.dob ? "is-invalid" : ""}`}
                        />
                        {errors.dob && (
                          <small className="text-danger">{errors.dob}</small>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Address:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className={`form-control ${errors.address ? "is-invalid" : ""}`}
                        />
                        {errors.address && (
                          <small className="text-danger">
                            {errors.address}
                          </small>
                        )}
                      </td>
                      <td>
                        City:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          className={`form-control ${errors.city ? "is-invalid" : ""}`}
                        />
                        {errors.city && (
                          <small className="text-danger">{errors.city}</small>
                        )}
                      </td>
                      <td>
                        Province:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="province"
                          value={formData.province}
                          onChange={handleChange}
                          className={`form-control ${errors.province ? "is-invalid" : ""}`}
                        />
                        {errors.province && (
                          <small className="text-danger">
                            {errors.province}
                          </small>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td>
                        Postal Code:<span className="required-star">*</span>
                        <br />
                        <input
                          type="text"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleChange}
                          className={`form-control ${errors.postal_code ? "is-invalid" : ""}`}
                        />
                        {errors.postal_code && (
                          <small className="text-danger">
                            {errors.postal_code}
                          </small>
                        )}
                      </td>
                      {/* <td>
                        Cell Phone:<span className="required-star">*</span>
                        <br />
                        <input
                          ref={cellPhoneRef}
                          type="tel"
                          name="cell_phone"
                          value={formData.cell_phone}
                          onChange={handleChange}
                          className="form-control"
                          required
                        />
                      </td> */}

                      <td>
                        Cell Phone:<span className="required-star">*</span>
                        <br />
                        <div className="phone-input-group">
                          <div
                            className="custom-dropdown"
                            style={{ position: "relative" }}
                            ref={dropdownRef}
                          >
                            <div
                              className="form-select"
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                              style={{ cursor: "pointer" }}
                            >
                              {formData.country_code}
                            </div>
                            {isDropdownOpen && (
                              <div
                                className="dropdown-menu show"
                                style={{
                                  position: "absolute",
                                  maxHeight: "250px",
                                  overflowY: "auto",
                                  zIndex: 1000,
                                  width: "300px",
                                }}
                              >
                                <div
                                  style={{
                                    position: "sticky",
                                    top: 0,
                                    background: "white",
                                    padding: "8px",
                                    borderBottom: "1px solid #ddd",
                                  }}
                                >
                                  <input
                                    type="text"
                                    placeholder="Search country or code..."
                                    value={countrySearch}
                                    onChange={(e) =>
                                      setCountrySearch(e.target.value)
                                    }
                                    className="form-control form-control-sm"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                </div>
                                {filteredCountryCodes.length > 0 ? (
                                  filteredCountryCodes.map((c, index) => (
                                    <div
                                      key={index}
                                      className="dropdown-item"
                                      onClick={() =>
                                        handleCountrySelect(c.code)
                                      }
                                      style={{ cursor: "pointer" }}
                                    >
                                      {c.code} - {c.name}
                                    </div>
                                  ))
                                ) : (
                                  <div
                                    className="dropdown-item"
                                    style={{ color: "#999" }}
                                  >
                                    No countries found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <input
                            ref={cellPhoneRef}
                            type="tel"
                            name="cell_phone"
                            value={formData.cell_phone}
                            onChange={handleChange}
                            className={`form-control ${errors.cell_phone ? "is-invalid" : ""}`}
                          />
                        </div>
                        {errors.cell_phone && (
                          <small className="text-danger">
                            {errors.cell_phone}
                          </small>
                        )}
                      </td>

                      <td>
                        Email:<span className="required-star">*</span>
                        <br />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`form-control ${errors.email ? "is-invalid" : ""}`}
                        />
                        {errors.email && (
                          <small className="text-danger">{errors.email}</small>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-start my-4">
                <div className="d-flex align-items-center custom-radio-wrapper">
                  <h5>I'm signing on behalf of a minor or dependent</h5>
                  <label className="ms-3 d-flex align-items-center">
                    <input
                      type="radio"
                      name="signing_for_minor"
                      checked={formData.signing_for_minor === true}
                      onChange={() => {
                        setFormData((p) => ({ ...p, signing_for_minor: true }));
                        if (minorList.length === 0) {
                          setMinorList([
                            { first_name: "", last_name: "", dob: "" },
                          ]);
                        }
                      }}
                      style={{
                        width: "20px",
                        height: "20px",
                        cursor: "pointer",
                      }}
                    />{" "}
                    <span className="ms-2">Yes</span>
                  </label>
                  <label className="ms-3 d-flex align-items-center">
                    <input
                      type="radio"
                      name="signing_for_minor"
                      checked={formData.signing_for_minor === false}
                      onChange={() => {
                        setFormData((p) => ({
                          ...p,
                          signing_for_minor: false,
                        }));
                        setMinorList([]);
                      }}
                      style={{
                        width: "20px",
                        height: "20px",
                        cursor: "pointer",
                      }}
                    />{" "}
                    <span className="ms-2">No</span>
                  </label>
                </div>
              </div>

              {formData.signing_for_minor && (
                <>
                  {minorList.map((minor, index) => (
                    <div key={index} className="mb-3">
                      <div className="row g-2 align-items-start">
                        <div className="col-12 col-md-3">
                          <input
                            type="text"
                            className={`form-control ${errors[`minor_${index}_first_name`] ? "is-invalid" : ""}`}
                            placeholder="First Name"
                            value={minor.first_name}
                            onChange={(e) =>
                              handleMinorChange(
                                index,
                                "first_name",
                                e.target.value,
                              )
                            }
                            style={{
                              backgroundColor: "#e9ecef",
                              border: "none",
                              borderRadius: "8px",
                              padding: "12px 15px",
                            }}
                          />
                          {errors[`minor_${index}_first_name`] && (
                            <small className="text-danger d-block mt-1">
                              {errors[`minor_${index}_first_name`]}
                            </small>
                          )}
                        </div>
                        <div className="col-12 col-md-3">
                          <input
                            type="text"
                            className={`form-control ${errors[`minor_${index}_last_name`] ? "is-invalid" : ""}`}
                            placeholder="Last Name"
                            value={minor.last_name}
                            onChange={(e) =>
                              handleMinorChange(
                                index,
                                "last_name",
                                e.target.value,
                              )
                            }
                            style={{
                              backgroundColor: "#e9ecef",
                              border: "none",
                              borderRadius: "8px",
                              padding: "12px 15px",
                            }}
                          />
                          {errors[`minor_${index}_last_name`] && (
                            <small className="text-danger d-block mt-1">
                              {errors[`minor_${index}_last_name`]}
                            </small>
                          )}
                        </div>
                        <div className="col-12 col-md-3">
                          <input
                            type="date"
                            className={`form-control ${errors[`minor_${index}_dob`] ? "is-invalid" : ""}`}
                            value={minor.dob}
                            onChange={(e) =>
                              handleMinorChange(index, "dob", e.target.value)
                            }
                            style={{
                              backgroundColor: "#e9ecef",
                              border: "none",
                              borderRadius: "8px",
                              padding: "12px 15px",
                            }}
                          />
                          {errors[`minor_${index}_dob`] && (
                            <small className="text-danger d-block mt-1">
                              {errors[`minor_${index}_dob`]}
                            </small>
                          )}
                        </div>
                        <div className="col-12 col-md-3">
                          <button
                            type="button"
                            className="btn w-100"
                            onClick={() => removeMinor(index)}
                            style={{
                              backgroundColor: "#8F9090",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "12px 15px",
                              fontWeight: "500",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-end my-3">
                    <button
                      type="button"
                      onClick={addMinor}
                      className="btn"
                      style={{
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "12px 40px",
                        fontWeight: "500",
                        fontSize: "16px",
                      }}
                    >
                      Add another minor
                    </button>
                  </div>
                </>
              )}

              <div className="my-4">
                <div className="confirm-box text-start">
                  <label className="custom-checkbox-wrapper">
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={isChecked}
                      onChange={() => setIsChecked((prev) => !prev)}
                    />
                    <span className="custom-checkbox-label">
                      <h5>
                        Save time on your next visit! Use your phone number as a
                        reference for future waivers. Just check the box and
                        receive a quick validation text.
                      </h5>
                    </span>
                  </label>
                </div>
              </div>

              <div className="buttons mb-5">
                <button
                  type="submit"
                  className="btn btn-primary w-25"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Submitting...
                    </>
                  ) : (
                    "Next"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewCustomerForm;
