const bootstrap = require('./bootstrap');

(async () => {
  await bootstrap();
  const Company = require('../models/Company');
  const companies = await Company.find();
  console.log('Total companies:', companies.length);

  const cities = {};
  companies.forEach((c) => {
    cities[c.city] = (cities[c.city] || 0) + 1;
  });
  console.log('Companies per city:', JSON.stringify(cities, null, 2));

  const sectors = {};
  companies.forEach((c) => {
    const svc = (c.services || []).map((s) => s.name).join(', ');
    sectors[c.name] = `[${c.city}] ${svc}`;
  });
  console.log('\nAll companies:');
  Object.entries(sectors).forEach(([name, svc]) => console.log(`  - ${name}: ${svc}`));
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
