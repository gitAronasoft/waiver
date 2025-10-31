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
      toast.error('Invalid feedback session. Please use the link from your email or SMS.', {
        autoClose: 4000
      });
      setTimeout(() => {
        navigate('/');
      }, 4000);
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

      toast.success('✅ Thank you for sharing your feedback! We truly appreciate your input and will work to improve.', {
        autoClose: 4000
      });
      setSubmitted(true);
      
      // Redirect to home after 5 seconds
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "We're sorry, but we couldn't submit your feedback right now. Please try again or contact us directly.";
      toast.error(errorMsg, { autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="container text-center">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8">
              <div className="p-4 p-md-5 bg-white rounded shadow-sm">
                <img
                  className="img-fluid mb-4"
                  src="/assets/img/logo.png"
                  alt="Skate & Play Logo"
                  style={{ maxWidth: '220px' }}
                />
                <h5 className="mb-3">Hi {customerName}! 👋</h5>
                {!submitted ? (
                  <>
                    <h4 className="mb-3" style={{ color: '#374151' }}>
                      We're sorry your visit wasn't perfect
                    </h4>
                    <p className="mb-1">
                      You rated your experience: <strong>{stars} {stars === 1 ? 'star' : 'stars'}</strong> ⭐
                    </p>
                    <p className="text-muted mb-4">
                      Your feedback helps us improve! Please share what went wrong so we can make things better.
                    </p>
                    <form onSubmit={handleSubmit}>
                      <div className="mb-4 text-start">
                        <label htmlFor="issue" className="form-label fw-semibold">
                          What could we have done better? <span className="text-danger">*</span>
                        </label>
                        <select
                          id="issue"
                          className="form-select form-select-lg"
                          value={issue}
                          onChange={(e) => setIssue(e.target.value)}
                          required
                        >
                          <option value="">Select an issue...</option>
                          <option value="Long wait time">Long wait time</option>
                          <option value="Staff interaction">Staff interaction</option>
                          <option value="Facility cleanliness">Facility cleanliness</option>
                          <option value="Safety concern">Safety concern</option>
                          <option value="Equipment quality">Equipment quality</option>
                          <option value="Pricing">Pricing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="mb-4 text-start">
                        <label htmlFor="staffName" className="form-label fw-semibold">
                          Staff Member Name <span className="text-muted">(optional)</span>
                        </label>
                        <input
                          id="staffName"
                          className="form-control form-control-lg"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          placeholder="If applicable, please enter the staff member's name"
                        />
                        <small className="text-muted">
                          This helps us address specific situations
                        </small>
                      </div>

                      <div className="mb-4 text-start">
                        <label htmlFor="comments" className="form-label fw-semibold">
                          Additional Comments <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="comments"
                          className="form-control form-control-lg"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows="5"
                          placeholder="Please tell us more about your experience and how we can improve..."
                          required
                        />
                        <small className="text-muted">
                          The more details you provide, the better we can address your concerns
                        </small>
                      </div>

                      <button 
                        className="btn btn-primary btn-lg px-5" 
                        type="submit" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Submitting...
                          </>
                        ) : (
                          '📤 Submit Feedback'
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h4 className="text-success mb-3">✅ Thank You!</h4>
                    <p className="mb-3" style={{ fontSize: '1.1rem' }}>
                      We've received your feedback and we genuinely appreciate you taking the time to share it with us.
                    </p>
                    <p className="text-muted">
                      Your input helps us create better experiences for everyone. We're committed to making improvements!
                    </p>
                    <p className="text-secondary mt-4">
                      Redirecting you shortly...
                    </p>
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
