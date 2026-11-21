"use client";

import { useCheckoutFlow } from "./_hooks/use-checkout-flow";
import { CheckoutSkeleton } from "./_components/checkout-skeleton";
import { EmptyBagView } from "./_components/empty-bag-view";
import { OrderSuccessView } from "./_components/order-success-view";
import { CheckoutHeader, CheckoutTitle } from "./_components/checkout-header";
import { ShippingBillingCard } from "./_components/shipping-billing-card";
import { PaymentDeliveryMethodsCard } from "./_components/payment-delivery-methods-card";
import { StarTechOrderSummary } from "./_components/startech-order-summary";
import { AuthModal } from "@/components/checkout/auth-modal";
import { EmailVerifyDialog } from "@/components/checkout/email-verify-dialog";
import type { CheckoutFormValues } from "./_types/checkout.types";

export default function CheckoutPage() {
  const flow = useCheckoutFlow();

  // 1. Hydration loading skeleton
  if (!flow.mounted) {
    return <CheckoutSkeleton />;
  }

  // 2. Order Success Screen
  if (flow.submitted) {
    return (
      <OrderSuccessView
        orderId={flow.orderId}
        paymentMethod={flow.paymentMethod}
        confirmedSubtotal={flow.confirmedSubtotal}
        confirmedShippingFee={flow.confirmedShippingFee}
        confirmedDiscount={flow.confirmedDiscount}
        confirmedPromoCode={flow.confirmedPromoCode}
        confirmedTotal={flow.confirmedTotal}
        confirmedCustomer={flow.confirmedCustomer}
        accountInfo={flow.accountInfo}
        isEmailVerified={flow.isEmailVerified}
        isGuestOrder={flow.isGuestOrder}
        guestEmail={flow.guestEmail}
        postOrderPassword={flow.postOrderPassword}
        setPostOrderPassword={flow.setPostOrderPassword}
        showPostPassword={flow.showPostPassword}
        setShowPostPassword={flow.setShowPostPassword}
        savingPostAccount={flow.savingPostAccount}
        postAccountSuccess={flow.postAccountSuccess}
        postAccountError={flow.postAccountError}
        onSavePostAccountPassword={flow.handleSavePostAccountPassword}
      />
    );
  }

  // 3. Empty Bag Screen
  if (flow.items.length === 0) {
    return <EmptyBagView />;
  }

  const handleOrderSubmit = async (data: CheckoutFormValues) => {
    await flow.onSubmit(data, false, flow.paymentMethod);
  };

  return (
    <div className="min-h-screen bg-[#530911] text-white">
      <CheckoutHeader />

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <CheckoutTitle />

        {/* ── Main Two-Column Layout ── */}
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] xl:grid-cols-[1.3fr_0.7fr] items-start">
          {/* ── LEFT COLUMN: Shipping & Payment ── */}
          <div className="space-y-6">
            {/* 1. Shipping & Billing */}
            <ShippingBillingCard
              register={flow.register}
              errors={flow.errors}
              setValue={flow.setValue}
              getValues={flow.getValues}
              isLoggedIn={flow.isLoggedIn}
              isEmailVerified={flow.isEmailVerified}
            />

            {/* 2. Payment Method */}
            <PaymentDeliveryMethodsCard
              paymentMethod={flow.paymentMethod}
              setPaymentMethod={flow.setPaymentMethod}
              onlinePaymentAvailable={flow.checkoutConfig?.onlinePaymentAvailable === true}
            />
          </div>

          {/* ── RIGHT COLUMN: Sticky Order Summary ── */}
          <StarTechOrderSummary
            items={flow.items}
            onUpdateQuantity={flow.updateQuantity}
            onRemoveItem={flow.removeItem}
            subtotal={flow.subtotal}
            deliveryMethod={flow.deliveryMethod}
            pickupLocation={flow.pickupLocation}
            effectiveShippingFee={flow.effectiveShippingFee}
            isFreeDelivery={Boolean(flow.shippingQuote?.isFree)}
            appliedPromo={flow.appliedPromo}
            discountAmount={flow.discountAmount}
            finalTotal={flow.finalTotal}
            couponCode={flow.couponCode}
            setCouponCode={flow.setCouponCode}
            couponLoading={flow.couponLoading}
            couponMessage={flow.couponMessage}
            couponError={flow.couponError}
            onApplyCoupon={flow.handleApplyCoupon}
            onRemoveCoupon={flow.handleRemoveCoupon}
            policyAccepted={flow.policyAccepted}
            setPolicyAccepted={flow.setPolicyAccepted}
            placing={flow.placing}
            submitError={flow.submitError}
            paymentMethod={flow.paymentMethod}
            onConfirmOrder={() => {
              void flow.handleSubmit(handleOrderSubmit)();
            }}
          />
        </div>
      </div>

      {/* ── Auth Modal (Login / Register) ── */}
      <AuthModal
        isOpen={flow.authModalOpen}
        initialView={flow.authModalView}
        onClose={() => flow.setAuthModalOpen(false)}
        onSuccess={flow.handleAuthSuccess}
      />

      {/* ── Fallback Verification Dialog ── */}
      {flow.verifyDialog && (
        <EmailVerifyDialog
          email={flow.verifyDialog.email}
          name={flow.verifyDialog.name}
          phone={flow.verifyDialog.phone}
          initialResendAfter={flow.verifyDialog.resendAfter}
          onVerified={flow.handleVerifiedFallback}
          onClose={() => {
            flow.pendingOrderValues.current = null;
            flow.setVerifyDialog(null);
          }}
        />
      )}
    </div>
  );
}
