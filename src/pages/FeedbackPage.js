import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { BACKEND_URL } from '../config';

export default function FeedbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { token, rating, customerName } = location.state || {};

  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [issue, setIssue] = useState('');
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stars] = useState(rating || 0);

  useEffect(() => {
    if (!token || !rating) {
      toast.error('Invalid feedback session. Please use the link from your email or SMS.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [token, rating, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${BACKEND_URL}/api/rating/submit-feedback`, {
        token,
        rating,
        issue,
        staff_name: staffName,
        message: feedback
      });

      toast.success('Thank you for your valuable feedback! We appreciate your input and will use it to improve our service.');
      setSubmitted(true);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "We couldn't submit your feedback. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} />
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8">
              <div className="p-4 bg-white rounded shadow-sm">
                <img
                  className="img-fluid mb-3"
                  src="/assets/img/logo.png"
                  alt="logo"
                  style={{ maxWidth: '200px' }}
                />
                <h5 className="mb-3">Hi {customerName},</h5>
                {!submitted ? (
                  <>
                    <h4>We’re sorry your experience wasn’t perfect</h4>
                    <p className="mb-1">You rated your visit: {stars} {stars === 1 ? 'star' : 'stars'} ⭐</p>
                    <p>Please let us know what we could do better:</p>
                    <form onSubmit={handleSubmit}>
                      <div className="mb-3 text-start">
                        <label htmlFor="issue" className="form-label">
                          What was wrong?
                        </label>
                        <select
                          id="issue"
                          className="form-select"
                          value={issue}
                          onChange={(e) => setIssue(e.target.value)}
                          required
                        >
                          <option value="">Select an issue</option>
                          <option value="Long wait time">Long wait time</option>
                          <option value="Rude staff">Rude staff</option>
                          <option value="Unclean facility">Unclean facility</option>
                          <option value="Safety concern">Safety concern</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="mb-3 text-start">
                        <label htmlFor="staffName" className="form-label">
                          Staff Name (optional)
                        </label>
                        <input
                          id="staffName"
                          className="form-control"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          placeholder="Enter staff name if known"
                        />
                      </div>

                      <div className="mb-3 text-start">
                        <label htmlFor="comments" className="form-label">
                          Additional Comments
                        </label>
                        <textarea
                          id="comments"
                          className="form-control"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows="5"
                          required
                        />
                      </div>

                      <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Feedback"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h4 className="text-success mb-3">Thank You!</h4>
                    <p>Your feedback helps us improve your experience.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
