"use client"

import { useEffect, useState } from "react"
import DataTable from "@/component/DataTable" // Your exact DataTable
import { motion, AnimatePresence } from "framer-motion"
import { 
  Edit2, 
  KeyRound, 
  X, 
  ShieldAlert, 
  Mail, 
  Phone, 
  Clock, 
  UserCircle,
  Loader2,
  UserPlus
} from "lucide-react"
import toast from "react-hot-toast"
import BackButton from "@/lib/BackButton"
import Link from "next/link"
import Skeleton from "@/component/Skeleton"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modal, setModal] = useState(null)
  const [value, setValue] = useState("")
  const [userId, setUserId] = useState("")
  const [field, setField] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
const [counsellorStatus, setCounsellorStatus] = useState("regular")
const [selectedCourses, setSelectedCourses] = useState([])
const [courses, setCourses] = useState([])
const [coursesLoading, setCoursesLoading] = useState(false)
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/adminUSer")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }
const fetchCourses = async () => {
  try {
    setCoursesLoading(true)

    const res = await fetch("/api/course")

    const data = await res.json()

    if (res.ok) {
      setCourses(data.courses || data || [])
    } else {
      toast.error("Failed to load courses")
    }
  } catch (error) {
    console.error(error)
    toast.error("Failed to load courses")
  } finally {
    setCoursesLoading(false)
  }
}
const toggleCourse = (courseId) => {
  setSelectedCourses((prev) => {
    if (prev.includes(courseId)) {
      return prev.filter((id) => id !== courseId)
    }

    return [...prev, courseId]
  })
}
  const openEdit = (user, fieldName, currentValue) => {
    setUserId(user._id)
    setField(fieldName)
    setValue(currentValue)
    setModal("edit")
  }

  const openPassword = (user) => {
    setUserId(user._id)
    setValue("")
    setModal("password")
  }
const openCounsellorStatus = async (user) => {
  setUserId(user._id)

  // Default Regular
  const currentStatus = user.counsellorStatus || "regular"

  setCounsellorStatus(currentStatus)

  // Existing selected courses
  setSelectedCourses(
    user.specialCourses?.map((course) =>
      typeof course === "object" ? course._id : course
    ) || []
  )

  setModal("counsellorStatus")

  // Fetch courses only when needed
  if (currentStatus === "special") {
    fetchCourses()
  }
}
  const closeModal = () => {
    setModal(null)
    setValue("")
    setField("")
    setUserId("")
     setCounsellorStatus("regular")
  setSelectedCourses([])
  }
const saveCounsellorStatus = async () => {
  if (
    counsellorStatus === "special" &&
    selectedCourses.length === 0
  ) {
    return toast.error(
      "Please select at least one course for Special counsellor"
    )
  }

  setIsSubmitting(true)

  try {
    const res = await fetch(
      "/api/admin/adminUSer/update-counsellor-status",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          counsellorStatus,
          courses:
            counsellorStatus === "special"
              ? selectedCourses
              : [],
        }),
      }
    )

    const data = await res.json()

    if (res.ok || data.success) {
      toast.success("Counsellor status updated successfully")

      fetchUsers()
      closeModal()
    } else {
      toast.error(data.message || "Update failed")
    }
  } catch (error) {
    console.error(error)
    toast.error("Something went wrong")
  } finally {
    setIsSubmitting(false)
  }
}
  const saveEdit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/adminUSer/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, field, value })
      })
      const data = await res.json()

      if (data.success || data.message) {
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`)
        fetchUsers()
        closeModal()
      } else {
        toast.error("Update failed")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetPassword = async () => {
    if (!value || value.length < 6) {
      return toast.error("Password must be at least 6 characters")
    }
    
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/adminUSer/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, password: value })
      })
      const data = await res.json()

      if (data.success || data.message) {
        toast.success("Password updated securely")
        closeModal()
      } else {
        toast.error("Password update failed")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ADAPTED COLUMNS: Matching your DataTable's { label, accessor, render } format
  const columns = [
    {
      label: "User",
      accessor: "name",
      render: (val, row) => (
        <div>
        <div className="flex items-center gap-3 group">
        
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{val}</span>
            <button 
              onClick={() => openEdit(row, "name", val)}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
            >
              <Edit2 size={14} />
            </button>
             </div>
        
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-600 group w-fit">
            <Phone size={12} className="text-gray-400" />
            {row.mobile || "N/A"}
            <button 
              onClick={() => openEdit(row, "mobile", row.mobile)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all ml-1"
            >
              <Edit2 size={12} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail size={12} className="text-gray-400" />
            {val}
          </div>
          </div>
        </div>
      )
    },
  {
  label: "Counsellor Status",
  accessor: "counsellorStatus",
  render: (val, row) => {
    // Only show for counsellor role
    if (row.role !== "counsellor") {
      return (
        <span className="text-xs text-gray-400">
          —
        </span>
      )
    }

    const status = val || "regular"

    return (
      <button
        onClick={() => openCounsellorStatus(row)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
          status === "special"
            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
        }`}
      >
        {status === "special" ? "Special" : "Regular"}
      </button>
    )
  }
},
    {
      label: "Role",
      accessor: "role",
      render: (val, row) => (
        <div className="flex items-center gap-2 group w-fit">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
              val === "admin"
                ? "bg-blue-50 text-blue-900 border-blue-200"
                : "bg-gray-50 text-gray-700 border-gray-200"
            }`}
          >
            {val === "admin" ? "Admin" : val}
          </span>
          <button 
            onClick={() => openEdit(row, "role", val)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )
    },
    {
      label: "Last Login",
      accessor: "lastLogin",
      render: (val) => (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} className="text-gray-400" />
          {val 
            ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : "Never"
          }
        </div>
      )
    },
    {
      label: "Status",
      accessor: "isBlocked",
      render: (isBlocked, row) => (
        <button
          onClick={() => openEdit(row, "isBlocked", !isBlocked)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors border ${
            isBlocked
              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          {isBlocked ? <ShieldAlert size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          {isBlocked ? "Blocked" : "Active"}
        </button>
      )
    }
  ]

  return (
    <div className="min-h-screen w-full p-4 md:p-8 font-sans text-gray-800">
      <div className=" space-y-6">
        <BackButton />
        {/* Header */}
        <div className="flex justify-between items-center">
           <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user roles, statuses, and account access.</p>
        </div>
          <Link href={"/register"} className="border border-blue-300 flex items-center gap-2 rounded-xl px-4 py-2 bg-blue-50 text-blue-600">
          <UserPlus className="h-4 w-4"/>Add User
          </Link>
        </div>
       

        {/* Table Area */}
        {loading ? (
          <Skeleton />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            // ADAPTED: Pass the Reset Password button to the renderActions prop
            renderActions={(row) => (
              <button
                onClick={() => openPassword(row)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm ml-auto"
              >
                <KeyRound size={14} className="text-blue-500" />
                Reset
              </button>
            )}
          />
        )}

        {/* Action Modal (Same as before) */}
        <AnimatePresence>
          {modal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-semibold text-gray-900 capitalize">
                   {
  modal === "password"
    ? "Reset Password"
    : modal === "counsellorStatus"
    ? "Counsellor Status"
    : `Update ${field}`
}
                  </h2>
                  <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  
                  {modal === "edit" && (
                    <div className="space-y-4">
                      {field === "role" ? (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Account Role</label>
                          <select
                            className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                          >
                            <option value="manager">Manager</option>
                            <option value="seo">SEO</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      ) : field === "isBlocked" ? (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm">
                          Are you sure you want to <strong>{value ? "block" : "unblock"}</strong> this user? 
                          {value && " They will immediately lose access to the platform."}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700 capitalize">{field}</label>
                          <input
                            type="text"
                            className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={`Enter new ${field}`}
                          />
                        </div>
                      )}
                    </div>
                  )}
{modal === "counsellorStatus" && (
  <div className="space-y-5">

    {/* Status Selection */}
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-3 block">
        Counsellor Type
      </label>

      <div className="grid grid-cols-2 gap-3">

        {/* Regular */}
        <button
          type="button"
          onClick={() => {
            setCounsellorStatus("regular")
            setSelectedCourses([])
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            counsellorStatus === "regular"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="font-semibold text-sm">
            Regular
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Can handle all courses
          </div>
        </button>

        {/* Special */}
        <button
          type="button"
          onClick={() => {
            setCounsellorStatus("special")
            fetchCourses()
          }}
          className={`p-4 rounded-xl border text-left transition-all ${
            counsellorStatus === "special"
              ? "border-purple-500 bg-purple-50 ring-2 ring-purple-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="font-semibold text-sm">
            Special
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Select specific courses
          </div>
        </button>

      </div>
    </div>

    {/* Courses */}
    {counsellorStatus === "special" && (
      <div>

        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-semibold text-gray-700">
            Select Courses
          </label>

          <span className="text-xs text-gray-500">
            {selectedCourses.length} selected
          </span>
        </div>

        {coursesLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 border rounded-xl">
            No courses available
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">

            {courses.map((course) => (
              <label
                key={course._id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course._id)}
                  onChange={() => toggleCourse(course._id)}
                  className="w-4 h-4 accent-blue-600"
                />

                <span className="text-sm font-medium text-gray-700">
                  {course.name}
                </span>

              </label>
            ))}

          </div>
        )}

      </div>
    )}

  </div>
)}
                  {modal === "password" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">New Password</label>
                      <input
                        type="password"
                        className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter at least 6 characters"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 mt-8">
                    <button
                      onClick={closeModal}
                      className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                     onClick={
  modal === "edit"
    ? saveEdit
    : modal === "counsellorStatus"
    ? saveCounsellorStatus
    : resetPassword
}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-[#1c2434] hover:bg-black rounded-xl transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  )
}