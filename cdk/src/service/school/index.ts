import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

// Type for the school data structure
export interface SchoolData {
  emailDomains: string[];
  name: string;
  shortenedName: string;
}

// Type for the entire YAML structure where keys are school identifiers
export interface SchoolListing {
  [schoolKey: string]: SchoolData;
}

// Add new interface for school info that includes the key
export interface SchoolInfo {
  key: string;
  data: SchoolData;
}

function loadSchoolListing(): SchoolListing {
  const yamlPath = path.resolve(__dirname, 'allowedSchools.yaml');
  const fileContents = fs.readFileSync(yamlPath, 'utf8');
  return yaml.load(fileContents) as SchoolListing;
}

// Load schools data once when the module is imported
const schoolListing = loadSchoolListing();

export function isDesignatedSchoolEmail(email: string): boolean {
  const domain = `@${email.split('@')[1]}`;
  return Object.values(schoolListing).some(school => school.emailDomains.includes(domain));
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
  return schoolListing[schoolKey];
}

export function getAllSchools(): SchoolListing {
  return schoolListing;
}

// Type guard to check if something is a SchoolData
export function isSchoolData(data: unknown): data is SchoolData {
  if (!data || typeof data !== 'object') return false;

  const schoolData = data as SchoolData;
  return Array.isArray(schoolData.emailDomains) && typeof schoolData.name === 'string' && typeof schoolData.shortenedName === 'string';
}
