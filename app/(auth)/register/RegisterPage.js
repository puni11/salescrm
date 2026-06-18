"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import AnimatedInput from "@/component/Input"
import AnimatedButton from "@/component/Button"
import Image from "next/image"

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    role: "admin",
    key: "",
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })

    // Remove error while typing
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    let newErrors = {}

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile is required"
    } else if (!/^[0-9]{10}$/.test(form.mobile)) {
      newErrors.mobile = "Mobile must be 10 digits"
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required"
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(form.email)
    ) {
      newErrors.email = "Invalid email address"
    }

    if (!form.password) {
      newErrors.password = "Password is required"
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (!form.key) {
      newErrors.key = "Admin key is required"
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError("")
    setSuccess("")

    if (!validate()) return

    try {
      setLoading(true)

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong")
      }

      setSuccess("Account created successfully 🎉")

      setTimeout(() => {
        router.push("/staff")
      }, 1500)

    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
      <div className="hidden md:block md:w-1/2 relative bg-gray-200">
          <Image 
            loading="eager" 
            src={`https://images.unsplash.com/photo-1519332978332-21b7d621d05e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`} 
            alt="login"
            fill
            className="absolute inset-0 w-full h-full object-cover" 
          />
        </div>
      <div className="w-full flex flex-col items-center justify-center bg-white p-8 space-y-6">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Add a User to Panel</h1>
          <p className="text-gray-500 text-sm">
            Enter details to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <AnimatedInput
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="Enter your full name"
            error={errors.fullName}
          />
    <div className="grid grid-cols-2 gap-3">
<AnimatedInput
            label="Mobile"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            placeholder="Enter 10 digit mobile"
            error={errors.mobile}
          />

          <AnimatedInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            error={errors.email}
          />
    </div>
          

          <AnimatedInput
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create password"
            error={errors.password}
          />

          <AnimatedInput
            label="Admin Key"
            name="key"
            type="password"
            value={form.key}
            onChange={handleChange}
            placeholder="Enter admin key"
            error={errors.key}
          />

          {/* Role */}
          <div>
            <label className="block mb-2 text-sm text-gray-600">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-black focus:ring-2 focus:ring-gray-200 outline-none transition"
            >
              <option value="admin">Admin</option>
              <option value="counsellor">Counsellor</option>
            </select>
          </div>

          {serverError && (
            <p className="text-sm text-red-500 text-center">
              {serverError}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 text-center">
              {success}
            </p>
          )}

          <AnimatedButton
            type="submit"
            isLoading={loading}
            className="w-full"
          >
            Register
          </AnimatedButton>
        </form>


      </div>
    </div>
  )
}