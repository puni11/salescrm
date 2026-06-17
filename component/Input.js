"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function AnimatedInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error,
  isLoading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)

  const inputType =
    type === "password"
      ? showPassword
        ? "text"
        : "password"
      : type

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          {label}
        </motion.label>
      )}

      <div className="relative">
        <motion.input
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={disabled || isLoading}
          whileFocus={{ scale: 1.01 }}
          className={`
            w-full px-4 py-3 
            border transition-all duration-200
            rounded-lg
            outline-none
            ${error
              ? "border-red-500 focus:ring-2 focus:ring-red-200"
              : "border-gray-300 focus:border-black focus:ring-2 focus:ring-gray-200"}
            ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
          `}
          placeholder={placeholder}
          {...props}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 text-gray-500" />
        )}

        {/* Password Toggle */}
        {type === "password" && !isLoading && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1 text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}