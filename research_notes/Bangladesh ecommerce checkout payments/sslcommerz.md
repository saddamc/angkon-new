# SSLCOMMERZ Hosted Checkout and Bangladesh Payment Channels

## Should checkout offer one generic online-payment choice or separate channel choices?

### Takeaway
For a standard hosted-checkout integration, show one site-level choice such as **“Online payment — cards, mobile banking and internet banking”** (optionally “via SSLCOMMERZ”), then redirect to SSLCOMMERZ’s hosted payment page to choose a channel. Do not send `multi_card_name` when the intention is to let customers see all available methods; that parameter is for customizing/filtering the gateway list, not required to expose one option per method on the merchant site.

### Cited Findings
- SSLCOMMERZ documents hosted payment as redirecting the customer to its hosted page “to display the payment channels”; the merchant server creates a session and redirects to the returned `GatewayPageURL`. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- The integration guide’s sample initiation code explicitly comments out `$post_data['multi_card_name']` with `# DISABLE TO DISPLAY ALL AVAILABLE`. The parameter description says it can control the gateway list shown on the SSLCOMMERZ selection page; it lists individual gateway names and group keys such as `mobilebank`, `internetbank`, `visacard`, and `mastercard`. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- The session-initiation response exposes active gateways in `gw` (grouped into Visa, Master, Amex, other cards, internet banking and mobile banking) and individual gateway descriptions in `desc`; the guide identifies `GatewayPageURL` as the URL to redirect customers to pay. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- SSLCOMMERZ says enabled major payment channels depend on acceptance and certification by the respective banks. — [SSLCOMMERZ merchant terms, §2.3](https://signup.sslcommerz.com/term-condition)

### Inferences
- A single generic “Online payment” option is the clearest fit when using the hosted page: channel choice happens after redirect, not as a website-side payment-method selection. If checkout copy names specific methods, qualify it (e.g. “available methods shown at payment”) rather than guaranteeing that every method is enabled for this merchant.
- If a merchant deliberately wants a restricted list or direct-to-channel flow, configure `multi_card_name` only after confirming valid keys and enabled channels against that merchant’s session response/account. Don’t hard-code an old sample list as the current production availability list.

### Gaps
- Public documentation does not establish the specific channels enabled for this merchant’s production store; that must be confirmed from its live session response/merchant account or with SSLCOMMERZ.

## Which Bangladesh payment channels are supported, and what operational caveats matter?

### Takeaway
SSLCOMMERZ publicly describes broad card, mobile-financial-service/mobile-banking, internet-banking, wallet and EMI coverage. Its current public pricing explicitly names Visa, Mastercard, bKash, Nagad and Rocket; treat those as examples of platform coverage—not a guarantee that every method is active for a particular merchant or transaction.

### Cited Findings
- The current SSLCOMMERZ home page advertises 33+ payment options, including debit/credit/prepaid cards, 10 mobile-banking brands, 10 internet-banking brands, four e-wallets and 30+ EMI-providing banks; its channel logos include Visa, Mastercard, UnionPay, DBBL Nexus, QCash, bKash, Nagad, Rocket, Upay and other wallets. These are provider-wide marketing claims. — [SSLCOMMERZ home page](https://sslcommerz.com/)
- SSLCOMMERZ’s pricing page lists standard-channel examples as Visa, Mastercard, bKash, Nagad and Rocket, and publishes fees of 2.5% per successful transaction (3.5% for AMEX) on its Basic plan. — [SSLCOMMERZ pricing](https://sslcommerz.com/pricing/)
- The API guide categorizes active gateways as Visa, Mastercard, Amex, other cards, internet banking and mobile banking. Its sample `desc` entries include bKash, DBBL mobile banking, IBBL, Citytouch, Bank Asia, and card schemes/bank-issued cards. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- SSLCOMMERZ terms state that channel enablement is subject to acceptance/certification by respective banks; the guide says the initiation response’s `gw` lists active gateways. — [Merchant terms, §2.3](https://signup.sslcommerz.com/term-condition); [v4 integration guide](https://sslcommerz.com/integration-document/)
- Integration is server-side for security/data-integrity reasons. SSLCOMMERZ requires transaction and amount validation via its Order Validation API and recommends IPN to avoid missing notifications when a customer does not return to the merchant site; IPN may arrive independently of the customer session. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- The guide identifies payment states including `VALID`, `FAILED`, `CANCELLED`, `UNATTEMPTED` and `EXPIRED`, and tells merchants to validate transaction ID, amount and currency before updating orders. It also describes risk-level fields, with risk level 1 as high risk. — [SSLCOMMERZ v4 integration guide](https://sslcommerz.com/integration-document/)
- SSLCOMMERZ’s current FAQ says transaction limits depend on the acquiring bank and gives 5 lakh BDT as the standard single-transaction limit; the v4 guide gives a 10–500,000 BDT transaction range. — [SSLCOMMERZ FAQ](https://sslcommerz.com/faq/); [v4 integration guide](https://sslcommerz.com/integration-document/)
- The merchant terms allow SSLCOMMERZ to revise merchant service fees/TDRs with written notice. — [SSLCOMMERZ merchant terms, §2.4](https://signup.sslcommerz.com/term-condition)

### Inferences
- Safer customer-facing wording: “Pay online by card, mobile banking or internet banking. Available methods are shown on SSLCOMMERZ’s secure payment page.” Mention bKash/Nagad/Rocket only if the merchant confirms they are active for its store.
- Fulfil orders only after server-side validation, not merely because the browser reached a success URL. Process IPN idempotently and reconcile the returned transaction ID, status, amount and currency with the order.
- Confirm active channels, transaction limits, applicable fees and risk-handling policy with the merchant’s SSLCOMMERZ account. Published provider-wide lists and marketing counts can change and do not override acquiring-bank or merchant-specific enablement.

### Gaps
- Public docs/pages do not provide a definitive, continuously updated production channel roster by merchant or guarantee availability by card type, issuer, transaction amount or customer eligibility. The API response/account manager is needed for that check.
- The v4 API guide is labeled updated May 12, 2019 even though SSLCOMMERZ currently republishes it on its integration page; use it for integration semantics, but confirm operational limits and the current fee schedule with SSLCOMMERZ before launch.
