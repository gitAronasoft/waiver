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
        setErrorMessage(response.data.message || 'Invalid rating link');
      }
    } catch (err) {
      setTokenValid(false);
      const message = err.response?.data?.message || err.response?.data?.error || 'This rating link is no longer valid or has already been used.';
      setErrorMessage(message);
      toast.error(message);
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
        
        toast.success('Thank you for your 5-star rating! Redirecting to Google Reviews...');
        
        setTimeout(() => {
          window.location.href = GOOGLE_REVIEW_LINK;
        }, 2000);
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
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'We encountered an error while submitting your rating. Please try again.';
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
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
                {loading ? (
                  <div>
                    <p className="text-muted">Validating your rating link...</p>
                    <div className="spinner-border text-primary mt-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : !tokenValid ? (
                  <div>
                    <h5 className="text-danger mb-3">⚠️ Invalid Link</h5>
                    <p>{errorMessage}</p>
                    <p className="text-muted mt-3">If you believe this is an error, please contact us at info@skate-play.com</p>
                  </div>
                ) : (
                  <>
                    <h5 className="mb-3">Hi {customerName},</h5>
                    <h5 className="fw-bold mb-2">We'd love to know how your experience was.</h5>
                    <p className="fw-bold mb-3">Please take a few seconds to rate your visit:</p>
                    {submitting && <p className="text-primary">Submitting your rating...</p>}

                    <div className="d-flex justify-content-center mb-4">
                      <Rating
                        onClick={handleRating}
                        size={50}
                        initialValue={0}
                        allowFraction={false}
                        transition
                        readonly={submitting}
                      />
                    </div>

                    <h6 className="mb-2">It only takes a moment and really helps us improve.</h6>
                    <h6>Thanks for being part of the fun — we hope to see you again soon!</h6>
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
