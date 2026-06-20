"use client";

import { useEffect, useState } from "react";

export default function GoogleReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [account, setAccount] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    const res = await fetch("/api/google/review");
    const data = await res.json();

    setAccount(data.account);
    setLocation(data.location);
    setReviews(data.reviews || []);
    setLoading(false);

    console.log(data);
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading Reviews...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-6">
        Google Reviews
      </h1>

      <div className="mb-6">
        <p>
          <strong>Account:</strong>{" "}
          {account?.accountName}
        </p>

        <p>
          <strong>Location:</strong>{" "}
          {location?.title}
        </p>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-3">Reviewer</th>
            <th className="border p-3">Rating</th>
            <th className="border p-3">Comment</th>
            <th className="border p-3">Date</th>
          </tr>
        </thead>

        <tbody>
          {reviews.map((review) => (
            <tr key={review.reviewId}>
              <td className="border p-3">
                {review.reviewer?.displayName}
              </td>

              <td className="border p-3">
                {review.starRating}
              </td>

              <td className="border p-3">
                {review.comment}
              </td>

              <td className="border p-3">
                {new Date(
                  review.createTime
                ).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}