import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, companyRoute } from '../../../constants';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { Alert, EmptyState, Skeleton, Spinner } from '../../../components/ui';
import { CompanyLogo } from '../../../components/customer/CompanyCard';
import { formatCurrency } from '../../../utils/helpers';
import { readDraft, writeDraft, totals, TIME_SLOTS, slotLabel, localDateInput } from './bookingDraft';
import { fulfillmentOf } from '../../../constants/fulfillment';

function Step({ number, title, hint, children }) {
  return (
    <section className="card card-pad">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-fg">{number}</span>
        <div>
          <h2 className="text-[15.5px] font-semibold">{title}</h2>
          {hint && <p className="text-[13px] text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function CustomizeBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useFeedback();
  const saved = readDraft();
  const incoming = location.state || {};
  const resume = !incoming.companyId || incoming.companyId === saved?.companyId ? saved : null;
  const companyId = incoming.companyId || saved?.companyId;

  const [service, setService] = useState(incoming.service || resume?.service || '');
  const [quantity, setQuantity] = useState(resume?.quantity || 1);
  const [fulfillment, setFulfillment] = useState(resume?.fulfillment || '');
  const [quantities, setQuantities] = useState(resume?.quantities || {});
  const [address, setAddress] = useState(resume?.serviceLocation?.address || user?.address || '');
  const [coords, setCoords] = useState(resume?.serviceLocation?.lat ? { lat: resume.serviceLocation.lat, lng: resume.serviceLocation.lng } : null);
  const [locating, setLocating] = useState(false);
  const [date, setDate] = useState(() => resume?.date || localDateInput(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState(resume?.time || '11:00');
  const [notes, setNotes] = useState(resume?.problemDetails || incoming.problemDetails || '');
  const [error, setError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => { if (!companyId) navigate(ROUTES.companies, { replace: true }); }, [companyId, navigate]);

  const { data: companyData, loading: companyLoading, error: companyError } = useLiveQuery(companyId ? `/companies/${encodeURIComponent(companyId)}` : null, { events: ['marketplace:updated'], keepPrevious: false });
  const company = companyData?.company;
  const services = useMemo(() => company?.services || [], [company]);
  const selected = services.find((entry) => entry.name === service) || null;
  const workspace = company?.workspace || {};
  const options = workspace.fulfillment?.length ? workspace.fulfillment : ['onsite'];
  const mode = options.includes(fulfillment) ? fulfillment : options[0];
  const way = fulfillmentOf(mode);
  const isProduct = selected?.kind === 'product';
  const orderWords = options.some((type) => type === 'delivery' || type === 'pickup') && services.some((entry) => entry.kind === 'product');
  const fee = mode === 'delivery' ? Number(workspace.deliveryFee || 0) : 0;

  if (services.length && !services.some((entry) => entry.name === service)) setService(services[0].name);

  const inventoryKey = companyId && service ? `/public/inventory?companyId=${encodeURIComponent(companyId)}&serviceName=${encodeURIComponent(service)}` : null;
  const { data: inventoryData, loading: inventoryLoading } = useLiveQuery(inventoryKey, { events: ['marketplace:updated'] });
  const items = useMemo(() => (inventoryData?.inventory || []).map((item) => ({
    id: item._id || item.sku || item.name,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: Number(item.unitPrice ?? item.price ?? 0),
    stock: Number(item.quantity ?? 0),
  })), [inventoryData]);

  const materials = items.map((item) => ({ ...item, qty: Math.min(quantities[item.id] || 0, item.stock || Infinity) })).filter((item) => item.qty > 0);
  const sum = totals(selected?.price ?? incoming.price, materials, { quantity: isProduct ? quantity : 1, fee });
  const today = localDateInput();
  const minTimeToday = date === today ? new Date().toTimeString().slice(0, 5) : '00:00';

  const setQty = (item, delta) => setQuantities((current) => {
    const next = Math.max(0, (current[item.id] || 0) + delta);
    return { ...current, [item.id]: item.stock > 0 ? Math.min(next, item.stock) : next };
  });

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { toast.error('Location is not available in this browser. Type your address instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords: position }) => {
      const { latitude, longitude } = position;
      let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await response.json();
        if (data?.display_name) label = data.display_name;
      } catch { /* coordinates are still useful */ }
      setAddress(label);
      setCoords({ lat: latitude, lng: longitude });
      setLocating(false);
    }, (geoError) => {
      setLocating(false);
      toast.error({ 1: 'Location permission was denied. Type your address instead.', 2: 'Your location is unavailable right now.', 3: 'Finding your location timed out.' }[geoError.code] || 'Could not get your location.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const draft = () => ({
    companyId,
    companyName: company?.name || incoming.companyName,
    service,
    servicePrice: selected?.price ?? incoming.price ?? 0,
    serviceKind: selected?.kind || 'service',
    serviceUnit: selected?.unit || '',
    quantity: isProduct ? quantity : 1,
    fulfillment: mode,
    deliveryFee: fee,
    businessLocation: [company?.location, company?.city].filter(Boolean).join(', '),
    quantities,
    materials,
    serviceLocation: { address: address.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null },
    date,
    time,
    problemDetails: notes.trim(),
  });

  useEffect(() => { if (companyId) writeDraft(draft()); });

  const review = () => {
    setError('');
    if (!selected) return setError(`Choose ${orderWords ? 'what you want to order' : 'a service'} to continue.`);
    if (way.needsAddress && !address.trim()) return setError(mode === 'delivery' ? 'Add the delivery address.' : 'Add the address where the work should happen.');
    const when = new Date(`${date}T${time}:00`);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) return setError('Pick a date and time in the future.');
    const value = draft();
    writeDraft(value);
    return navigate(ROUTES.bookingSummary, { state: value });
  };

  const saveForLater = async () => {
    setSavingDraft(true);
    try { await api.put('/auth/booking-draft', { ...draft(), savedAt: new Date().toISOString() }); toast.success('Saved to your account. You can finish this booking any time.'); }
    catch (saveError) { toast.error(saveError.message); }
    finally { setSavingDraft(false); }
  };

  usePageChrome({ title: orderWords ? 'New order' : 'New booking', subtitle: company ? `with ${company.name}` : 'Choose what you need, how and when.', backTo: companyId ? companyRoute(company?.slug || companyId) : ROUTES.companies });

  if (companyLoading) return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="grid gap-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div><Skeleton className="h-80 rounded-2xl" /></div>;
  if (companyError || !company) return <div className="card"><EmptyState icon="storefront" title="This company can't take bookings right now" action={<button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.companies)}>Choose another company</button>}>{companyError?.message}</EmptyState></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="grid gap-5">
        <Step number={1} title={workspace.offeringLabel || 'Service'} hint="Prices are set by the business.">
          {services.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((entry) => {
                const active = entry.name === service;
                return (
                  <button key={entry._id || entry.name} type="button" onClick={() => setService(entry.name)} aria-pressed={active} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-brand bg-brand' : 'border-line-strong'}`}>{active && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{entry.name}</span>
                      <span className="block text-[12.5px] text-muted">{[entry.category, entry.kind === 'product' ? 'Product' : entry.durationMinutes ? `${entry.durationMinutes} min` : null].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="text-right"><span className="block text-[14px] font-semibold tabular-nums">{entry.price ? formatCurrency(entry.price) : 'Free'}</span>{entry.unit && <span className="block text-[11.5px] text-subtle">{entry.unit}</span>}</span>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState icon="inventory" title="Nothing published yet">This business hasn't published anything to book yet. Message them to ask.</EmptyState>}
          {isProduct && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sunken/70 px-4 py-3">
              <span className="text-[13.5px] font-medium">Quantity <span className="text-subtle">· {formatCurrency(selected.price)} {selected.unit || 'each'}</span></span>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-0.5">
                <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="One less"><span className="material-symbols-outlined">remove</span></button>
                <span className="w-8 text-center text-[15px] font-semibold tabular-nums">{quantity}</span>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={quantity >= 99} onClick={() => setQuantity((value) => Math.min(99, value + 1))} aria-label="One more"><span className="material-symbols-outlined">add</span></button>
              </div>
            </div>
          )}
        </Step>

        <Step number={2} title="How do you want it?" hint={options.length > 1 ? 'Choose what suits you; the business offers these options.' : 'This is how this business serves customers.'}>
          <div className={`grid gap-3 ${options.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
            {options.map((type) => {
              const info = fulfillmentOf(type);
              const active = type === mode;
              return (
                <button key={type} type="button" onClick={() => setFulfillment(type)} aria-pressed={active} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-brand bg-brand-soft/50 ring-1 ring-brand' : 'border-line hover:border-line-strong'}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand text-white' : 'bg-sunken text-subtle'}`}><span className="material-symbols-outlined text-[19px]">{info.icon}</span></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{info.label}</span>
                    <span className="block text-[12.5px] text-muted">{type === 'delivery' ? (Number(workspace.deliveryFee) ? `Delivery fee ${formatCurrency(workspace.deliveryFee)}` : 'Free delivery') : info.addressHint || `At ${company.name}`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step number={3} title="Add-ons" hint="Optional extras from the business's own stock.">
          {inventoryLoading ? <div className="grid gap-3">{[0, 1].map((key) => <Skeleton key={key} className="h-14 rounded-xl" />)}</div> : items.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {items.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{item.name}</p>
                      <p className="text-[12px] text-subtle">{formatCurrency(item.price)} each · {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-line p-0.5">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={!qty} onClick={() => setQty(item, -1)} aria-label={`Remove one ${item.name}`}><span className="material-symbols-outlined">remove</span></button>
                      <span className="w-7 text-center text-[14px] font-semibold tabular-nums">{qty}</span>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={item.stock <= 0 || qty >= item.stock} onClick={() => setQty(item, 1)} aria-label={`Add one ${item.name}`}><span className="material-symbols-outlined">add</span></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="well px-4 py-3 text-[13.5px] text-muted">No add-ons are listed for this.</p>}
        </Step>

        <Step number={4} title={way.addressLabel} hint={way.needsAddress ? way.addressHint : undefined}>
          {!way.needsAddress ? (
            <p className="well flex items-center gap-3 px-4 py-3 text-[14px]"><span className="material-symbols-outlined text-brand-fg">{way.icon}</span><span><b className="font-semibold">{company.name}</b>{mode !== 'remote' && <span className="block text-[13px] text-muted">{[company.location, company.city].filter(Boolean).join(', ')}</span>}{mode === 'remote' && <span className="block text-[13px] text-muted">The business works with you online; details arrive in chat.</span>}</span></p>
          ) : (<>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="input-icon flex-1">
              <span className="material-symbols-outlined">location_on</span>
              <input className="input" value={address} onChange={(event) => { setAddress(event.target.value); setCoords(null); }} placeholder="House, street, area, city" aria-label="Service address" />
            </label>
            <button type="button" onClick={useMyLocation} disabled={locating} className="btn btn-secondary h-11">{locating ? <Spinner /> : <span className="material-symbols-outlined">my_location</span>}Use my location</button>
          </div>
          {coords && <p className="mt-2 flex items-center gap-1 text-[12.5px] text-success-fg"><span className="material-symbols-outlined text-[16px]">check_circle</span>Exact location attached: {mode === 'delivery' ? 'the rider' : 'staff'} can navigate straight to you.</p>}
          </>)}
        </Step>

        <Step number={5} title="When" hint={`Pick a day and a preferred ${way.whenLabel.toLowerCase()}.`}>
          <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
            <label className="field">
              <span className="label">Date</span>
              <input type="date" className="input" min={today} value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <fieldset className="field">
              <legend className="label mb-1.5">{way.whenLabel}</legend>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((slot) => {
                  const disabled = date === today && slot <= minTimeToday;
                  return <button key={slot} type="button" disabled={disabled} aria-pressed={time === slot} onClick={() => setTime(slot)} className="chip disabled:cursor-not-allowed disabled:opacity-40">{slotLabel(slot)}</button>;
                })}
              </div>
            </fieldset>
          </div>
        </Step>

        <Step number={6} title="Notes for the business" hint="Anything they should know: preferences, sizes, access instructions.">
          <textarea className="textarea" rows={4} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={mode === 'onsite' ? 'e.g. The kitchen sink is leaking. Gate code 4512, call on arrival.' : mode === 'delivery' ? 'e.g. Ring the bell twice; leave with the guard if no answer.' : mode === 'remote' ? 'e.g. Share the files in chat; I am free after 6 pm.' : 'e.g. Please keep it ready by 5 pm.'} />
          <p className="mt-1.5 text-right text-[12px] text-subtle">{notes.length}/2000</p>
        </Step>
      </div>

      <aside className="card overflow-hidden lg:sticky lg:top-24">
        <div className="flex items-center gap-3 border-b border-line p-5">
          <CompanyLogo company={company} size={42} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{company.name}</p>
            <p className="truncate text-[12.5px] text-subtle">{company.city}</p>
          </div>
        </div>
        <dl className="grid gap-2.5 p-5 text-[13.5px]">
          <div className="flex justify-between gap-3"><dt className="text-muted">{isProduct && quantity > 1 ? `${quantity} × ` : ''}{service || 'Service'}</dt><dd className="font-medium tabular-nums">{formatCurrency(sum.service)}</dd></div>
          {materials.map((item) => <div key={item.id} className="flex justify-between gap-3"><dt className="truncate text-muted">{item.name} × {item.qty}</dt><dd className="font-medium tabular-nums">{formatCurrency(item.qty * item.price)}</dd></div>)}
          <div className="flex justify-between gap-3"><dt className="text-muted">Tax (8.5%)</dt><dd className="font-medium tabular-nums">{formatCurrency(sum.tax)}</dd></div>
          {mode === 'delivery' && <div className="flex justify-between gap-3"><dt className="text-muted">Delivery</dt><dd className="font-medium tabular-nums">{sum.fee ? formatCurrency(sum.fee) : 'Free'}</dd></div>}
          <div className="divider my-1" />
          <div className="flex items-baseline justify-between gap-3"><dt className="font-semibold">Estimated total</dt><dd className="text-[20px] font-bold tabular-nums">{formatCurrency(sum.total)}</dd></div>
        </dl>
        <div className="grid gap-2 border-t border-line bg-sunken/40 p-5">
          <Alert>{error}</Alert>
          <button type="button" onClick={review} className="btn btn-primary btn-lg w-full" disabled={!services.length}>{orderWords ? 'Review order' : 'Review booking'}</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => navigate(`${ROUTES.chat}/${company.slug || company._id}`)} className="btn btn-secondary"><span className="material-symbols-outlined">chat</span>Ask first</button>
            <button type="button" onClick={saveForLater} disabled={savingDraft} className="btn btn-secondary">{savingDraft ? <Spinner /> : <span className="material-symbols-outlined">bookmark</span>}Save</button>
          </div>
          <p className="text-center text-[12px] text-subtle">You won't be charged now. {mode === 'delivery' ? 'Pay on delivery.' : mode === 'pickup' ? 'Pay when you collect.' : 'Pay after the work is done.'}</p>
        </div>
      </aside>
    </div>
  );
}

export default CustomizeBooking;
