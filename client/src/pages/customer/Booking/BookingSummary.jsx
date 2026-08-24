import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function BookingSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  
  const materials = state.materials || {};
  const companyId = state.companyId || 'pak-fleet-mobility';
  const companyName = state.companyName || 'Selected company';
  const problemDetails = state.problemDetails || '';
  const service = state.service || 'Preventive Maintenance';
  const servicePrice = state.servicePrice !== undefined ? state.servicePrice : 120;
  const serviceLocation = state.serviceLocation || {
    address: 'Gulberg III, Lahore, Punjab',
    lat: 31.5204,
    lng: 74.3587,
  };
  
  // Calculate dynamic totals or use fallbacks
  const baseLabor = Number(servicePrice) || 120.00;
  const materialsTotal = state.materialsTotal !== undefined ? state.materialsTotal : 63.50;
  const subtotal = baseLabor + materialsTotal;
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + tax;

  // Filter materials that have qty > 0 to display them
  const selectedMaterials = Object.values(materials).filter(item => item.qty > 0);

  // The company allots the right staff member after the request is confirmed.
  // Until then we display a neutral placeholder (prevents undefined crash).
  const assignedTech = 'Company will assign';

  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [idempotencyKey] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const showHelp = () => {
    alert('Need help? Contact our support team at support@fleetos.com or call +92 42 35781234.');
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    const goToTracking = (bookingId = null) => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        navigate(ROUTES.liveTracking, {
          replace: true,
          state: { selectedTech: 'Company will assign', bookingId },
        });
      }, 600);
    };

    try {
      // Create the booking in the backend with correct field mapping
      const response = await api.post('/bookings', {
        companyId,
        companyName,
        serviceName: service,
        materials: Object.values(materials).filter((m) => m.qty > 0).map((m) => ({ name: m.name, quantity: m.qty, unitPrice: m.price })),
        paymentMethod: selectedPayment,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        location: serviceLocation.address,
        vehicle: { label: 'Client request' },
        idempotencyKey,
      });
      const created = response.booking || {};
      if (selectedPayment === 'card') {
        const checkout = await api.post(`/payments/checkout/${created._id || created.id}`, {});
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      goToTracking(created._id || created.id || null);
    } catch (err) {
      setIsProcessing(false);
      window.alert(err.message || 'Booking could not be created.');
    }
  };

  // Helper for dynamic avatars based on tech name
  const getTechAvatar = (name) => {
    if (name === 'Ayesha Khan') return "https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A";
    if (name === 'Bilal Ahmed') return "https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg";
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuANElbcBjWXr-TTiov_ngCtxN-PtgyZF2rqH2uz6WBDM-TST0bGcEq53NLZn5qdrbrSGP9LB8ySFBVOzwUcaPL0awUofZXp7x-bvs5ac2FPB7JMyCyZefOKmpsArTgK6a3ruBr267uIBmd5nTijVhfMWRPEzOTmr8_9KzQNpv_9ysJMgZP8vQEHFMGR0xBr1LADKFfHhlFyFedz6T3f2t8se6invdewcWudCaFday7rPmdaTo_udK0Jsw";
  };

  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Booking Summary</h1>
        </div>
        <div className="flex items-center gap-sm">
          <button onClick={showHelp} className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-32 max-w-5xl mx-auto px-container-margin grid grid-cols-1 md:grid-cols-12 gap-lg">
        {/* Left Column: Details & Summary */}
        <div className="md:col-span-7 space-y-lg">
          {/* Company Staff Summary Card */}
          <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant/10">
            <div className="flex items-center justify-between mb-md">
              <h2 className="font-headline-md text-headline-md text-on-surface">Assignment Status</h2>
              <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm rounded-full">Company Assigned</span>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-fixed">
                <img className="w-full h-full object-cover" alt={assignedTech} src={getTechAvatar(assignedTech)} />
              </div>
              <div className="flex-1">
                <p className="font-headline-md text-headline-md text-on-surface">Company will assign suitable staff</p>
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  The selected company reviews the request and allocates the best available team member.
                </p>
              </div>
              <button onClick={() => navigate(ROUTES.customizeBooking, { state: { companyId, companyName } })} className="text-primary font-nav-item text-nav-item hover:underline">Edit Request</button>
            </div>
          </section>

          {/* Detailed Cost Breakdown */}
          <section className="space-y-md">
            <h2 className="font-headline-md text-headline-md text-on-surface ml-1">Order Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {/* Service Item */}
              <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant/10 flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-primary mb-2">build</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Primary Service</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{service}</p>
                  {problemDetails && <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{problemDetails}</p>}
                </div>
                <p className="mt-4 font-headline-md text-headline-md text-primary">PKR {baseLabor.toLocaleString('en-PK')}</p>
              </div>
              
              {/* Materials Item */}
              <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant/10 flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-tertiary mb-2">inventory_2</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Materials</p>
                  <ul className="mt-2 space-y-1">
                    {selectedMaterials.length > 0 ? selectedMaterials.map((item, idx) => (
                      <li key={idx} className="flex justify-between font-body-md text-body-md text-on-surface">
                        <span>{item.qty}x {item.name}</span>
                        <span>PKR {(item.qty * item.price).toLocaleString('en-PK')}</span>
                      </li>
                    )) : (
                      <li className="font-body-md text-body-md text-on-surface-variant">No materials selected</li>
                    )}
                  </ul>
                </div>
                <p className="mt-4 font-headline-md text-headline-md text-tertiary">PKR {materialsTotal.toLocaleString('en-PK')}</p>
              </div>
            </div>
          </section>

          {/* Location & Time */}
          <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_0_rgba(11,29,45,0.08)] border border-outline-variant/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              <div className="flex items-start gap-md">
                <div className="bg-primary-container p-2 rounded-lg">
                  <span className="material-symbols-outlined text-on-primary-container">location_on</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Service Location</p>
                  <p className="font-body-md text-body-md text-on-surface">{serviceLocation.address || 'Gulberg III, Lahore, Punjab'}</p>
                </div>
              </div>
              <div className="flex items-start gap-md">
                <div className="bg-secondary-container p-2 rounded-lg">
                  <span className="material-symbols-outlined text-on-secondary-container">calendar_today</span>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Scheduled For</p>
                  <p className="font-body-md text-body-md text-on-surface">Oct 24, 2023<br/>09:30 AM - 11:00 AM</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Payment & Checkout */}
        <div className="md:col-span-5">
          <div className="sticky top-24 space-y-lg">
            {/* Summary & Total */}
            <div className="bg-white rounded-xl p-lg shadow-lg border-2 border-primary/5">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-lg">Payment Summary</h3>
              <div className="space-y-md border-b border-outline-variant/20 pb-lg mb-lg">
                <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Service Subtotal</span>
                  <span>PKR {baseLabor.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Materials & Parts</span>
                  <span>PKR {materialsTotal.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Estimated Tax (8.5%)</span>
                  <span>PKR {tax.toLocaleString('en-PK')}</span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-xl">
                <p className="font-headline-md text-headline-md text-on-surface">Grand Total</p>
                <p className="text-3xl font-extrabold text-primary">PKR {grandTotal.toLocaleString('en-PK')}</p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-md">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Select Payment Method</p>
                
                <label className={`relative flex items-center p-md border-2 rounded-xl cursor-pointer transition-all ${selectedPayment === 'card' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/50'}`}>
                  <input type="radio" name="payment" className="hidden" checked={selectedPayment === 'card'} onChange={() => setSelectedPayment('card')} />
                  <div className="flex items-center gap-md w-full">
                    <span className={`material-symbols-outlined ${selectedPayment === 'card' ? 'text-primary' : 'text-on-surface-variant'}`}>credit_card</span>
                    <div className="flex-1">
                      <p className="font-nav-item text-nav-item text-on-surface">Credit / Debit Card</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Secure checkout hosted by Stripe</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full ${selectedPayment === 'card' ? 'border-4 border-primary bg-white' : 'border-2 border-outline-variant bg-white'}`}></div>
                  </div>
                </label>

                <label className={`relative flex items-center p-md border-2 rounded-xl cursor-pointer transition-all ${selectedPayment === 'cash' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/50'}`}>
                  <input type="radio" name="payment" className="hidden" checked={selectedPayment === 'cash'} onChange={() => setSelectedPayment('cash')} />
                  <div className="flex items-center gap-md w-full">
                    <span className={`material-symbols-outlined ${selectedPayment === 'cash' ? 'text-primary' : 'text-on-surface-variant'}`}>payments</span>
                    <div className="flex-1">
                      <p className="font-nav-item text-nav-item text-on-surface">Cash after service</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Company records payment after completion</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full ${selectedPayment === 'cash' ? 'border-4 border-primary bg-white' : 'border-2 border-outline-variant bg-white'}`}></div>
                  </div>
                </label>

              </div>

              {/* Confirm Button */}
              <button 
                onClick={handleConfirm}
                disabled={isProcessing || isSuccess}
                className={`mt-xl w-full py-4 rounded-xl font-headline-md text-headline-md flex items-center justify-center gap-2 transition-all duration-200 ${
                  isSuccess ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                } ${isProcessing ? 'opacity-80 cursor-not-allowed' : ''}`}
              >
                {isProcessing && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                {isProcessing && 'Processing...'}
                {isSuccess && <span className="material-symbols-outlined">check_circle</span>}
                {isSuccess && 'Booking confirmed'}
                {!isProcessing && !isSuccess && `Confirm booking · PKR ${grandTotal.toLocaleString('en-PK')}`}
              </button>
              <p className="mt-md text-center font-label-sm text-label-sm text-on-surface-variant">
                By clicking confirm, you agree to FleetOS <a className="text-primary underline" href="#" onClick={(e) => { e.preventDefault(); alert('Terms of Service — Please contact support for the full agreement.'); }}>Terms of Service</a>.
              </p>
            </div>

            {/* Security Badges */}
            <div className="flex flex-wrap justify-center items-center gap-lg opacity-60 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="font-label-sm text-label-sm">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span className="font-label-sm text-label-sm">PCI Compliant</span>
              </div>
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-sm">security</span>
                <span className="font-label-sm text-label-sm">Safe Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface rounded-t-xl shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)]">
        <a href={ROUTES.dashboard} onClick={(e) => { e.preventDefault(); navigate(ROUTES.dashboard); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-nav-item text-nav-item">Dashboard</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 scale-95 transition-transform duration-150">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-nav-item text-nav-item">Bookings</span>
        </a>
        <a href={ROUTES.bookings} onClick={(e) => { e.preventDefault(); navigate(ROUTES.bookings); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1">
          <span className="material-symbols-outlined">search</span>
          <span className="font-nav-item text-nav-item">Search</span>
        </a>
        <a href={ROUTES.profile} onClick={(e) => { e.preventDefault(); navigate(ROUTES.profile); }} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1">
          <span className="material-symbols-outlined">person</span>
          <span className="font-nav-item text-nav-item">Profile</span>
        </a>
      </nav>
    </div>
  );
}

export default BookingSummary;
