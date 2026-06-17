"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import AnimatedInput from "@/component/Input"
import AnimatedButton from "@/component/Button"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    email: "",
    password: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.email || !form.password) {
      return setError("All fields are required")
    }

    try {
      setLoading(true)

      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false, // important
      })

      if (res.error) {
        setError(res.error)
        return
      }

      router.push("/leads")

    } catch (err) {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">
  
  {/* Left Side: Image Container (Hides on small screens, takes 50% width on medium+) */}
  <div className="hidden md:block md:w-1/2 relative bg-gray-200">
    <Image 
      loading="eager" 
      src={`https://images.unsplash.com/photo-1523961131990-5ea7c61b2107`} 
      alt="login"
      fill
      className="absolute inset-0 w-full h-full object-cover" 
    />
  </div>

  {/* Right Side: Form Container */}
  <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md  space-y-6">

      <div className=" space-y-2">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="text-gray-500 text-sm">
          Login to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatedInput
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
        />

        <AnimatedInput
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
        />

        {error && (
          <p className="text-sm text-red-500 text-center">
            {error}
          </p>
        )}

        <AnimatedButton
          type="submit"
          isLoading={loading}
          className="w-full"
        >
          Login
        </AnimatedButton>
      </form>

    </div>
  </div>
  
</div>
  )
}