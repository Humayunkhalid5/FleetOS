// ---------------------------------------------------------------------------
// FleetOS Client Portal — Shared helper utilities
// ---------------------------------------------------------------------------

const TECH_AVATARS = {
  'Ayesha Khan':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A',
  'Bilal Ahmed':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg',
  'Imran Ali':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCXwsweOO86ly3Mjt2oPOTZRYD1NP5mFpi-bynzXFWH7BK3T1YL55KCFFrZrOcUURPtfBegXO4gbwW3z5IQjimD9PJdNPhesJ7hL7KISKXUv2KgwVNlnz3xE0qI3A_5wrkX3sa2pXAqeANZCpoaBO2LDhb6qnmgB5-KmV-pNODRMH9NfpRAtxVFJQVyju9SQjow0qsPDwEUkQxQe7i-Ws5_NWjIGSggzyQu6yGIMjlDQRpIl02wL0Lvqw',
  'Sana Malik':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAA0s0uXF9R0oeWt_xRe1aAG-jZfenDxKMfHW9DerTGE-bnswSKIGXkLUe9IkwU10-wbmvKPCi2PHPd6RaW3_47SFBQDw8hYEns8uxgsmA1nS0H5EPr4yWP4UJxNYtiJBe7P-Q1ZMb-wnlyFb5IcNJ6LDxlwNU2rdobu2pD3Ti75777gho0sWYPxSRrPEimVwf8LEaQ9PM5r5gscMjJFEgnpPhfDVYWlClbztKaNkBoooSJrXq6WcYw-Q',
  'Faisal Khan':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBXDw7-G2hPyLFqCVSkM5LKif1fTrI-MifylqYOo5UmuN-wYVYBA0xIm2YUVjBbBTX_Tc_KIeJXPH6nMyVsRrkIYZPl1CbTd6ZrhIexF__V3tFxwRJHyQYDl-GuX2Nbrd-2mCRZv2lCubnVEFQ96dvaZsl08fxTnaX4Rjkh3sO7U3RiDXGAuT-HcoYP2sjFE5Ig6wR1viTfnXSlD2rxX679xzZqW2zGvUBAYOemTVZf591PVXLF0_dThw',
};

export function getTechAvatar(name) {
  if (TECH_AVATARS[name]) return TECH_AVATARS[name];
  return 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYZfr7LM0amt7amV3qWRzvkJ0chN1P5Vl4ak4XWMFLv9cR1dVSKVEJboF-5wik_OaBGzQbe_f9zpEDGNelEXwpkwhRfCDzu2VSrcVbR395XicT3b4RJGvpMzH7XsiTXzbp8fwwVFQA-OcMy3Ox3onCOIgmS8yJsUido-6p-h_pNhdIOAC7ZJCIlrbfYLmHnHtdBJI5wRv0L98ng9SZ93ikcBUnCdIyedi614HkAnkqrcIDLX7mQr8uRg';
}

export const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

