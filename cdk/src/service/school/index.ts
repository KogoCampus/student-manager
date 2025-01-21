import schoolListing from './allowedSchools.json';

// Type for the school data structure
export interface SchoolData {
  emailDomains: string[];
  name: string;
  shortenedName: string | null;
}

// Type for the entire JSON structure where keys are school identifiers
export interface SchoolListing {
  [schoolKey: string]: SchoolData;
}

// Add new interface for school info that includes the key
export interface SchoolInfo {
  key: string;
  data: SchoolData;
}

export function isDesignatedSchoolEmail(email: string): boolean {
  const domain = email.split('@')[1].toLowerCase();
  return Object.values(schoolListing).some(school =>
    school.emailDomains.some(allowedDomain => {
      const cleanAllowedDomain = allowedDomain.replace('@', '').toLowerCase();
      // Check if it's an exact match or if it's a direct subdomain
      return domain === cleanAllowedDomain || domain.endsWith('.' + cleanAllowedDomain);
    }),
  );
}

export function getSchoolInfoByEmail(email: string): SchoolInfo {
  const domain = `@${email.split('@')[1]}`;
  const entry = Object.entries(schoolListing).find(([, school]) => school.emailDomains.includes(domain));

  if (!entry) {
    throw new Error('Email domain does not belong to any school');
  }

  const [key, data] = entry;
  return { key, data };
}

// Update existing function to use the new one
export function getSchoolDataByEmail(email: string): SchoolData {
  return getSchoolInfoByEmail(email).data;
}

// New utility functions that might be useful
export function getSchoolByKey(schoolKey: string): SchoolData | undefined {
  return (schoolListing as SchoolListing)[schoolKey];
}

export function getAllSchools(): SchoolListing {
  return schoolListing;
}

// Type guard to check if something is a SchoolData
export function isSchoolData(data: unknown): data is SchoolData {
  if (!data || typeof data !== 'object') return false;

  const schoolData = data as SchoolData;
  return (
    Array.isArray(schoolData.emailDomains) &&
    typeof schoolData.name === 'string' &&
    (typeof schoolData.shortenedName === 'string' || schoolData.shortenedName === null)
  );
}
