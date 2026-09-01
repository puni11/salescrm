"use client";

import { useEffect, useState } from "react";

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function useDailyFollowups() {
  const [followups, setFollowups] = useState([]);
  const [showFollowups, setShowFollowups] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkDailyFollowups();
  }, []);

  async function checkDailyFollowups() {
    const today = getTodayKey();

    const lastShown = localStorage.getItem("daily_followup_shown");

    // Already checked today
    if (lastShown === today) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/followups/today");

      const result = await response.json();

      if (!result.success) {
        return;
      }

      // Mark today as checked
      localStorage.setItem("daily_followup_shown", today);

      // Only show screen if follow-ups exist
      if (result.data?.length > 0) {
        setFollowups(result.data);
        setShowFollowups(true);
      }
    } catch (error) {
      console.error("Daily follow-up error:", error);
    } finally {
      setLoading(false);
    }
  }

  function closeFollowups() {
    setShowFollowups(false);
  }

  return {
    followups,
    showFollowups,
    loading,
    closeFollowups,
  };
}