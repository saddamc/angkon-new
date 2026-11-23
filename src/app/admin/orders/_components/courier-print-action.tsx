import type { MouseEvent, ReactNode } from "react";
import { ExternalLink, Printer } from "lucide-react";
import type { ShipmentRecord, WCOrder } from "../_types/orders.types";
import { printCourierLabel } from "./print-label";

const STEADFAST_MERCHANT_LOGIN = "https://steadfast.com.bd/login";

interface CourierPrintActionProps {
  order: WCOrder;
  shipment?: ShipmentRecord | null;
  className: string;
  children?: ReactNode;
  iconClassName?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

/**
 * Steadfast has no documented public print endpoint. Its action opens the
 * official merchant portal so staff can print the official label there.
 * Other courier providers retain ANGKON's local packing slip fallback.
 */
export function CourierPrintAction({
  order,
  shipment,
  className,
  children,
  iconClassName = "h-3.5 w-3.5",
  iconOnly = false,
  ariaLabel,
  onClick,
}: CourierPrintActionProps) {
  const provider = String(shipment?.provider || order.courier || "").toLowerCase();
  const isSteadfast = provider === "steadfast";
  const code = shipment?.consignmentId || shipment?.trackingCode || order.consignmentId || order.trackingCode;
  const portalTitle = code
    ? `Open Steadfast merchant portal; find consignment ${code} and print its official label.`
    : "Open the Steadfast merchant portal to find and print the official label.";
  const handleClick = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  if (isSteadfast) {
    return (
      <a
        href={STEADFAST_MERCHANT_LOGIN}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={className}
        title={portalTitle}
        aria-label={ariaLabel || portalTitle}
      >
        <ExternalLink aria-hidden="true" className={iconClassName} />
        {!iconOnly && "Open Steadfast"}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        handleClick(event);
        printCourierLabel(order, shipment);
      }}
      className={className}
      title="Print ANGKON courier slip"
      aria-label={ariaLabel || "Print ANGKON courier slip"}
    >
      <Printer aria-hidden="true" className={iconClassName} />
      {children ?? "Print"}
    </button>
  );
}
