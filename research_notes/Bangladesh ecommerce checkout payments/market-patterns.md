# Bangladesh Ecommerce Customer-Facing Payment Choices

## What payment pattern do major Bangladesh retailers publicly present?

### Takeaway
The public-facing pattern in the retailer examples reviewed is a choice between **cash on delivery (COD)** and **prepaid online payment**. Online payment is represented by mobile financial services—especially bKash—and cards; the exact channels vary by retailer. This is a pattern in the sources, not a measured market-share claim.

### Cited Findings
- Daraz Bangladesh’s buyer help article lists COD, Visa/Mastercard/AMEX cards, and bKash as ways to pay. — [Daraz: How do I pay on Daraz?](https://helpcenter.daraz.com.bd/page/knowledge?pageId=11&category=1000004617&knowledge=1000080453&language=en)
- Aarong’s Bangladesh billing page describes full advance payment or COD for domestic orders. Its FAQ lists Visa, Mastercard, DBBL Nexus and AMEX debit/credit/prepaid cards, mobile wallets including bKash, and COD. — [Aarong: Billing & Payments](https://aarong.com/bgd/billing-and-payments); [Aarong FAQ](https://mcprod.aarong.com/faq)
- Aarong’s terms describe accepted methods as card transactions, mobile financial services, bank transfers or COD, “as applicable”; this is a conditional list, not a promise that each method is offered on every order. — [Aarong Terms & Conditions](https://aarong.com/bgd/terms-and-conditions)
- Chaldal’s FAQ offers COD or online payment through bKash and credit card, and says customers may pay online any time before receipt. This is a non-apparel retailer corroborating the broad COD/prepaid split. — [Chaldal FAQ](https://chaldal.com/t/Help)
- Daraz describes a “DIGI COD” flow in which a customer pays on delivery by scanning a QR code with bKash/Nagad. That is a retailer-specific COD variant, not evidence that all COD orders support wallets. — [Daraz: DIGI COD payment process](https://helpcenter.daraz.com.bd/page/knowledge?pageId=11&category=1000020354&knowledge=1000105904&language=en)

### Inferences
- For a small apparel store, presenting COD and prepaid online as the two top-level choices is well matched to the public examples. Under online payment, show only the channels actually enabled for the store: e.g. bKash and cards, with Nagad only if merchant/gateway setup confirms it.
- Use “mobile payment” or list the enabled wallet brands explicitly; don’t imply a particular wallet is accepted merely because it is popular or supported by a provider generally.
- Make the COD amount/pay-on-delivery expectation and any delivery/COD restrictions clear before order placement. The sources show availability can be tied to order/location/applicability; they do not establish a universal COD policy.

### Gaps
- The retailer pages establish displayed payment choices, not which method is most used or a Bangladesh-wide COD-versus-prepaid split. No reliable transaction-share statistic was found in the reviewed official sources.
- Public pages do not give a universal rule for COD eligibility by apparel product, delivery location, order value, or customer.

## How should bKash, Nagad and cards be surfaced, and what is practical for a small store?

### Takeaway
Treat bKash/Nagad/cards as **online payment channels**, separate from the COD decision. A simple checkout can offer COD plus one online-payment path; the online step can then present the merchant’s confirmed wallets/cards. Never show unsupported brands or assume provider-wide acceptance means a particular store is live for them.

### Cited Findings
- bKash’s official Checkout terms describe bKash Checkout as a payment made to an online merchant and explain that the merchant confirms fulfilment/payment; if no confirmation is received, a held amount is automatically returned within a certain period. — [bKash Checkout Terms](https://bkash.com/en/page/terms-of-use-checkout)
- Nagad’s official merchant signup page says a merchant account enables digital payment acceptance from Nagad customers and offers facilities including Merchant QR and payment collection. — [Nagad: Be a Merchant](https://nagad.com.bd/en/forms?form=be-a-merchant)
- SSLCOMMERZ lists Visa, Mastercard, bKash, Nagad, Rocket and other channels on its public home/pricing pages, but its public offering is provider-wide; the specific options enabled for a merchant are not guaranteed by that list. — [SSLCOMMERZ](https://sslcommerz.com/); [SSLCOMMERZ Pricing](https://sslcommerz.com/pricing/)
- Aarong’s payment FAQ groups multiple card brands and mobile wallets in its accepted payment list; Daraz’s help article also lists card and bKash alongside COD. — [Aarong FAQ](https://mcprod.aarong.com/faq); [Daraz payment help](https://helpcenter.daraz.com.bd/page/knowledge?pageId=11&category=1000004617&knowledge=1000080453&language=en)

### Inferences
- **Practical UX:** show two clear top-level choices—“Cash on delivery” and “Pay online.” If online payment uses a hosted aggregator, name the actual enabled channel families (for example, “Cards / bKash / Nagad” only when confirmed) and let the provider’s checkout expose the active choices; see the companion [SSLCOMMERZ checkout notes](sslcommerz.md).
- If integrating a single-wallet checkout, label it directly (e.g. “Pay with bKash”) and make cancellation, pending-payment and retry states understandable. Do not request users to send money to a personal number as though it were integrated checkout; no reviewed major-retailer/provider source supported that as equivalent to online checkout.
- Before launch, verify production channel enablement, settlement/refund handling, and COD coverage with the actual provider/merchant account. A payment brand logo should correspond to a usable, tested route.

### Gaps
- Official public provider pages describe merchant capabilities, but do not confirm which channels a particular small apparel store can activate or the checkout UI it will receive. Confirm these with the provider and test the live merchant configuration.
- The reviewed pages do not establish customer preference ranking among bKash, Nagad, cards, or COD, nor does this review establish prevalence of direct-wallet, QR-on-delivery, or aggregator-hosted flows across all Bangladeshi stores.
