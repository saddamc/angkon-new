import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { DIVISIONS } from "@/data/bangladesh-districts";
import type { CheckoutFormValues } from "../_types/checkout.types";

interface DeliveryDetailsStepProps {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
}

export function DeliveryDetailsStep({
  register,
  errors,
  isLoggedIn,
  isEmailVerified,
}: DeliveryDetailsStepProps) {
  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm space-y-4">
      <div className="border-b border-[#E1B76F]/20 pb-2 mb-2">
        <h2 className="text-base font-serif font-bold text-white">
          1. Delivery details
        </h2>
      </div>

      {/* Name & Phone */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white">
            Full name <span className="text-[#E1B76F]">*</span>
          </label>
          <input
            placeholder="Enter your name"
            className={`h-11 w-full rounded-xl border bg-[#42070e] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
              errors.name ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
            }`}
            {...register("name", { required: "Full name is required" })}
          />
          {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white">
            Phone number <span className="text-[#E1B76F]">*</span>
          </label>
          <input
            type="tel"
            placeholder="01XXXXXXXXX"
            className={`h-11 w-full rounded-xl border bg-[#42070e] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
              errors.phone ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
            }`}
            {...register("phone", {
              required: "Phone number is required",
              pattern: {
                value: /^(?:\+?88)?01[3-9]\d{8}$/,
                message: "Please enter a valid 11-digit Bangladeshi number (e.g. 017XXXXXXXX)",
              },
            })}
          />
          {errors.phone ? (
            <p className="mt-1 text-xs text-rose-300">{errors.phone.message}</p>
          ) : (
            <p className="mt-1 text-[11px] text-white/50">
              Delivery riders call this number to confirm delivery arrival.
            </p>
          )}
        </div>
      </div>

      {/* Email address */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-white">
            Email address <span className="text-[#E1B76F]">*</span>
          </label>
          {isLoggedIn && isEmailVerified && (
            <span className="text-xs text-emerald-400 font-medium">Verified — you&apos;re signed in.</span>
          )}
        </div>
        <input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          readOnly={isLoggedIn && isEmailVerified}
          className={`h-11 w-full rounded-xl border bg-[#42070e] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
            isLoggedIn && isEmailVerified ? "opacity-80 cursor-not-allowed " : ""
          }${errors.email ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"}`}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Please enter a valid email address" },
          })}
        />
        {errors.email ? (
          <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>
        ) : (
          <p className="mt-1 text-[11px] text-white/50">
            Order invoice &amp; courier tracking updates are sent to this address.
          </p>
        )}
      </div>

      {/* Street address */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white">
          Street address <span className="text-[#E1B76F]">*</span>
        </label>
        <input
          placeholder="House, road, area and landmark"
          className={`h-11 w-full rounded-xl border bg-[#42070e] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
            errors.streetAddress ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
          }`}
          {...register("streetAddress", { required: "Street address is required" })}
        />
        {errors.streetAddress && (
          <p className="mt-1 text-xs text-rose-300">{errors.streetAddress.message}</p>
        )}
      </div>

      {/* District & City / Upazila */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white">
            District <span className="text-[#E1B76F]">*</span>
          </label>
          <div className="relative">
            <select
              className={`h-11 w-full appearance-none rounded-xl border bg-[#42070e] px-3.5 pr-9 text-sm text-white outline-none transition focus:border-[#E1B76F] cursor-pointer ${
                errors.district ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
              }`}
              defaultValue=""
              {...register("district", { required: "Please select your delivery district" })}
            >
              <option value="" disabled className="text-white/40 bg-[#2d0302]">
                Select district
              </option>
              {DIVISIONS.map((div) => (
                <optgroup
                  key={div.name}
                  label={`── ${div.name} Division`}
                  className="font-bold text-white bg-[#42070e]"
                >
                  {div.districts.map((d) => (
                    <option key={d} value={d} className="text-white bg-[#2d0302]">
                      {d}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {errors.district && <p className="mt-1 text-xs text-rose-300">{errors.district.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-white">
            City / Upazila <span className="text-[#E1B76F]">*</span>
          </label>
          <input
            placeholder="Enter city or upazila"
            className={`h-11 w-full rounded-xl border bg-[#42070e] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
              errors.city ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
            }`}
            {...register("city", { required: "City / Upazila is required" })}
          />
          {errors.city && <p className="mt-1 text-xs text-rose-300">{errors.city.message}</p>}
        </div>
      </div>

      {/* Optional Order notes */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-white/80">
          Order notes (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Special instructions for delivery (e.g. call before arriving, landmark)"
          className="w-full resize-none rounded-xl border border-[#E1B76F]/30 bg-[#42070e] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F]"
          {...register("orderNotes")}
        />
      </div>
    </div>
  );
}
