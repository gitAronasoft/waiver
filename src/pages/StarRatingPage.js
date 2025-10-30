import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rating } from 'react-simple-star-rating';
import axios from 'axios';
import { BACKEND_URL, GOOGLE_REVIEW_LINK } from '../config';

function StarRatingPage() {
  const { id } = useParams(); // waiver id
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


useEffect(() => {
  setLoading(true);
  axios.get(`${BACKEND_URL}/api/waivers/rate/${id}`)
    .then(res => {
      const { first_name, last_name } = res.data;
      setCustomerName(`${first_name} ${last_name}`);
    })
    .catch(err => console.error('Failed to fetch customer:', err))
    .finally(() => setLoading(false));
}, [id]);


  const handleRating = async (rate) => {
    setSubmitting(true);
    try {
  const response = await axios.post(`${BACKEND_URL}/api/waivers/rate/${id}`, { rating: rate });
  const feedbackId = response.data.feedbackId;

  setTimeout(() => {
    if (rate === 5) {
         window.location.href = GOOGLE_REVIEW_LINK; 
    } else {
      navigate(`/feedback?userId=${id}&feedbackId=${feedbackId}`);

    }
  }, 1000);
} catch (error) {
  console.error('Rating error:', error);
  setSubmitting(false);
}

  };

  return (
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
                <p>Loading...</p>
              ) : (
                <>
                  <h5 className="mb-3">Hi {customerName},</h5>
                  <h5 className="fw-bold mb-2">We'd love to know how your experience was.</h5>
                  <p className="fw-bold mb-3">Please take a few seconds to rate your visit:</p>
                  {submitting && <p className="text-primary">Submitting rating...</p>}

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
  );
}

export default StarRatingPage;
