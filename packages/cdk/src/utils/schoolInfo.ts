import schoolInfoJson from '../constants/schoolInfo.json';

export interface SchoolInfoJson {
  [schoolKey: string]: SchoolInfo;
}

export type SchoolInfo = {
  domain: string;
  name: string;
  shortenedName: string;
};

const schoolInfoMap: SchoolInfoJson = schoolInfoJson as SchoolInfoJson;

export function isDesignatedSchoolEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return Object.values(schoolInfoMap).some(school => school.domain === `@${domain}`);
}

export function getSchoolKeyByEmail(email: string): string {
  const domain = email.split('@')[1];
  const school = Object.values(schoolInfoMap).find(school => school.domain === `@${domain}`);
  if (!school) {
    throw new Error('Email domain does not belong to any school');
  }
  return Object.keys(schoolInfoMap).find(key => schoolInfoMap[key] === school)!;
}

export function getSchoolInfoByKey(schoolKey: string): SchoolInfo | null {
  return schoolInfoMap[schoolKey] || null;
}
