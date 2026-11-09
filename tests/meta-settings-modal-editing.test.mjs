import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Settings are edited through modals, never through an inline section form.
 *
 * Before this was enforced, 6 of the 15 editable rows swapped the whole
 * section into an inline form (so "Edit" did not open a modal), the domain
 * modals were rendered six times each, and the catalog "Remove" action sent
 * a payload the API ignores — so Remove silently did nothing.
 */

const PAGE = "src/app/admin/meta/settings/page.tsx";
const MODALS = "src/components/admin/meta/meta-credential-modals.tsx";

const page = fs.readFileSync(PAGE, "utf8");
const modals = fs.readFileSync(MODALS, "utf8");

function instances(source, tag) {
  const re = new RegExp(`<${tag}(?=[\\s/>])`, "g");
  return (source.match(re) || []).length;
}

test("settings: no row falls back to an inline section form", () => {
  assert.ok(
    !page.includes("setEditingSection"),
    "every Edit/Add must open a modal; inline section editing was removed"
  );
  assert.ok(
    !page.includes("editingSection"),
    "the inline-editing state variable should be gone entirely"
  );
});

test("settings: every previously-inline row now opens a modal", () => {
  const expected = [
    ["Business Name", "setIsBusinessModalOpen"],
    ["Business Portfolio ID", "setIsBusinessModalOpen"],
    ["Meta App ID", "setIsAppIdModalOpen"],
    ["Test Event Code", "setIsTestCodeModalOpen"],
    ["Tracking signals", "setIsTrackingSignalsModalOpen"],
  ];

  for (const [label, trigger] of expected) {
    const at = page.indexOf(`label: "${label}"`);
    assert.ok(at >= 0, `row "${label}" must exist`);
    const rowText = page.slice(at, at + 420);
    assert.ok(
      rowText.includes(trigger),
      `row "${label}" must open its modal via ${trigger}`
    );
  }
});

test("settings: .env-locked rows are read-only, not editable", () => {
  // These identifiers are driven by environment variables, so they are
  // deliberately locked instead of opening an edit modal.
  for (const label of ["Dataset / Pixel ID", "Ad Account ID", "Conversions API Dataset Token"]) {
    const at = page.indexOf(`label: "${label}"`);
    assert.ok(at >= 0, `the ${label} row must exist`);

    const rowText = page.slice(at, at + 420);
    assert.ok(rowText.includes("locked: true"), `${label} must be flagged locked`);
    assert.ok(rowText.includes("lockReason:"), `${label} must explain why it is locked`);
    assert.ok(!rowText.includes("onAction:"), `${label} must not open an edit modal`);
  }
});

test("settings: each modal component is rendered exactly once", () => {
  // The three domain modals were previously duplicated six times each, which
  // stacked six overlays and six Escape listeners on top of one another.
  for (const tag of [
    "AddDomainModal",
    "ConfigureDomainTokenModal",
    "ConfigureAemPriorityModal",
    "ConfigureAdAccountModal",
    "ReplaceMarketingTokenModal",
    "UpdateBusinessIdModal",
    "ConfigureAppSecretModal",
    "ConfigureCapiTokenModal",
    "EditDatasetIdModal",
    "ConfigureTestCodeModal",
    "EditAppIdModal",
    "EditTrackingSignalsModal",
    "EditCatalogIdModal",
    "ConfigureCatalogTokenModal",
    "ConfigureFeedScheduleModal",
    "UpdateAttributionConfigModal",
    "MetaConfirmWarningModal",
  ]) {
    assert.equal(instances(page, tag), 1, `<${tag}> must be rendered once`);
  }
});

test("settings: the modals that were built but never wired are now used", () => {
  for (const tag of [
    "EditDatasetIdModal",
    "ConfigureTestCodeModal",
    "ConfigureCapiTokenModal",
    "EditAppIdModal",
    "EditTrackingSignalsModal",
  ]) {
    assert.equal(instances(page, tag), 1, `<${tag}> must be wired into the page`);
  }
});

test("modals: the shared shell can display the value being replaced", () => {
  assert.ok(modals.includes("currentValue?: string"), "ModalBase must accept currentValue");
  assert.ok(modals.includes("currentLabel"), "ModalBase must accept a label for the strip");
  assert.ok(
    modals.includes("Current value"),
    "ModalBase must default the strip label to 'Current value'"
  );
  assert.ok(
    modals.includes("{currentValue && ("),
    "the strip must be omitted entirely when there is no stored value"
  );
});

test("modals: every modal that replaces a value passes it to the shell", () => {
  // Each of these has a current-value prop available; they must forward it so
  // the operator can see what they are about to overwrite.
  const forwarded = [
    'currentValue={currentPixelId}',
    "currentValue={currentCode}",
    "currentValue={currentAccountId}",
    "currentValue={currentCatalogId}",
    "currentValue={currentToken || undefined}",
    "currentLabel=\"Current business portfolio\"",
    "currentLabel=\"Current attribution config\"",
    "currentLabel=\"Current feed schedule\"",
  ];
  for (const snippet of forwarded) {
    assert.ok(modals.includes(snippet), `expected ModalBase usage: ${snippet}`);
  }
});

test("modals: secrets show their masked stored value, never the plaintext", () => {
  for (const prop of ["currentMasked?: string"]) {
    assert.equal(
      (modals.match(new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
        .length,
      4,
      "all four credential modals must accept a masked current value"
    );
  }
  // The page supplies only masked forms — the raw secrets never reach a modal.
  assert.equal((page.match(/currentMasked=\{/g) || []).length, 4);
  assert.ok(
    !page.includes("currentMasked={data?.general.appSecret"),
    "no modal may receive an unmasked secret"
  );
});

test("settings: removing the catalog token actually clears it", () => {
  // The API only clears on `removeToken`; an empty catalogApiToken is treated
  // as "no change", so the old payload made Remove a no-op.
  assert.ok(
    page.includes("removeToken: true"),
    "catalog removal must send the removeToken flag"
  );
  assert.ok(
    !page.includes('catalogId, catalogApiToken: ""'),
    "an empty token string does not clear the stored credential"
  );
});

test("settings: sections expose no inline edit/save footer", () => {
  assert.equal(
    (page.match(/editing=\{false\}/g) || []).length,
    8,
    "all eight sections run in read-only mode"
  );
  assert.equal(
    (page.match(/canEdit=\{false\}/g) || []).length,
    8,
    "no section header offers an inline Edit button"
  );
  assert.ok(
    !page.includes("Save changes"),
    "the inline Save button was removed along with the inline form"
  );
});

test("settings: tracking signals are editable from their own row", () => {
  const at = page.indexOf('label: "Tracking signals"');
  assert.ok(at >= 0, "the Tracking signals row must exist");
  const rowText = page.slice(at, at + 420);
  assert.ok(
    !rowText.includes("readOnly: true"),
    "tracking signals are a real input and must be editable"
  );
  assert.ok(rowText.includes("setIsTrackingSignalsModalOpen"));

  // The modal must exist and save through the dataset section.
  assert.equal(instances(page, "EditTrackingSignalsModal"), 1);
  assert.ok(page.includes('await handleSaveSection("dataset", { ...next })'));
});
