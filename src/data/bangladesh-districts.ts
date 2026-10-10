// Bangladesh 64 districts — WooCommerce district-level state codes
// Codes verified from WC /wc/v3/data/countries/BD endpoint

export interface District {
  name: string;
  /** WooCommerce district-level state code, e.g. "BD-13" */
  wcCode: string;
  division: string;
}

export const DISTRICTS: District[] = [
  // Dhaka Division
  { name: "Dhaka",         wcCode: "BD-13", division: "Dhaka" },
  { name: "Gazipur",       wcCode: "BD-18", division: "Dhaka" },
  { name: "Narayanganj",   wcCode: "BD-40", division: "Dhaka" },
  { name: "Narsingdi",     wcCode: "BD-42", division: "Dhaka" },
  { name: "Manikganj",     wcCode: "BD-33", division: "Dhaka" },
  { name: "Munshiganj",    wcCode: "BD-35", division: "Dhaka" },
  { name: "Kishoreganj",   wcCode: "BD-26", division: "Dhaka" },
  { name: "Tangail",       wcCode: "BD-63", division: "Dhaka" },
  { name: "Faridpur",      wcCode: "BD-15", division: "Dhaka" },
  { name: "Gopalganj",     wcCode: "BD-17", division: "Dhaka" },
  { name: "Madaripur",     wcCode: "BD-36", division: "Dhaka" },
  { name: "Rajbari",       wcCode: "BD-53", division: "Dhaka" },
  { name: "Shariatpur",    wcCode: "BD-62", division: "Dhaka" },
  // Chittagong Division
  { name: "Chattogram",    wcCode: "BD-10", division: "Chittagong" },
  { name: "Cox's Bazar",   wcCode: "BD-11", division: "Chittagong" },
  { name: "Cumilla",       wcCode: "BD-08", division: "Chittagong" },
  { name: "Brahmanbaria",  wcCode: "BD-04", division: "Chittagong" },
  { name: "Chandpur",      wcCode: "BD-09", division: "Chittagong" },
  { name: "Lakshmipur",    wcCode: "BD-31", division: "Chittagong" },
  { name: "Noakhali",      wcCode: "BD-47", division: "Chittagong" },
  { name: "Feni",          wcCode: "BD-16", division: "Chittagong" },
  { name: "Rangamati",     wcCode: "BD-56", division: "Chittagong" },
  { name: "Khagrachhari",  wcCode: "BD-29", division: "Chittagong" },
  { name: "Bandarban",     wcCode: "BD-01", division: "Chittagong" },
  // Rajshahi Division
  { name: "Rajshahi",      wcCode: "BD-54", division: "Rajshahi" },
  { name: "Nawabganj",     wcCode: "BD-45", division: "Rajshahi" },
  { name: "Natore",        wcCode: "BD-44", division: "Rajshahi" },
  { name: "Naogaon",       wcCode: "BD-48", division: "Rajshahi" },
  { name: "Bogura",        wcCode: "BD-03", division: "Rajshahi" },
  { name: "Joypurhat",     wcCode: "BD-24", division: "Rajshahi" },
  { name: "Sirajganj",     wcCode: "BD-59", division: "Rajshahi" },
  { name: "Pabna",         wcCode: "BD-49", division: "Rajshahi" },
  // Khulna Division
  { name: "Khulna",        wcCode: "BD-27", division: "Khulna" },
  { name: "Bagerhat",      wcCode: "BD-05", division: "Khulna" },
  { name: "Satkhira",      wcCode: "BD-58", division: "Khulna" },
  { name: "Jashore",       wcCode: "BD-22", division: "Khulna" },
  { name: "Jhenaidah",     wcCode: "BD-23", division: "Khulna" },
  { name: "Magura",        wcCode: "BD-37", division: "Khulna" },
  { name: "Narail",        wcCode: "BD-43", division: "Khulna" },
  { name: "Kushtia",       wcCode: "BD-30", division: "Khulna" },
  { name: "Meherpur",      wcCode: "BD-39", division: "Khulna" },
  { name: "Chuadanga",     wcCode: "BD-12", division: "Khulna" },
  // Barishal Division
  { name: "Barishal",      wcCode: "BD-06", division: "Barishal" },
  { name: "Pirojpur",      wcCode: "BD-50", division: "Barishal" },
  { name: "Jhalokati",     wcCode: "BD-25", division: "Barishal" },
  { name: "Bhola",         wcCode: "BD-07", division: "Barishal" },
  { name: "Patuakhali",    wcCode: "BD-51", division: "Barishal" },
  { name: "Barguna",       wcCode: "BD-02", division: "Barishal" },
  // Sylhet Division
  { name: "Sylhet",        wcCode: "BD-60", division: "Sylhet" },
  { name: "Moulvibazar",   wcCode: "BD-38", division: "Sylhet" },
  { name: "Habiganj",      wcCode: "BD-20", division: "Sylhet" },
  { name: "Sunamganj",     wcCode: "BD-61", division: "Sylhet" },
  // Rangpur Division
  { name: "Rangpur",       wcCode: "BD-55", division: "Rangpur" },
  { name: "Dinajpur",      wcCode: "BD-14", division: "Rangpur" },
  { name: "Thakurgaon",    wcCode: "BD-64", division: "Rangpur" },
  { name: "Panchagarh",    wcCode: "BD-52", division: "Rangpur" },
  { name: "Gaibandha",     wcCode: "BD-19", division: "Rangpur" },
  { name: "Lalmonirhat",   wcCode: "BD-32", division: "Rangpur" },
  { name: "Kurigram",      wcCode: "BD-28", division: "Rangpur" },
  { name: "Nilphamari",    wcCode: "BD-46", division: "Rangpur" },
  // Mymensingh Division
  { name: "Mymensingh",    wcCode: "BD-34", division: "Mymensingh" },
  { name: "Jamalpur",      wcCode: "BD-21", division: "Mymensingh" },
  { name: "Sherpur",       wcCode: "BD-57", division: "Mymensingh" },
  { name: "Netrakona",     wcCode: "BD-41", division: "Mymensingh" },
];

/** All unique division names in display order */
export const DIVISION_NAMES = [
  "Dhaka", "Chittagong", "Rajshahi", "Khulna",
  "Barishal", "Sylhet", "Rangpur", "Mymensingh",
] as const;

/** Districts grouped by division */
export const DISTRICTS_BY_DIVISION = DIVISION_NAMES.map((div) => ({
  name: div,
  districts: DISTRICTS.filter((d) => d.division === div),
}));

/**
 * Lowercase district name → WC district code (e.g. "dhaka" → "BD-13").
 * Handles both WC canonical names and common alternate spellings.
 */
export const DISTRICT_TO_WC_CODE: Record<string, string> = {};
// Alternate/legacy spellings → canonical WC code
const ALIASES: Record<string, string> = {
  "chittagong": "BD-10",   // WC uses "Chattogram"
  "comilla":    "BD-08",   // WC uses "Cumilla"
  "jessore":    "BD-22",   // WC uses "Jashore"
  "bogra":      "BD-03",   // WC uses "Bogura"
  "chapainawabganj": "BD-45", // WC uses "Nawabganj"
  "netrokona":  "BD-41",   // WC uses "Netrakona"
  "barisal":    "BD-06",   // WC uses "Barishal"
  "coxs bazar": "BD-11",
  "cox bazar":  "BD-11",
};

for (const d of DISTRICTS) {
  DISTRICT_TO_WC_CODE[d.name.toLowerCase()] = d.wcCode;
  DISTRICT_TO_WC_CODE[d.name.toLowerCase().replace(/'/g, "")] = d.wcCode;
}
for (const [alias, code] of Object.entries(ALIASES)) {
  DISTRICT_TO_WC_CODE[alias] = code;
}

// Keep backward-compat export used in checkout page
export const DISTRICT_TO_BD_STATE = DISTRICT_TO_WC_CODE;

// Keep DIVISIONS shape for the dropdown
export const DIVISIONS = DISTRICTS_BY_DIVISION.map((div) => ({
  name: div.name,
  wcStateCode: "", // not used anymore
  districts: div.districts.map((d) => d.name),
}));
