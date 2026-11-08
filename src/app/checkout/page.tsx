"use client";

import { useCheckoutFlow } from "./_hooks/use-checkout-flow";
import { CheckoutSkeleton } from "./_components/checkout-skeleton";
import { EmptyBagView } from "./_components/empty-bag-view";
import { OrderSuccessView } from "./_components/order-success-view";
import { CheckoutHeader, CheckoutTitle } from "./_components/checkout-header";
import { AccountStepCard } from "./_components/account-step-card";
import { DeliveryDetailsStep } from "./_components/delivery-details-step";
import { PromoCodeStep } from "./_components/promo-code-step";
import { PaymentMethodStep } from "./_components/payment-method-step";
import { OrderSummarySidebar } from "./_components/order-summary-sidebar";
import { AuthModal } from "@/components/checkout/auth-modal";
import { EmailVerifyDialog } from "@/components/checkout/email-verify-dialog";

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

  // 4. Main Checkout Flow
  return (
    <div className="min-h-screen bg-[#530911] text-white">
      <CheckoutHeader />

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <CheckoutTitle />

        <form onSubmit={flow.handleSubmit((data) => flow.onSubmit(data))}>
          <div className="grid gap-8 lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.2fr_0.8fr] items-start">
            {/* ── LEFT COLUMN: Form Steps ── */}
            <div className="space-y-6">
              <AccountStepCard
                isLoggedIn={flow.isLoggedIn}
                loggedInEmail={flow.loggedInEmail}
                isEmailVerified={flow.isEmailVerified}
                onSignOut={flow.handleSignOut}
                onOpenLogin={() => {
                  flow.setAuthModalView("login");
                  flow.setAuthModalOpen(true);
                }}
                onOpenRegister={() => {
                  flow.setAuthModalView("register");
                  flow.setAuthModalOpen(true);
                }}
              />

              <DeliveryDetailsStep
                register={flow.register}
                errors={flow.errors}
                isLoggedIn={flow.isLoggedIn}
                isEmailVerified={flow.isEmailVerified}
              />

              {flow.checkoutConfig?.enablePromoCodes !== false && (
                <PromoCodeStep
                  couponCode={flow.couponCode}
                  setCouponCode={flow.setCouponCode}
                  appliedPromo={flow.appliedPromo}
                  couponLoading={flow.couponLoading}
                  couponMessage={flow.couponMessage}
                  couponError={flow.couponError}
                  onApplyCoupon={flow.handleApplyCoupon}
                  onRemoveCoupon={flow.handleRemoveCoupon}
                />
              )}

              <PaymentMethodStep
                paymentMethod={flow.paymentMethod}
                setPaymentMethod={flow.setPaymentMethod}
              />
            </div>

            {/* ── RIGHT COLUMN: Sticky Order Summary ── */}
            <OrderSummarySidebar
              items={flow.items}
              subtotal={flow.subtotal}
              shippingQuote={flow.shippingQuote}
              shippingLoading={flow.shippingLoading}
              discountAmount={flow.discountAmount}
              finalTotal={flow.finalTotal}
              isSubmitting={flow.isSubmitting}
              placing={flow.placing}
              submitError={flow.submitError}
            />
          </div>
        </form>
      </div>

      {/* ── Dedicated Auth Modal (Login / Register / OTP) ── */}
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
