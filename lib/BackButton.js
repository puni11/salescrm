"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function BackButton({ 
  label = "Go Back", 
  className = "" 
}) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className={`flex items-center rounded-lg gap-2 px-4 py-2 text-xs cursor-pointer font-medium text-gray-600 bg-white border border-gray-200   hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm w-fit ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}