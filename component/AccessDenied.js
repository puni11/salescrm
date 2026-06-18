"use client"

import { useRouter } from "next/navigation"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

export default function AccessDenied({
  title = "Access Denied",
  message = "You do not have the necessary permissions to view this page. Please contact your administrator if you believe this is a mistake.",
  showBackButton = true
}) {
  const router = useRouter()

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="  p-8 md:p-12  max-w-md w-full text-center flex flex-col items-center"
      >
        {/* Warning Icon Container */}
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-[0_0_0_1px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-10 h-10 text-red-500" strokeWidth={1.5} />
        </div>
        
        {/* Text Content */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
          {title}
        </h1>
        
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          {message}
        </p>

        {/* Action Button */}
        {showBackButton && (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-[#1c2434] hover:bg-black text-white rounded-xl font-medium transition-all active:scale-[0.98] shadow-sm"
          >
            <ArrowLeft size={18} />
            Go Home
          </Link>
        )}
      </motion.div>
    </div>
  )
}