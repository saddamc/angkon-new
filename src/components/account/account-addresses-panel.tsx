"use client";

import { useState } from "react";
import { DISTRICTS } from "@/data/bangladesh-districts";
import { Check, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import type { AccountAddress, AccountNotice, AccountUserProfile } from "@/types/account";
import {
  AccountFieldLabel,
  accountInputClass,
  accountPrimaryBtnClass,
  accountSecondaryBtnClass,
  postJson,
} from "./account-ui";

interface AccountAddressesPanelProps {
  user: AccountUserProfile;
  onUserUpdated: (user: AccountUserProfile) => void;
  onNotice: (notice: AccountNotice) => void;
}

const DISTRICT_NAMES = Array.from(new Set(DISTRICTS.map((d) => d.name))).sort((a, b) =>
  a === "Dhaka" ? -1 : b === "Dhaka" ? 1 : a.localeCompare(b)
);

const EMPTY_FORM: AccountAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  district: "Dhaka",
  postalCode: "",
  isDefault: false,
};

export function AccountAddressesPanel({
  user,
  onUserUpdated,
  onNotice,
}: AccountAddressesPanelProps) {
  const addresses = user.addresses || [];

  const [formOpen, setFormOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<AccountAddress>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);

  const openAddForm = () => {
    setEditIndex(null);
    setForm({
      fullName: user.name || "",
      phone: user.phone || "",
      address: "",
      city: "",
      district: "Dhaka",
      postalCode: "",
      isDefault: addresses.length === 0,
    });
    setConfirmDeleteIdx(null);
    setFormOpen(true);
  };

  const openEditForm = (idx: number, addr: AccountAddress) => {
    setEditIndex(idx);
    setForm({
      fullName: addr.fullName || "",
      phone: addr.phone || "",
      address: addr.address || "",
      city: addr.city || "",
      district: addr.district || "Dhaka",
      postalCode: addr.postalCode || "",
      isDefault: Boolean(addr.isDefault),
    });
    setConfirmDeleteIdx(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = editIndex !== null;
      const payload = isEdit ? { index: editIndex, ...form } : form;
      const { ok, data } = await postJson(
        "/api/account/addresses",
        payload,
        isEdit ? "PATCH" : "POST"
      );
      if (!ok) {
        onNotice({ text: data.error || "Could not save delivery address.", type: "error" });
        return;
      }
      onUserUpdated(data.user as AccountUserProfile);
      closeForm();
      onNotice({
        text: isEdit ? "Delivery address updated." : "New delivery address saved.",
        type: "success",
      });
    } catch {
      onNotice({ text: "Network error while saving address.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (index: number) => {
    setBusyIndex(index);
    try {
      const { ok, data } = await postJson(
        "/api/account/addresses",
        { index, action: "set_default" },
        "PATCH"
      );
      if (!ok) {
        onNotice({ text: data.error || "Could not set default address.", type: "error" });
        return;
      }
      onUserUpdated(data.user as AccountUserProfile);
      onNotice({ text: "Default delivery address updated.", type: "success" });
    } catch {
      onNotice({ text: "Network error updating default address.", type: "error" });
    } finally {
      setBusyIndex(null);
    }
  };

  const handleDelete = async (index: number) => {
    setBusyIndex(index);
    try {
      const { ok, data } = await postJson(
        `/api/account/addresses?index=${index}`,
        undefined,
        "DELETE"
      );
      if (!ok) {
        onNotice({ text: data.error || "Could not delete address.", type: "error" });
        return;
      }
      setConfirmDeleteIdx(null);
      if (editIndex === index) closeForm();
      onUserUpdated(data.user as AccountUserProfile);
      onNotice({ text: "Delivery address removed.", type: "success" });
    } catch {
      onNotice({ text: "Network error removing address.", type: "error" });
    } finally {
      setBusyIndex(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 shadow-lg">
        <div>
          <h2 className="font-heading text-lg font-black uppercase text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#E1B76F]" />
            Saved Delivery Addresses
          </h2>
          <p className="text-xs sm:text-[13px] text-[#EADBC8] mt-1">
            Manage your Dhaka &amp; nationwide shipping destinations for quick checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={formOpen ? closeForm : openAddForm}
          className={accountSecondaryBtnClass}
        >
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? "Cancel" : "Add New Address"}
        </button>
      </div>

      {/* Interactive Add / Edit Form Drawer */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#E1B76F]/35 bg-[#3b050b] p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E1B76F]/15 pb-3">
            <h3 className="font-heading text-base font-black uppercase text-white">
              {editIndex !== null ? "Edit Delivery Address" : "Add New Delivery Address"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="text-xs font-semibold text-white/80 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <AccountFieldLabel required>Recipient Full Name</AccountFieldLabel>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. Ayesha Rahman"
                className={accountInputClass}
              />
            </div>
            <div>
              <AccountFieldLabel required>Recipient Mobile</AccountFieldLabel>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="017XXXXXXXX"
                className={accountInputClass}
              />
            </div>
          </div>

          <div>
            <AccountFieldLabel required>Street / House / Road Details</AccountFieldLabel>
            <input
              type="text"
              required
              minLength={5}
              maxLength={260}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="House, Road, Flat/Floor, Landmark"
              className={accountInputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <AccountFieldLabel required>Area / Thana / City</AccountFieldLabel>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Banani, Dhanmondi, Savar"
                className={accountInputClass}
              />
            </div>
            <div>
              <AccountFieldLabel required>District</AccountFieldLabel>
              <select
                required
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                className={accountInputClass}
              >
                {!DISTRICT_NAMES.includes(form.district) && form.district && (
                  <option value={form.district}>{form.district}</option>
                )}
                {DISTRICT_NAMES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <AccountFieldLabel>Postal Code</AccountFieldLabel>
              <input
                type="text"
                maxLength={20}
                value={form.postalCode || ""}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                placeholder="Optional (e.g. 1213)"
                className={accountInputClass}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 text-xs text-stone-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="h-4 w-4 accent-[#E1B76F] rounded cursor-pointer"
            />
            <span>Set as my default delivery address</span>
          </label>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button type="submit" disabled={saving} className={`${accountPrimaryBtnClass} sm:w-auto sm:px-8`}>
              {saving ? "Saving…" : editIndex !== null ? "Update Address" : "Save Delivery Address"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-stone-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-stone-200 hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#3b050b] p-10 text-center space-y-3 shadow-lg">
          <MapPin className="mx-auto h-10 w-10 text-[#E1B76F]/80" />
          <p className="text-sm font-bold text-white">No saved delivery addresses yet</p>
          <p className="text-xs sm:text-[13px] text-[#EADBC8] max-w-md mx-auto">
            Add your home or office address here, or place your next order and it will automatically sync here.
          </p>
          <div className="pt-2">
            <button type="button" onClick={openAddForm} className={accountSecondaryBtnClass}>
              <Plus className="h-3.5 w-3.5" /> Add Your First Address
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr, idx) => (
            <div
              key={`${addr.fullName}-${idx}`}
              className={`rounded-2xl border p-5 space-y-4 transition shadow-lg ${
                addr.isDefault
                  ? "border-[#E1B76F]/60 bg-[#3b050b]"
                  : "border-[#E1B76F]/25 bg-[#34040a] hover:border-[#E1B76F]/45"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white text-sm">{addr.fullName}</p>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2b0408] border border-[#E1B76F]/55 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#E1B76F]">
                        <Star className="h-3 w-3 fill-[#E1B76F]" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#E1B76F] mt-1 font-medium">{addr.phone}</p>
                </div>
              </div>

              <div className="text-xs sm:text-[13px] text-[#F5EAE0] leading-relaxed space-y-0.5">
                <p className="text-white font-medium">{addr.address}</p>
                <p>
                  {addr.city}, {addr.district}
                  {addr.postalCode ? ` — ${addr.postalCode}` : ""}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E1B76F]/15 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyIndex === idx}
                    onClick={() => openEditForm(idx, addr)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-[#2b0408] px-3 py-1.5 text-[11px] font-bold uppercase text-white hover:border-[#E1B76F]/60 cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>

                  {!addr.isDefault && (
                    <button
                      type="button"
                      disabled={busyIndex === idx}
                      onClick={() => void handleSetDefault(idx)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E1B76F]/40 bg-[#2b0408] px-3 py-1.5 text-[11px] font-bold uppercase text-[#E1B76F] hover:bg-[#490810] disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="h-3 w-3" /> Set Default
                    </button>
                  )}
                </div>

                {confirmDeleteIdx === idx ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busyIndex === idx}
                      onClick={() => void handleDelete(idx)}
                      className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-black uppercase text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                    >
                      Confirm Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteIdx(null)}
                      className="rounded-lg border border-white/25 px-2.5 py-1.5 text-[10px] font-bold uppercase text-white/90 hover:bg-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyIndex === idx}
                    onClick={() => setConfirmDeleteIdx(idx)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white/75 hover:text-rose-200 transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
