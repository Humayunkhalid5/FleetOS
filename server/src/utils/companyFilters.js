function filterCompaniesByLocation(companies = [], query = '') {
  const normalizedQuery = (query || '').trim().toLowerCase();

  if (!normalizedQuery) {
    return companies;
  }

  return companies.filter((company) => {
    const haystack = [
      company.name || '',
      company.location || '',
      company.city || '',
      company.country || '',
      company.slug || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

module.exports = { filterCompaniesByLocation };
