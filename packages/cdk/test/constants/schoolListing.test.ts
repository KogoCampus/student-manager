import schoolListing from '../../src/constants/schoolListing.json';

describe('School Listing Validation', () => {
  it('should have unique email domains across all schools', () => {
    // Create a map to track domains and their associated schools
    const domainMap = new Map<string, string>();
    const duplicateDomains: { domain: string, schools: string[] }[] = [];

    // Check each school and its domains
    Object.entries(schoolListing).forEach(([schoolId, schoolData]) => {
      schoolData.emailDomains.forEach(domain => {
        if (domainMap.has(domain)) {
          // Found a duplicate domain
          const existingSchool = domainMap.get(domain)!;
          const duplicateEntry = duplicateDomains.find(d => d.domain === domain);

          if (duplicateEntry) {
            duplicateEntry.schools.push(schoolId);
          } else {
            duplicateDomains.push({
              domain,
              schools: [existingSchool, schoolId]
            });
          }
        } else {
          // New domain
          domainMap.set(domain, schoolId);
        }
      });
    });

    // If duplicates were found, create a detailed error message
    if (duplicateDomains.length > 0) {
      const errorMessage = duplicateDomains
        .map(({ domain, schools }) => `Domain "${domain}" is used by multiple schools: ${schools.join(', ')}`)
        .join('\n');

      fail(`Found duplicate email domains:\n${errorMessage}`);
    }
  });
});
