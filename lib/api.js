export async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    })

    if (res.status === 409) {
      return { unauthorized: true }
    }

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || "Something went wrong")
    }

    return { data }
  } catch (error) {
    return { error: error.message }
  }
}