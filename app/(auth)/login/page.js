
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import AnimatedInput from "@/component/Input";
import AnimatedButton from "@/component/Button";
import Image from "next/image";
import {
  AlertCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const ROLES = [
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    title: "Welcome back",
    description:
      "Log in to manage batches, trainers and students.",
    redirect: "/dashboard",
  },
  {
    id: "trainer",
    label: "Trainer",
    icon: UserRound,
    title: "Trainer login",
    description:
      "Log in to see your batches and teaching schedule.",
    redirect: "/trainer",
  },
];

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState("admin");

  // Always initialize every input value
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRole = ROLES.find((r) => r.id === role);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleRoleChange = (id) => {
    setRole(id);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === "admin") {
      if (!form.email.trim() || !form.password) {
        return setError("Email and password are required");
      }
    } else {
      if (!form.username.trim() || !form.password) {
        return setError("Username and password are required");
      }
    }

    try {
      setLoading(true);
      setError("");

      const credentials = {
        password: form.password,
        role,
        redirect: false,
      };

      if (role === "admin") {
        credentials.email = form.email.trim();
      } else {
        credentials.username = form.username.trim().toLowerCase();
      }

      const res = await signIn("credentials", credentials);

      if (res?.error) {
        setError(
          role === "trainer"
            ? "Invalid username or password"
            : "Invalid email or password"
        );
        return;
      }

      if (res?.ok) {
        router.replace(activeRole.redirect);
        router.refresh();
      } else {
        setError("Unable to login. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-[#37352f] font-sans">

      {/* Left image */}
      <div className="relative hidden bg-[#f7f6f3] md:block md:w-1/4">
        <Image
          loading="eager"
          src="https://i.pinimg.com/1200x/a1/20/a7/a120a78502207cd92cad825cd79c6bf8.jpg"
          alt="Login"
          fill
          className="object-cover"
        />
      </div>

      {/* Login form */}
      <div className="flex w-full items-center justify-center px-6 py-10 md:w-3/4">
        <div className="w-full max-w-sm space-y-8">

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold leading-tight">
              {activeRole.title}
            </h1>

            <p className="text-sm text-[#787774]">
              {activeRole.description}
            </p>
          </div>

          {/* Role tabs */}
          <div
            role="tablist"
            aria-label="Login as"
            className="flex border-b border-[rgba(55,53,47,0.09)]"
          >
            {ROLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={role === id}
                onClick={() => handleRoleChange(id)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                  role === id
                    ? "border-[#37352f] font-medium text-[#37352f]"
                    : "border-transparent text-[#787774] hover:bg-[rgba(55,53,47,0.06)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Admin email / Trainer username */}
            {role === "admin" ? (
              <AnimatedInput
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            ) : (
              <AnimatedInput
                label="Username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
              />
            )}

            {/* Password */}
            <AnimatedInput
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[4px] bg-[#fdebec] px-3 py-2 text-sm"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#e03e3e]" />

                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <AnimatedButton
              type="submit"
              isLoading={loading}
              className="w-full"
            >
              {role === "trainer"
                ? "Login as trainer"
                : "Login"}
            </AnimatedButton>
          </form>
        </div>
      </div>
    </div>
  );
}
