"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, ShoppingBag, ArrowRight } from "lucide-react";

export default function MyAccountPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      setMessage("Please enter both username/email and password.");
      return;
    }
    setIsLoggedIn(true);
    setMessage(null);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setMessage("Account registered successfully! A confirmation link has been sent to your email.");
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#400604] text-[#E1B76F] py-12 px-4">
        <div className="container mx-auto max-w-[1000px]">
          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5c0f0d] pb-6 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#cbb18a]">Welcome Back</span>
                <h1 className="font-heading text-3xl font-black uppercase text-[#E1B76F]">
                  {loginEmail.split("@")[0] || "Valued Patron"}
                </h1>
                <p className="text-xs text-[#cbb18a] mt-1 font-mono">{loginEmail}</p>
              </div>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="self-start sm:self-auto rounded-xl border border-[#E1B76F]/40 bg-[#400604] px-5 py-2 text-xs font-bold uppercase text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
              >
                Log out
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-5">
                <ShoppingBag className="h-6 w-6 text-[#E1B76F] mb-3" />
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">Recent Orders</h3>
                <p className="text-xs text-[#cbb18a] mt-1">Track and manage your online delivery status.</p>
                <div className="mt-4 pt-3 border-t border-[#5c0f0d] text-xs text-[#cbb18a]">
                  No orders placed yet.
                </div>
              </div>

              <div className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-5">
                <ShieldCheck className="h-6 w-6 text-[#E1B76F] mb-3" />
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">Addresses</h3>
                <p className="text-xs text-[#cbb18a] mt-1">Manage delivery addresses across all 64 districts.</p>
                <div className="mt-4 pt-3 border-t border-[#5c0f0d] text-xs text-[#cbb18a]">
                  Default shipping address not set.
                </div>
              </div>

              <div className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-5">
                <User className="h-6 w-6 text-[#E1B76F] mb-3" />
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">Account Details</h3>
                <p className="text-xs text-[#cbb18a] mt-1">Update your password, phone number, and email.</p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#E1B76F] underline pt-3"
                >
                  Start Shopping <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Top Banner */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-10 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Customer Portal
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            My Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#f5ebd8]">
            Sign in to track orders, manage addresses, or register for expedited checkout.
          </p>
        </div>
      </div>

      {message && (
        <div className="container mx-auto max-w-[1100px] px-4 pt-6">
          <div className="rounded-xl border border-[#E1B76F]/50 bg-[#2b0403] p-4 text-center text-sm font-bold text-[#E1B76F]">
            {message}
          </div>
        </div>
      )}

      {/* 2-Column Form matching WooCommerce & Gorur Ghash */}
      <div className="container mx-auto max-w-[1100px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Column 1: Login */}
          <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mb-6 pb-2 border-b border-[#5c0f0d]">
              Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Username or email address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Username or email"
                    className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#8c6b4b]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 pr-10 text-sm text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-[#8c6b4b] hover:text-[#E1B76F]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Social Login */}
              <div className="pt-2">
                <p className="text-xs text-[#cbb18a] mb-2 font-medium">
                  Login with your Facebook or Google account
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("google.user@example.com");
                      setIsLoggedIn(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#5c0f0d] bg-[#400604] py-2.5 px-3 text-xs font-bold text-[#f5ebd8] hover:border-[#E1B76F] transition"
                  >
                    <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("facebook.user@example.com");
                      setIsLoggedIn(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#5c0f0d] bg-[#400604] py-2.5 px-3 text-xs font-bold text-[#f5ebd8] hover:border-[#E1B76F] transition"
                  >
                    <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-[#cbb18a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#5c0f0d] bg-[#400604] text-[#E1B76F] focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="/contact"
                  className="text-xs text-[#E1B76F] hover:underline"
                >
                  Lost your password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] hover:bg-[#f3cb87] transition shadow-md"
              >
                Log in
              </button>
            </form>
          </div>

          {/* Column 2: Register */}
          <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mb-6 pb-2 border-b border-[#5c0f0d]">
              Register
            </h2>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Email address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#8c6b4b]" />
                </div>
              </div>

              <p className="text-xs text-[#cbb18a] leading-relaxed">
                A link to set a new password will be sent to your email address.
              </p>

              {/* Social Register */}
              <div className="pt-2">
                <p className="text-xs text-[#cbb18a] mb-2 font-medium">
                  Register with your Facebook or Google account
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("google.registered@example.com");
                      setIsLoggedIn(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#5c0f0d] bg-[#400604] py-2.5 px-3 text-xs font-bold text-[#f5ebd8] hover:border-[#E1B76F] transition"
                  >
                    <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail("facebook.registered@example.com");
                      setIsLoggedIn(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#5c0f0d] bg-[#400604] py-2.5 px-3 text-xs font-bold text-[#f5ebd8] hover:border-[#E1B76F] transition"
                  >
                    <svg className="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#cbb18a]/80 leading-relaxed pt-2">
                Your personal data will be used to support your experience throughout this website, to manage access to your account, and for other purposes described in our{" "}
                <Link href="/privacy" className="text-[#E1B76F] underline">
                  privacy policy
                </Link>
                .
              </p>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] hover:bg-[#f3cb87] transition shadow-md"
              >
                Register
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
