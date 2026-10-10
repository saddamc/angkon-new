"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h2 className="font-display text-5xl uppercase">Something went wrong</h2>
      <p className="mt-3 max-w-md text-sm text-white/65">We could not load this experience right now. Please retry.</p>
      <Button className="mt-6" onClick={reset}>
        Try Again
      </Button>
    </section>
  );
}
