import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rating } from 'react-simple-star-rating';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { BACKEND_URL, GOOGLE_REVIEW_LINK } from '../config';

function StarRatingPage() {
  const { id: token } = useParams();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');


useEffect(() => {
  const validateToken = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/rating/validate-token/${token}`);
      
      if (response.data.valid) {
        setTokenValid(true);
        setCustomerName(response.data.customer_name);
      } else {
        setTokenValid(false);
        setErrorMessage(response.data.message || 'This rating link is no longer valid');
      }
    } catch (err) {
      setTokenValid(false);
      const message = err.response?.data?.message || err.response?.data?.error || 'This rating link has expired or has already been used. Thank you for your interest!';
      setErrorMessage(message);
      toast.error(message, { autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  if (token) {
    validateToken();
  } else {
    setLoading(false);
    setErrorMessage('No rating link provided');
  }
}, [token]);


  const handleRating = async (rate) => {
    if (submitting) return;
    
    setSubmitting(true);
    
    try {
      if (rate === 5) {
        await axios.post(`${BACKEND_URL}/api/rating/submit-five-star`, { token });
        
        toast.success('🎉 Thank you for the amazing 5-star rating! We appreciate you taking the time to share your experience.', {
          autoClose: 2500
        });
        
        setTimeout(() => {
          window.location.href = GOOGLE_REVIEW_LINK;
        }, 2500);
      } else {
        navigate('/feedback', { 
          state: { 
            token, 
            rating: rate,
            customerName 
          } 
        });
      }
    } catch (error) {
      console.error('Rating error:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Oops! We encountered an issue while saving your rating. Please try again, or contact us if the problem persists.';
      toast.error(errorMsg, { autoClose: 5000 });
      setSubmitting(false);
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
                {loading ? (
                  <div>
                    <p className="text-muted mb-3">Validating your rating link...</p>
                    <div className="spinner-border text-primary mt-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : !tokenValid ? (
                  <div>
                    <h5 className="text-danger mb-3">⚠️ Invalid or Expired Link</h5>
                    <p className="text-muted mb-3">{errorMessage}</p>
                    <p className="text-secondary mt-4" style={{ fontSize: '0.95rem' }}>
                      If you believe this is a mistake, please reach out to us at{' '}
                      <a href="mailto:info@skate-play.com" className="text-primary">
                        info@skate-play.com
                      </a>
                      {' '}and we'll be happy to help!
                    </p>
                  </div>
                ) : (
                  <>
                    <h4 className="mb-3">Hi {customerName}! 👋</h4>
                    <h5 className="fw-bold mb-2" style={{ color: '#374151' }}>
                      How was your visit to Skate & Play?
                    </h5>
                    <p className="text-muted mb-4">
                      Your feedback helps us create better experiences for everyone!
                    </p>
                    {submitting && (
                      <p className="text-primary mb-3">
                        <span className="spinner-border spinner-border-sm me-2" />
                        Submitting your rating...
                      </p>
                    )}

                    <div className="d-flex justify-content-center mb-4">
                      <Rating
                        onClick={handleRating}
                        size={55}
                        initialValue={0}
                        allowFraction={false}
                        transition
                        readonly={submitting}
                        fillColor="#fbbf24"
                        emptyColor="#e5e7eb"
                      />
                    </div>

                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
                      Tap the stars above to rate your experience
                    </p>
                    <p className="text-muted mt-4" style={{ fontSize: '0.85rem' }}>
                      Thanks for being part of the fun — we hope to see you again soon! 🎉
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

export default StarRatingPage;
