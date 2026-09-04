const allModules = { requests: true, workforce: true, inventory: true, customers: true, chat: true, reviews: true, analytics: true, tracking: true };

// This is deliberately a capability map, not a visual-only label map.  A
// company selects its business model at registration and the workspace only
// exposes the operational modules that make sense for that model.  "Other"
// remains a fully capable workspace for businesses that do not fit a preset.
const BUSINESS_CATEGORIES = [
  { value: 'field-services', label: 'Field & home services', requestLabel: 'Requests', workforceLabel: 'Technicians', offeringLabel: 'Services', inventoryLabel: 'Parts & materials', inventoryCategories: ['Installation materials', 'Repair parts', 'Tools & equipment', 'Safety supplies'], modules: allModules },
  { value: 'retail-products', label: 'Retail & product sales', requestLabel: 'Orders', workforceLabel: 'Store staff', offeringLabel: 'Products & offers', inventoryLabel: 'Product stock', inventoryCategories: ['Products', 'Accessories', 'Packaging', 'Promotional stock'], modules: { ...allModules, workforce: false, tracking: false } },
  { value: 'oil-energy', label: 'Oil, gas & energy', requestLabel: 'Supply orders', workforceLabel: 'Field staff', offeringLabel: 'Products & supply services', inventoryLabel: 'Supply inventory', inventoryCategories: ['Fuel products', 'Lubricants', 'Cylinders & containers', 'Safety equipment'], modules: allModules },
  { value: 'digital-technology', label: 'Digital & technology', requestLabel: 'Projects & requests', workforceLabel: 'Specialists', offeringLabel: 'Digital services', inventoryLabel: 'Equipment & licenses', inventoryCategories: ['Devices & equipment', 'Software & licenses', 'Digital add-ons', 'Support materials'], modules: { ...allModules, tracking: false } },
  { value: 'professional-services', label: 'Professional services', requestLabel: 'Client work', workforceLabel: 'Consultants', offeringLabel: 'Service packages', inventoryLabel: 'Business supplies', inventoryCategories: ['Office supplies', 'Client materials', 'Equipment', 'Service add-ons'], modules: { ...allModules, inventory: false, tracking: false } },
  { value: 'food-hospitality', label: 'Food & hospitality', requestLabel: 'Orders & reservations', workforceLabel: 'Service staff', offeringLabel: 'Menus & packages', inventoryLabel: 'Kitchen & service stock', inventoryCategories: ['Ingredients', 'Packaging', 'Beverages', 'Service supplies'], modules: { ...allModules, tracking: false } },
  { value: 'health-beauty', label: 'Health, beauty & wellness', requestLabel: 'Appointments', workforceLabel: 'Practitioners', offeringLabel: 'Treatments & packages', inventoryLabel: 'Clinic & salon stock', inventoryCategories: ['Consumables', 'Retail products', 'Equipment', 'Care supplies'], modules: { ...allModules, tracking: false } },
  { value: 'other', label: 'Other business', requestLabel: 'Requests', workforceLabel: 'Staff', offeringLabel: 'Offers', inventoryLabel: 'Company inventory', inventoryCategories: ['Products', 'Supplies', 'Equipment', 'Other items'], modules: allModules },
];

const byValue = new Map(BUSINESS_CATEGORIES.map((category) => [category.value, category]));

function getWorkspace(company) {
  const category = byValue.get(company?.businessCategory) || byValue.get('field-services');
  return {
    businessCategory: category.value,
    businessCategoryLabel: category.label,
    requestLabel: category.requestLabel,
    workforceLabel: category.workforceLabel,
    offeringLabel: category.offeringLabel,
    inventoryLabel: category.inventoryLabel,
    inventoryCategories: category.inventoryCategories,
    modules: { ...allModules, ...category.modules },
  };
}

module.exports = { BUSINESS_CATEGORIES, getWorkspace, hasBusinessCategory: (value) => byValue.has(value) };
