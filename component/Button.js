"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export default function AnimatedButton({
  children,
  onClick,
  isLoading = false,
  disabled = false,
  type = "button",
  className = "",
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        relative
        flex items-center justify-center gap-2
        cursor-pointer
        px-6 py-3 mt-3
         rounded-lg
        font-semibold
        bg-[#1A2A3A] text-white
        hover:bg-[#2C4159]
        disabled:opacity-50
        disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin w-4 h-4" />
          Processing...
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}