import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormGetValues } from "react-hook-form";
import { MapPin, CheckCircle2 } from "lucide-react";
import { DIVISIONS } from "@/data/bangladesh-districts";
import type { CheckoutFormValues } from "../_types/checkout.types";

interface ShippingBillingCardProps {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
  setValue: UseFormSetValue<CheckoutFormValues>;
  getValues: UseFormGetValues<CheckoutFormValues>;
  isLoggedIn: boolean;
  isEmailVerified: boolean;
}

export function ShippingBillingCard({
  register,
  errors,
  setValue,
  getValues,
  isLoggedIn,
  isEmailVerified,
}: ShippingBillingCardProps) {
  // Sync full name when first or last name changes
  const handleNameChange = () => {
    const first = getValues("firstName") || "";
    const last = getValues("lastName") || "";
    const combined = [first, last].filter(Boolean).join(" ").trim();
    if (combined) {
      setValue("name", combined, { shouldValidate: true });
    }
  };

  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm">
      {/* Card Header with Icon */}
      <div className="flex items-center gap-2.5 border-b border-[#E1B76F]/20 pb-3 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F] border border-[#E1B76F]/30">
          <MapPin className="h-4 w-4" />
        </div>
        <h2 className="text-base font-serif font-bold text-white tracking-wide">
          Shipping &amp; Billing
        </h2>
      </div>

      <div className="space-y-4">
        {/* Row 1: First Name & Last Name */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
              First Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="First Name*"
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                errors.firstName ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
              }`}
              {...register("firstName", {
                required: "First Name must be between 1 and 32 characters!",
                minLength: { value: 1, message: "First Name must be between 1 and 32 characters!" },
                maxLength: { value: 32, message: "First Name must be between 1 and 32 characters!" },
                onChange: handleNameChange,
              })}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
              Last Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Last Name*"
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                errors.lastName ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
              }`}
              {...register("lastName", {
                required: "Last Name is required",
                maxLength: { value: 32, message: "Last Name must be within 32 characters!" },
                onChange: handleNameChange,
              })}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Hidden name field to keep backwards-compatibility */}
        <input type="hidden" {...register("name")} />

        {/* Row 2: Full Address */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
            Address <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Address* (e.g. House #12, Road #4, Block C, Banani)"
            className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
              errors.streetAddress ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
            }`}
            {...register("streetAddress", {
              required: "Address must be between 3 and 128 characters!",
              minLength: { value: 3, message: "Address must be between 3 and 128 characters!" },
              maxLength: { value: 128, message: "Address must be between 3 and 128 characters!" },
            })}
          />
          {errors.streetAddress && (
            <p className="mt-1 text-xs text-rose-400 font-medium">{errors.streetAddress.message}</p>
          )}
        </div>

        {/* Row 3: Upazila/Thana & District */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
              Upazila / Thana <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Upazila/Thana*"
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                errors.city ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
              }`}
              {...register("city", {
                required: "Upazila/Thana is required",
              })}
            />
            {errors.city && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.city.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
              District <span className="text-rose-400">*</span>
            </label>
            <select
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                errors.district ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
              }`}
              {...register("district", { required: "Please select your district" })}
            >
              <option value="" className="bg-[#280504] text-stone-300 font-medium">
                Select District*
              </option>
              {DIVISIONS.map((div) => (
                <optgroup key={div.name} label={`${div.name} Division`} className="bg-[#3b050b] text-[#E1B76F] font-bold">
                  {div.districts.map((d) => (
                    <option key={d} value={d} className="bg-[#280504] text-white font-normal">
                      {d}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.district && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.district.message}</p>
            )}
          </div>
        </div>

        {/* Row 4: Mobile & Email */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
              Mobile <span className="text-rose-400">*</span>
            </label>
            <input
              type="tel"
              placeholder="Telephone* (01XXXXXXXXX)"
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                errors.phone ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"
              }`}
              {...register("phone", {
                required: "Phone number does not appear to be valid!",
                pattern: {
                  value: /^(?:\+?88)?01[3-9]\d{8}$/,
                  message: "Phone number does not appear to be valid! (e.g. 017XXXXXXXX)",
                },
              })}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-white tracking-wide">
                Email <span className="text-rose-400">*</span>
              </label>
              {isLoggedIn && isEmailVerified && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>
            <input
              type="email"
              placeholder="E-Mail*"
              autoComplete="email"
              readOnly={isLoggedIn && isEmailVerified}
              className={`h-11 w-full rounded-xl border bg-[#220406] px-3.5 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508] ${
                isLoggedIn && isEmailVerified ? "opacity-80 cursor-not-allowed " : ""
              }${errors.email ? "border-rose-400 bg-rose-950/25" : "border-[#E1B76F]/40"}`}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^\S+@\S+\.\S+$/, message: "Please enter a valid email address" },
              })}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Row 5: Comment */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-white tracking-wide">
            Comment
          </label>
          <textarea
            rows={2}
            placeholder="Any special requirement/instruction for us?"
            className="w-full rounded-xl border border-[#E1B76F]/40 bg-[#220406] p-3 text-sm font-medium text-white outline-none transition placeholder:text-stone-300/75 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:bg-[#2b0508]"
            {...register("orderNotes")}
          />
        </div>
      </div>
    </div>
  );
}
