import {
  MetaConfirmWarningModal,
  ConnectDataSourceModal,
} from "@/components/admin/meta/meta-credential-modals";
import { MetaAssetLocatorModal } from "@/components/admin/meta/meta-asset-locator-modal";
import { DiagnosticsReviewModal } from "@/components/admin/meta/diagnostics-review-modal";
import { EventDetailDrawer, type DrawerEventData } from "@/components/admin/meta/event-detail-drawer";

interface EventsModalsProps {
  isConnectModalOpen: boolean;
  onCloseConnectModal: () => void;
  onConnectOptionSelect: (optionKey: "web" | "server" | "catalog" | "domain") => void;
  isGuideOpen: boolean;
  onCloseGuide: () => void;
  guideAssetId: string;
  warningModalState: {
    isOpen: boolean;
    title: string;
    description: string;
    confirmButtonText?: string;
    onConfirm: () => Promise<void> | void;
  };
  onCloseWarningModal: () => void;
  isDiagnosticsModalOpen: boolean;
  onCloseDiagnosticsModal: () => void;
  pixelId: string;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  selectedDrawerEvent: DrawerEventData | null;
  onSimulateEvent: (eventName: string) => void;
  simulating: boolean;
}

export function EventsModals({
  isConnectModalOpen,
  onCloseConnectModal,
  onConnectOptionSelect,
  isGuideOpen,
  onCloseGuide,
  guideAssetId,
  warningModalState,
  onCloseWarningModal,
  isDiagnosticsModalOpen,
  onCloseDiagnosticsModal,
  pixelId,
  isDrawerOpen,
  onCloseDrawer,
  selectedDrawerEvent,
  onSimulateEvent,
  simulating,
}: EventsModalsProps) {
  return (
    <>
      {/* Connect Data Source White Modal */}
      <ConnectDataSourceModal
        isOpen={isConnectModalOpen}
        onClose={onCloseConnectModal}
        onSelectOption={onConnectOptionSelect}
      />

      {/* Meta Asset Locator Modal */}
      <MetaAssetLocatorModal
        isOpen={isGuideOpen}
        onClose={onCloseGuide}
        defaultAssetId={guideAssetId}
      />

      {/* Standardized White Destructive Warning Confirmation Modal */}
      <MetaConfirmWarningModal
        isOpen={warningModalState.isOpen}
        onClose={onCloseWarningModal}
        title={warningModalState.title}
        description={warningModalState.description}
        confirmButtonText={warningModalState.confirmButtonText}
        onConfirm={warningModalState.onConfirm}
      />

      {/* Meta Diagnostics Review Solution Modal */}
      <DiagnosticsReviewModal
        isOpen={isDiagnosticsModalOpen}
        onClose={onCloseDiagnosticsModal}
        pixelId={pixelId || "1304551066085265"}
      />

      {/* Event Details Slide-Over Drawer */}
      <EventDetailDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        event={selectedDrawerEvent}
        onSimulate={onSimulateEvent}
        simulating={simulating}
      />
    </>
  );
}
