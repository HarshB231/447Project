export const CANONICAL_HEADERS = [
  'Last name',
  'First Name',
  "Employee's UMBC email",
  'Personal email',
  'Filed by',
  'Country of Birth',
  'All Citizenships',
  'Gender',
  'Case type',
  'Permanent residency notes',
  'Dependents',
  'initial H-1B start',
  'Start date',
  'Expiration Date',
  'Prep extension date',
  'Max H period',
  'Document Expiry I-94',
  'General notes',
  'soc code',
  'soc code description',
  'Department',
  'Employee Title',
  'Department Admin',
  'Department Advisor/PI/chair',
  'Annual Salary',
  'Employee Educational  Level',
  'Employee Educational Field',
];

// Map common variations to canonical keys
export const HEADER_ALIASES: Record<string, string> = {
  'last name': 'Last name',
  'lastname': 'Last name',
  'first name': 'First Name',
  'firstname': 'First Name',
  "employee's umbc email": "Employee's UMBC email",
  'umbc email': "Employee's UMBC email",
  'personal email': 'Personal email',
  'filed by': 'Filed by',
  'country of birth': 'Country of Birth',
  'all citizenships': 'All Citizenships',
  'gender': 'Gender',
  'case type': 'Case type',
  'permanent residency notes': 'Permanent residency notes',
  'dependents': 'Dependents',
  'initial h-1b start': 'initial H-1B start',
  'start date': 'Start date',
  'expiration date': 'Expiration Date',
  'prep extension date': 'Prep extension date',
  'max h period': 'Max H period',
  'document expiry i-94': 'Document Expiry I-94',
  'general notes': 'General notes',
  'soc code': 'soc code',
  'soc code description': 'soc code description',
  'department': 'Department',
  'employee title': 'Employee Title',
  'department admin': 'Department Admin',
  'department advisor/pi/chair': 'Department Advisor/PI/chair',
  'annual salary': 'Annual Salary',
  'employee educational  level': 'Employee Educational  Level',
  'employee educational level': 'Employee Educational  Level',
  'employee educational field': 'Employee Educational Field',
};

export function normalizeHeader(h: string): string {
  const key = h.trim();
  const lower = key.toLowerCase();
  return HEADER_ALIASES[lower] || key;
}

export function validateHeaders(headers: string[]): { ok: boolean; detected: string[]; missing: string[] } {
  const normalized = headers.map(normalizeHeader);
  const lowerSet = new Set(normalized.map(h => h.toLowerCase()));
  const missing = CANONICAL_HEADERS.filter(h => !lowerSet.has(h.toLowerCase()));
  return { ok: missing.length === 0, detected: normalized, missing };
}
