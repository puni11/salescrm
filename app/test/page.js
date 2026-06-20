"use client";

import { useEffect, useState } from "react";

export default function GoogleReviewsPage() {
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");

    if (t) {
      setToken(t);
      loadAccounts(t);
    }
  }, []);

  async function loadAccounts(accessToken) {
    const res = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();
    setAccounts(data.accounts || []);
  }

  async function loadLocations(accountName) {
    const accountId = accountName.split("/")[1];

    const res = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setLocations(data.locations || []);
  }

  async function loadReviews(locationName) {
    const locationId = locationName.split("/")[1];

    const accountId = accounts[0].name.split("/")[1];

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setReviews(data.reviews || []);
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        Google Business Reviews
      </h1>

      {!token && (
        <a
          href="/api/google/auth"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect Google
        </a>
      )}

      {accounts.length > 0 && (
        <>
          <h2 className="text-xl mt-8 mb-4">Accounts</h2>

          {accounts.map((account) => (
            <button
              key={account.name}
              onClick={() => loadLocations(account.name)}
              className="block border p-3 mb-2 rounded w-full text-left"
            >
              {account.accountName}
            </button>
          ))}
        </>
      )}

      {locations.length > 0 && (
        <>
          <h2 className="text-xl mt-8 mb-4">Locations</h2>

          {locations.map((location) => (
            <button
              key={location.name}
              onClick={() => loadReviews(location.name)}
              className="block border p-3 mb-2 rounded w-full text-left"
            >
              {location.title}
            </button>
          ))}
        </>
      )}

      {reviews.length > 0 && (
        <>
          <h2 className="text-xl mt-8 mb-4">Reviews</h2>

          <table className="w-full border">
            <thead>
              <tr>
                <th className="border p-2">Reviewer</th>
                <th className="border p-2">Rating</th>
                <th className="border p-2">Comment</th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((review) => (
                <tr key={review.reviewId}>
                  <td className="border p-2">
                    {review.reviewer?.displayName}
                  </td>

                  <td className="border p-2">
                    {review.starRating}
                  </td>

                  <td className="border p-2">
                    {review.comment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}