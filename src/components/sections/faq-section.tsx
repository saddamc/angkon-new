"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How do I place an order on ANGKON?",
    answer: "Placing an order is simple! Browse our products, add them to your cart, and proceed to checkout. You can check out as a guest or create an account for a faster checkout process on your next visit.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept various payment methods including Cash on Delivery (COD), Mobile Banking (bKash, Nagad, Rocket), and major Credit/Debit Cards via our secure online payment gateway.",
  },
  {
    question: "How long does delivery take?",
    answer: "Delivery typically takes 1-3 business days inside Dhaka and 3-5 business days outside Dhaka. You will receive a tracking link once your order is dispatched.",
  },
  {
    question: "How do I find the right size for my clothing?",
    answer: "We provide detailed size charts and fit guides on every product page to help you choose the perfect size. If you have specific questions about a garment's fit or fabric, our customer support team is always ready to help you.",
  },
  {
    question: "What is your return policy?",
    answer: "We have a hassle-free 7-day return policy for defective or incorrect items. Please ensure the product is in its original packaging with all accessories included.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[#530911] py-12 border-t border-[#6e101c]">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1000px]">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl font-black uppercase text-white">Frequently Asked Questions</h2>
          <p className="text-white/70 mt-2 text-sm">Find answers to common questions about shopping with us.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`border rounded-2xl overflow-hidden transition-all duration-200 shadow-md ${isOpen ? 'border-[#E1B76F] bg-[#610c16]' : 'border-[#6e101c] bg-[#610c16]'}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left bg-[#610c16] hover:bg-[#3b050b] transition"
                >
                  <span className={`font-semibold text-[15px] ${isOpen ? 'text-white' : 'text-white/70'}`}>
                    {faq.question}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-white/70'}`} />
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-4 text-[14px] text-white/70 leading-relaxed border-t border-[#6e101c] bg-[#3b050b]">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

