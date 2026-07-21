'use client';

import { useEffect, useState } from 'react';

export default function GoogleReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews');
        const data = await response.json();

        if (data.reviews) {
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Map star rating text strings to numeric values
  const getStarCount = (rating) => {
    const ratings = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratings[rating] || 5;
  };

  if (loading) {
    return <div className="text-center py-10 animate-pulse text-gray-500">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Our Clients Say</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => (
          <div
            key={review.reviewId}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-1 mb-4 text-yellow-400">
                {[...Array(getStarCount(review.starRating))].map((_, i) => (
                  <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-600 text-sm italic mb-6 line-clamp-4">
                "{review.comment}"
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
              <span className="font-medium text-gray-900">
                {review.reviewer?.displayName || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(review.createTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}