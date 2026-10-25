import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import { useLiveQuery } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import { CompanyCover, CompanyLogo } from '../../../components/customer/CompanyCard';
import { Alert, Avatar, EmptyState, Skeleton, Stars } from '../../../components/ui';
import { formatCurrency } from '../../../utils/helpers';
import { fulfillmentOf } from '../../../constants/fulfillment';

const promises = [
  ['verified', 'Verified by FleetOS', 'Documents reviewed by a Super Admin before listing.'],
  ['my_location', 'Live job tracking', 'See assigned staff, status and ETA as it happens.'],
  ['payments', 'Pay after the work', 'Cash or invoice once the job is completed.'],
  ['receipt_long', 'Digital receipt', 'Invoice and history saved to your account.'],
];

function formatDuration(minutes) {
  const value = Number(minutes) || 0;
  if (!value) return '';
  return value >= 60 ? `${Math.floor(value / 60)}h${value % 60 ? ` ${value % 60}m` : ''}` : `${value} min`;
}

function CompanyDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useFeedback();
  const { data, error, loading, refresh } = useLiveQuery(`/companies/${id}`, { events: ['marketplace:updated'], keepPrevious: false });
  const company = data?.company;
  const { data: reviewData } = useLiveQuery(company?._id ? `/reviews/company/${company._id}` : null, { events: ['marketplace:updated'] });
  const reviews = reviewData?.reviews || [];
  const services = company?.services || [];
  const staff = company?.technicians || [];

  const book = (service) => navigate(ROUTES.customizeBooking, { state: { companyId: company?.slug || company?._id || id, companyName: company?.name, service: service?.name, price: service?.price || 0 } });
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${company?.name} on FleetOS`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard'); }
    } catch { /* share cancelled */ }
  };

  usePageChrome({
    title: company?.name || (loading ? 'Loading company' : 'Company'),
    subtitle: company ? `${company.city || 'Pakistan'} · ${company.workspace?.businessCategoryLabel || 'Verified company'}` : '',
    backTo: ROUTES.companies,
    actions: company && (
      <>
        <button type="button" onClick={share} className="btn btn-secondary"><span className="material-symbols-outlined">ios_share</span>Share</button>
        <button type="button" onClick={() => navigate(`${ROUTES.chat}/${company.slug || company._id}`)} className="btn btn-secondary"><span className="material-symbols-outlined">chat</span>Message</button>
        <button type="button" onClick={() => book(services[0])} className="btn btn-primary"><span className="material-symbols-outlined">event_available</span>Book now</button>
      </>
    ),
  });

  if (loading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="card">
        <EmptyState icon="storefront" title="This company isn't available" action={<button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.companies)}>Browse companies</button>}>
          {error?.status === 404 ? 'It may have been unlisted or is waiting for approval.' : error?.message || 'Please try again.'}
        </EmptyState>
        {error?.status !== 404 && <div className="px-6 pb-6"><Alert onRetry={refresh}>{error?.message}</Alert></div>}
      </div>
    );
  }

  // Once the published reviews load, rating and count come from them so the
  // header can never disagree with the reviews listed below.
  const reviewCount = reviewData ? reviews.length : Number(company.reviewCount || 0);
  const rating = reviewData
    ? (reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0)
    : Number(company.rating || 0);
  const phone = company.phone || '';

  return (
    <div className="grid gap-6">
      <section className="card overflow-hidden">
        <CompanyCover company={company} eager className="h-40 w-full sm:h-52" />
        <div className="flex flex-wrap items-end gap-5 px-5 pb-5 sm:px-6">
          <CompanyLogo company={company} size={84} className="relative z-10 -mt-10 rounded-2xl ring-4 ring-surface" />
          <div className="min-w-0 flex-1 pt-1 max-sm:w-full max-sm:basis-full sm:pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-bold tracking-tight">{company.name}</h2>
              {company.verified && <span className="badge badge-success"><span className="material-symbols-outlined icon-fill">verified</span>Verified</span>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[17px]">location_on</span>{company.location || company.city}</span>
              <span className="inline-flex items-center gap-1.5">{rating > 0 ? <><Stars value={rating} size={15} /><b className="text-ink">{rating.toFixed(1)}</b> ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</> : 'No reviews yet'}</span>
            </p>
            {(company.workspace?.fulfillment || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Ways to get it">
                {company.workspace.fulfillment.map((type) => <span key={type} className="badge badge-brand"><span className="material-symbols-outlined">{fulfillmentOf(type).icon}</span>{fulfillmentOf(type).label}{type === 'delivery' && Number(company.workspace.deliveryFee) > 0 ? ` · ${formatCurrency(company.workspace.deliveryFee)}` : type === 'delivery' ? ' · free' : ''}</span>)}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid gap-6">
          <section className="card card-pad">
            <h3 className="section-title">About</h3>
            <p className="mt-2 text-[14.5px] leading-7 text-muted">{company.description || 'This company has not added a description yet.'}</p>
            {company.areas?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {company.areas.map((area) => <span key={area} className="badge badge-neutral"><span className="material-symbols-outlined">pin_drop</span>{area}</span>)}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{company.workspace?.offeringLabel || 'Services'}</h3>
              <span className="text-[12.5px] text-subtle">{services.length} available</span>
            </div>
            {services.length ? (
              <ul className="divide-y divide-line">
                {services.map((service) => (
                  <li key={service._id || service.name} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-fg"><span className="material-symbols-outlined">{service.kind === 'product' ? 'inventory_2' : 'handyman'}</span></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{service.name}</p>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{[service.category, service.kind === 'product' ? null : formatDuration(service.durationMinutes)].filter(Boolean).join(' · ')}{service.description ? ` — ${service.description}` : ''}</p>
                    </div>
                    <p className="text-right"><span className="block text-[15px] font-semibold tabular-nums">{service.price ? formatCurrency(service.price) : 'Free'}</span>{service.unit && <span className="block text-[11.5px] text-subtle">{service.unit}</span>}</p>
                    <button type="button" onClick={() => book(service)} className="btn btn-soft btn-sm">{service.kind === 'product' ? 'Order' : 'Book'}</button>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon="inventory" title="Nothing listed yet">Message the business to ask about what they offer.</EmptyState>}
          </section>

          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Customer reviews</h3>
              {rating > 0 && <span className="flex items-center gap-2 text-[13px] text-muted"><Stars value={rating} size={15} />{rating.toFixed(1)}</span>}
            </div>
            {reviews.length ? (
              <ul className="divide-y divide-line">
                {reviews.slice(0, 6).map((review) => (
                  <li key={review._id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={review.customer?.name || 'Customer'} src={review.customer?.avatar} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold">{review.customer?.name || 'Verified customer'}</p>
                        <p className="text-[12px] text-subtle">{new Date(review.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <Stars value={review.rating} size={14} />
                    </div>
                    {review.comment && <p className="mt-2 text-[14px] leading-6 text-muted">{review.comment}</p>}
                    {review.reply?.text && <p className="mt-2 rounded-xl bg-sunken px-3 py-2 text-[13px] text-muted"><b className="text-ink">Reply from {company.name}:</b> {review.reply.text}</p>}
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon="reviews" title="No reviews yet">Reviews appear here after customers complete a booking.</EmptyState>}
          </section>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-24">
          <section className="card card-pad">
            <h3 className="section-title">Ready to book?</h3>
            <p className="mt-1 text-[13.5px] text-muted">Choose a service, add details and get a clear estimate before confirming.</p>
            <button type="button" onClick={() => book(services[0])} className="btn btn-primary mt-4 w-full">Start a booking</button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => navigate(`${ROUTES.chat}/${company.slug || company._id}`)} className="btn btn-secondary"><span className="material-symbols-outlined">chat</span>Message</button>
              {phone ? <a href={`tel:${phone.replace(/\s+/g, '')}`} className="btn btn-secondary"><span className="material-symbols-outlined">call</span>Call</a> : <button type="button" disabled className="btn btn-secondary">No phone</button>}
            </div>
            {phone && <p className="mt-3 text-center text-[12.5px] text-subtle">{phone}</p>}
          </section>

          <section className="card card-pad">
            <h3 className="section-title">What to expect</h3>
            <ul className="mt-4 grid gap-4">
              {promises.map(([icon, title, text]) => (
                <li key={title} className="flex gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-[20px] text-brand-fg">{icon}</span>
                  <div><p className="text-[13.5px] font-semibold">{title}</p><p className="text-[12.5px] text-muted">{text}</p></div>
                </li>
              ))}
            </ul>
          </section>

          {staff.length > 0 && (
            <section className="card card-pad">
              <h3 className="section-title">{company.workspace?.workforceLabel || 'Team'}</h3>
              <ul className="mt-4 grid gap-3">
                {staff.slice(0, 5).map((member) => (
                  <li key={member._id || member.name} className="flex items-center gap-3">
                    <Avatar name={member.name} src={member.avatar} size={34} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{member.name}</p><p className="truncate text-[12px] text-subtle">{member.role}</p></div>
                    {member.rating ? <span className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold"><span className="material-symbols-outlined icon-fill text-[14px] text-warning">star</span>{Number(member.rating).toFixed(1)}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CompanyDetails;
