import { isDesignatedSchoolEmail, getSchoolInfoByEmail } from '../../src/service/school';
import schoolListing from '../../src/service/school/allowedSchools.json';

describe('School Service', () => {
  describe('allowedSchools.json validation', () => {
    it('should not have duplicate email domains across schools', () => {
      // Collect all domains from all schools
      const allDomains = new Set<string>();
      const duplicates: string[] = [];

      Object.entries(schoolListing).forEach(([schoolKey, school]) => {
        school.emailDomains.forEach(domain => {
          const cleanDomain = domain.replace('@', '').toLowerCase();
          if (allDomains.has(cleanDomain)) {
            duplicates.push(`Domain ${domain} in ${schoolKey} is duplicated`);
          }
          allDomains.add(cleanDomain);
        });
      });

      expect(duplicates).toEqual([]);
    });
  });

  describe('isDesignatedSchoolEmail', () => {
    it('should return true for exact domain matches', () => {
      expect(isDesignatedSchoolEmail('student@sfu.ca')).toBe(true);
      expect(isDesignatedSchoolEmail('student@ubc.ca')).toBe(true);
    });

    it('should return true for subdomains of allowed domains', () => {
      expect(isDesignatedSchoolEmail('student@student.ubc.ca')).toBe(true);
      expect(isDesignatedSchoolEmail('student@grad.ubc.ca')).toBe(true);
      expect(isDesignatedSchoolEmail('student@med.ubc.ca')).toBe(true);
    });

    it('should return false for non-matching domains', () => {
      expect(isDesignatedSchoolEmail('student@gmail.com')).toBe(false);
      expect(isDesignatedSchoolEmail('student@fake-ubc.ca')).toBe(false);
      expect(isDesignatedSchoolEmail('student@ubc.com')).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      expect(isDesignatedSchoolEmail('student@UBC.CA')).toBe(true);
      expect(isDesignatedSchoolEmail('student@STUDENT.UBC.CA')).toBe(true);
    });
  });

  describe('getSchoolInfoByEmail', () => {
    it('should return correct school info for valid email', () => {
      const result = getSchoolInfoByEmail('student@sfu.ca');
      expect(result.key).toBe('simon_fraser_university');
      expect(result.data.name).toBe('Simon Fraser University');
      expect(result.data.shortenedName).toBe('SFU');
    });

    it('should handle subdomains correctly', () => {
      const result = getSchoolInfoByEmail('student@cs.ubc.ca');
      expect(result.key).toBe('university_of_british_columbia');
      expect(result.data.name).toBe('University of British Columbia');
      expect(result.data.shortenedName).toBe('UBC');
    });

    it('should throw error for invalid email domain', () => {
      expect(() => getSchoolInfoByEmail('student@gmail.com')).toThrow('Email domain does not belong to any school');
    });
  });
});
