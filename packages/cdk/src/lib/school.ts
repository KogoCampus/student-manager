import schoolInfoJson from '../constants/schoolListing.json';

export interface SchoolListingJson {
  [schoolKey: string]: SchoolData;
}

export type SchoolData = {
  emailDomains: string[];
  name: string;
  shortenedName: string;
};

const schoolListing: SchoolListingJson = schoolInfoJson as SchoolListingJson;

export function isDesignatedSchoolEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return Object.values(schoolListing).some(item => item.emailDomains.some(schoolEmailDomain => schoolEmailDomain === `@${domain}`));
}

export function getSchoolDataByEmail(email: string): SchoolData {
  const domain = email.split('@')[1];
  const school = Object.values(schoolListing).find(item => item.emailDomains.some(schoolEmailDomain => schoolEmailDomain === `@${domain}`));
  if (!school) {
    throw new Error('Email domain does not belong to any school');
  }
  return school;
}
