"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Pencil,
  KeyRound,
  X,
  ShieldAlert,
  Shield,
  Mail,
  Phone,
  Clock,
  UserCircle,
  Users,
  CircleDot,
  Loader2,
  UserPlus,
  Search,
  Check,
} from "lucide-react"
import toast from "react-hot-toast"
import BackButton from "@/lib/BackButton"
import Link from "next/link"

const GRID =
  "grid grid-cols-[minmax(260px,2.2fr)_150px_140px_130px_120px_96px]"

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]"

const roleStyles = {
  admin: "bg-[#D3E5EF] text-[#183347]",
  counsellor: "bg-[#E8DEEE] text-[#412454]",
  manager: "bg-[#FDECC8] text-[#402C1B]",
  seo: "bg-[#DBEDDB] text-[#1C3829]",
}

function Pill({ className = "", children }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-[3px] px-1.5 py-0.5 text-[13px] leading-5 ${className}`}
    >
      {children}
    </span>
  )
}

function HeaderCell({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-[#787774]">
      <Icon size={14} className="shrink-0 text-[#9B9A97]" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function InlineEdit({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-[4px] p-1 text-[#9B9A97] opacity-0 transition-opacity focus:opacity-100 group-hover/edit:opacity-100 ${hoverBg}`}
    >
      <Pencil size={12} />
    </button>
  )
}

const inputClass =
  "w-full rounded-[4px] border border-[#E3E2E0] bg-white px-3 py-2 text-sm text-[#37352F] outline-none transition-shadow placeholder:text-[#C7C6C3] focus:border-[#2383E2] focus:ring-2 focus:ring-[#2383E2]/30"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

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

  useEffect(() => {
    if (!modal) return
    const onKey = (e) => {
      if (e.key === "Escape") closeModal()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal])

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
    if (counsellorStatus === "special" && selectedCourses.length === 0) {
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
            courses: counsellorStatus === "special" ? selectedCourses : [],
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
        body: JSON.stringify({ id: userId, field, value }),
      })
      const data = await res.json()

      if (data.success || data.message) {
        toast.success(
          `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`
        )
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
        body: JSON.stringify({ id: userId, password: value }),
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

  const query = search.trim().toLowerCase()
  const filteredUsers = users.filter((user) =>
    [user.name, user.email, user.mobile, user.role].some((item) =>
      String(item || "").toLowerCase().includes(query)
    )
  )

  const modalTitle =
    modal === "password"
      ? "Reset password"
      : modal === "counsellorStatus"
        ? "Counsellor status"
        : `Update ${field === "isBlocked" ? "access" : field}`

  const onSave =
    modal === "edit"
      ? saveEdit
      : modal === "counsellorStatus"
        ? saveCounsellorStatus
        : resetPassword

  return (
    <div
      className="min-h-screen w-full p-4 text-[#37352F] md:p-8"
    >
      <BackButton />

      {/* Page header */}
      <div className="mb-6 mt-4">
        <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.01em] sm:text-[40px]">
          Staff Management
        </h1>
        <p className="mt-1 text-[15px] text-[#787774]">
          Manage user roles, statuses, and account access.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill className="bg-[#E3E2E0] text-[#32302C]">{users.length} users</Pill>
          <Pill className="bg-[#DBEDDB] text-[#1C3829]">
            {users.filter((u) => !u.isBlocked).length} active
          </Pill>
          <Pill className="bg-[#FFE2DD] text-[#5D1715]">
            {users.filter((u) => u.isBlocked).length} blocked
          </Pill>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E9E9E7]">
        <div className="flex items-center gap-1.5 border-b-2 border-[#37352F] px-1 pb-2 pt-1 text-sm font-medium">
          <Users size={15} className="text-[#787774]" />
          All users
        </div>

        <div className="flex items-center gap-1 pb-1.5">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9B9A97]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-7 w-32 rounded-[4px] bg-transparent pl-7 pr-2 text-sm outline-none transition-all placeholder:text-[#9B9A97] hover:bg-[rgba(55,53,47,0.06)] focus:w-52 focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40"
            />
          </div>
          <Link
            href="/register"
            className="ml-1 inline-flex h-7 items-center gap-1 rounded-[4px] bg-[#2383E2] px-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
          >
            <UserPlus size={15} /> Add user
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className={`${GRID} border-b border-[#E9E9E7]`}>
            <HeaderCell icon={UserCircle}>User</HeaderCell>
            <HeaderCell icon={Users}>Counsellor status</HeaderCell>
            <HeaderCell icon={Shield}>Role</HeaderCell>
            <HeaderCell icon={Clock}>Last login</HeaderCell>
            <HeaderCell icon={CircleDot}>Status</HeaderCell>
            <div />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#9B9A97]">
              <Loader2 size={16} className="animate-spin" /> Loading users
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-14 text-center text-sm text-[#787774]">
              {search ? "No users match your search." : "No users found."}
            </div>
          ) : (
            filteredUsers.map((row) => {
              const roleKey = row.role || "user"
              const status = row.counsellorStatus || "regular"

              return (
                <div
                  key={row._id}
                  className={`group ${GRID} items-center border-b border-[#E9E9E7] transition-colors hover:bg-[rgba(55,53,47,0.03)]`}
                >
                  {/* User */}
                  <div className="min-w-0 px-2 py-2.5">
                    <div className="group/edit flex items-center gap-1">
                      <span className="truncate text-sm font-medium">
                        {row.name}
                      </span>
                      <InlineEdit
                        label={`Edit name for ${row.name}`}
                        onClick={() => openEdit(row, "name", row.name)}
                      />
                    </div>

                    <div className="group/edit mt-0.5 flex items-center gap-1.5 text-xs text-[#787774]">
                      <Phone size={12} className="shrink-0 text-[#9B9A97]" />
                      <span className="truncate">{row.mobile || "N/A"}</span>
                      <InlineEdit
                        label={`Edit mobile for ${row.name}`}
                        onClick={() => openEdit(row, "mobile", row.mobile)}
                      />
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#787774]">
                      <Mail size={12} className="shrink-0 text-[#9B9A97]" />
                      <span className="truncate">{row.email || "N/A"}</span>
                    </div>
                  </div>

                  {/* Counsellor status */}
                  <div className="px-2 py-2.5">
                    {row.role !== "counsellor" ? (
                      <span className="text-sm text-[#C7C6C3]">—</span>
                    ) : (
                      <button
                        onClick={() => openCounsellorStatus(row)}
                        title="Change counsellor type"
                        className="rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40"
                      >
                        <Pill
                          className={
                            status === "special"
                              ? "bg-[#E8DEEE] text-[#412454]"
                              : "bg-[#D3E5EF] text-[#183347]"
                          }
                        >
                          {status === "special" ? "Special" : "Regular"}
                        </Pill>
                      </button>
                    )}
                  </div>

                  {/* Role */}
                  <div className="group/edit flex items-center gap-1 px-2 py-2.5">
                    <Pill
                      className={`capitalize ${
                        roleStyles[roleKey] || "bg-[#E3E2E0] text-[#32302C]"
                      }`}
                    >
                      {roleKey}
                    </Pill>
                    <InlineEdit
                      label={`Edit role for ${row.name}`}
                      onClick={() => openEdit(row, "role", row.role)}
                    />
                  </div>

                  {/* Last login */}
                  <div className="px-2 py-2.5 text-sm text-[#787774]">
                    {row.lastLogin
                      ? new Date(row.lastLogin).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Never"}
                  </div>

                  {/* Access status */}
                  <div className="px-2 py-2.5">
                    <button
                      onClick={() => openEdit(row, "isBlocked", !row.isBlocked)}
                      title={row.isBlocked ? "Click to unblock" : "Click to block"}
                      className="rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]/40"
                    >
                      <Pill
                        className={
                          row.isBlocked
                            ? "bg-[#FFE2DD] text-[#5D1715]"
                            : "bg-[#DBEDDB] text-[#1C3829]"
                        }
                      >
                        {row.isBlocked ? (
                          <ShieldAlert size={12} className="mr-1.5" />
                        ) : (
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#4DAB9A]" />
                        )}
                        {row.isBlocked ? "Blocked" : "Active"}
                      </Pill>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center px-2">
                    <button
                      onClick={() => openPassword(row)}
                      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[13px] text-[#787774] opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${hoverBg}`}
                    >
                      <KeyRound size={13} />
                      Reset
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal / page peek */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-16"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) closeModal()
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-[520px] overflow-hidden rounded-[6px] bg-white"
              style={{
                boxShadow:
                  "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
              }}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-xs text-[#9B9A97]">Staff</span>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 pt-2 sm:px-10">
                <h2 className="text-[26px] font-bold capitalize leading-tight tracking-[-0.01em]">
                  {modalTitle}
                </h2>

                <div className="mt-5">
                  {modal === "edit" && (
                    <div className="space-y-4">
                      {field === "role" ? (
                        <div className="space-y-1.5">
                          <label className="text-sm text-[#787774]">
                            Account role
                          </label>
                          <select
                            className={inputClass}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                          >
                            <option value="manager">Manager</option>
                            <option value="seo">SEO</option>
                            <option value="admin">Admin</option>
                            <option value="counsellor">Counsellor</option>
                          </select>
                        </div>
                      ) : field === "isBlocked" ? (
                        <div className="rounded-[4px] bg-[#FDECC8] px-3 py-2.5 text-sm text-[#402C1B]">
                          Are you sure you want to{" "}
                          <strong>{value ? "block" : "unblock"}</strong> this
                          user?
                          {value &&
                            " They will immediately lose access to the platform."}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-sm capitalize text-[#787774]">
                            {field}
                          </label>
                          <input
                            autoFocus
                            type="text"
                            className={inputClass}
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
                      <div>
                        <label className="mb-2 block text-sm text-[#787774]">
                          Counsellor type
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCounsellorStatus("regular")
                              setSelectedCourses([])
                            }}
                            className={`rounded-[4px] border p-3 text-left transition-colors ${
                              counsellorStatus === "regular"
                                ? "border-[#2383E2] bg-[#D3E5EF]/40 ring-1 ring-[#2383E2]"
                                : "border-[#E3E2E0] hover:bg-[rgba(55,53,47,0.04)]"
                            }`}
                          >
                            <div className="text-sm font-medium">Regular</div>
                            <div className="mt-0.5 text-xs text-[#787774]">
                              Can handle all courses
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCounsellorStatus("special")
                              fetchCourses()
                            }}
                            className={`rounded-[4px] border p-3 text-left transition-colors ${
                              counsellorStatus === "special"
                                ? "border-[#2383E2] bg-[#D3E5EF]/40 ring-1 ring-[#2383E2]"
                                : "border-[#E3E2E0] hover:bg-[rgba(55,53,47,0.04)]"
                            }`}
                          >
                            <div className="text-sm font-medium">Special</div>
                            <div className="mt-0.5 text-xs text-[#787774]">
                              Select specific courses
                            </div>
                          </button>
                        </div>
                      </div>

                      {counsellorStatus === "special" && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm text-[#787774]">
                              Courses
                            </label>
                            <span className="text-xs text-[#9B9A97]">
                              {selectedCourses.length} selected
                            </span>
                          </div>

                          {coursesLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2
                                size={18}
                                className="animate-spin text-[#9B9A97]"
                              />
                            </div>
                          ) : courses.length === 0 ? (
                            <div className="rounded-[4px] border border-[#E3E2E0] py-6 text-center text-sm text-[#787774]">
                              No courses available
                            </div>
                          ) : (
                            <div className="max-h-64 overflow-y-auto rounded-[4px] border border-[#E3E2E0]">
                              {courses.map((course) => {
                                const checked = selectedCourses.includes(
                                  course._id
                                )

                                return (
                                  <button
                                    type="button"
                                    key={course._id}
                                    onClick={() => toggleCourse(course._id)}
                                    aria-pressed={checked}
                                    className="flex w-full items-center gap-2.5 border-b border-[#E9E9E7] px-3 py-2 text-left last:border-b-0 hover:bg-[rgba(55,53,47,0.04)]"
                                  >
                                    <span
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
                                        checked
                                          ? "border-[#2383E2] bg-[#2383E2] text-white"
                                          : "border-[#C7C6C3]"
                                      }`}
                                    >
                                      {checked && <Check size={12} />}
                                    </span>
                                    <span className="text-sm">{course.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {modal === "password" && (
                    <div className="space-y-1.5">
                      <label className="text-sm text-[#787774]">
                        New password
                      </label>
                      <input
                        autoFocus
                        type="password"
                        className={inputClass}
                        placeholder="Enter at least 6 characters"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
                <button
                  onClick={closeModal}
                  className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm text-[#37352F] transition-colors hover:bg-[rgba(55,53,47,0.06)]"
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={isSubmitting}
                  className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4] disabled:opacity-60"
                >
                  {isSubmitting && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  {isSubmitting ? "Saving..." : "Save changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}