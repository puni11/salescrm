"use client";

import { useEffect, useState } from "react";

export default function FacebookReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/test");
      const data = await res.json();

      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading Facebook Reviews...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Facebook Reviews
      </h1>

      {reviews.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow">
          No reviews found
        </div>
      ) : (
        <div className="grid gap-6">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow border"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">
                  {review.reviewer?.name || "Anonymous"}
                </h3>

                <div className="text-yellow-500">
                  {"⭐".repeat(review.rating || 0)}
                </div>
              </div>

              <p className="text-gray-700 mb-3">
                {review.review_text || "No review text"}
              </p>

              <div className="text-sm text-gray-500">
                {new Date(review.created_time).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}