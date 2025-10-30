import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { BACKEND_URL } from '../config';

export default function FeedbackPage() {
  const query = new URLSearchParams(useLocation().search);
const userId = query.get('userId');
const feedbackId = query.get('feedbackId');

  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [issue, setIssue] = useState('');
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/feedback/rate/${userId}`)
      .then((res) => {
        const { first_name, last_name } = res.data;
        setCustomerName(`${first_name} ${last_name}`);
      })
      .catch((err) => console.error('Failed to fetch customer name:', err));
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${BACKEND_URL}/api/feedback/send-feedback`, {
        user_id: userId,
        rating: feedbackId,
        issue,
        staff_name: staffName,
        message: feedback
      });

      toast.success('Thank you for your feedback. We appreciate your input and will use it to improve our service.');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "We couldn't submit your feedback. Please try again later.");
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
