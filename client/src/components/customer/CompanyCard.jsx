import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, companyRoute } from '../../constants';
import { fulfillmentOf } from '../../constants/fulfillment';
import { formatCurrency } from '../../utils/helpers';

// Image addresses stored on the company (MongoDB). CDN covers get a responsive
// srcset so phones download a small file and wide screens a sharp one.
function coverSrcSet(source) {
  if (!/^https:\/\/images\.unsplash\.com\//.test(source)) return undefined;
  return [480, 800, 1200].map((width) => `${source.replace(/([?&])w=\d+/, `$1w=${width}`).replace(/([?&])h=\d+/, `$1h=${Math.round(width * 0.45)}`)} ${width}w`).join(', ');
}

function CoverImage({ source, className, sizes, eager, onError }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={source}
      srcSet={coverSrcSet(source)}
      sizes={sizes}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={onError}
      className={`object-cover transition-[opacity,transform] duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}

export function CompanyCover({ company, className = '', sizes = '(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw', eager = false }) {
  const [failedSource, setFailedSource] = useState('');
  const source = company?.heroImage || company?.gallery?.[0];
  if (!source || failedSource === source) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-[#0D1B2A] via-[#1B2B4B] to-brand/80 text-white/80 ${className}`} role="img" aria-label={`${company?.name || 'Company'} cover`}>
        <span className="material-symbols-outlined text-[32px]">storefront</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      <span className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />
      <CoverImage key={source} source={source} sizes={sizes} eager={eager} onError={() => setFailedSource(source)} className="relative h-full w-full" />
    </div>
  );
}

export function CompanyLogo({ company, size = 44, className = '' }) {
  const name = company?.name || 'Company';
  const [failedLogo, setFailedLogo] = useState('');
  const logo = company?.logo && failedLogo !== company.logo ? company.logo : '';
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface text-[15px] font-bold text-brand-fg shadow-xs ${className}`} style={{ width: size, height: size }}>
      {logo ? <img src={logo} alt="" loading="lazy" decoding="async" onError={() => setFailedLogo(logo)} className="h-full w-full object-cover" /> : name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
    </span>
  );
}

export default function CompanyCard({ company, onBook, onChat, eager = false }) {
  const services = company.services || [];
  const prices = services.map((service) => Number(service.price) || 0).filter((price) => price > 0);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const workspace = company.workspace || {};
  const category = workspace.businessCategoryLabel
    ? { icon: workspace.businessCategoryIcon || 'storefront', label: workspace.businessCategoryLabel }
    : CATEGORIES.find((entry) => entry.value === String(services[0]?.category || '').toLowerCase());
  const ways = workspace.fulfillment || [];
  const orders = ways.some((type) => type === 'delivery' || type === 'pickup') && services.some((service) => service.kind === 'product');
  const to = companyRoute(company.slug || company._id);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link to={to} className="relative block h-36 overflow-hidden" tabIndex={-1} aria-hidden="true">
        <CompanyCover company={company} eager={eager} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        {category && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0B1628]/75 px-2.5 py-1 text-[11.5px] font-medium text-white">
            <span className="material-symbols-outlined text-[14px]">{category.icon}</span>{category.label}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5 pt-0">
        <div className="relative z-10 -mt-6 flex items-end justify-between gap-3">
          <CompanyLogo company={company} size={48} className="ring-4 ring-surface" />
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-[12.5px] font-semibold text-ink">
            <span className="material-symbols-outlined icon-fill text-[15px] text-warning">star</span>{Number(company.rating || 0).toFixed(1)}
          </span>
        </div>
        <Link to={to} className="mt-3 block">
          <h3 className="truncate text-[15.5px] font-semibold text-ink group-hover:text-brand-fg">{company.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted">
            <span className="material-symbols-outlined text-[15px]">location_on</span>{company.location || company.city || 'Pakistan'}
          </p>
        </Link>
        <p className="mt-3 line-clamp-2 text-[13.5px] text-muted">{company.description || 'This company has not added a description yet.'}</p>
        {services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {services.slice(0, 2).map((service) => <span key={service._id || service.name} className="badge badge-neutral max-w-full truncate">{service.name}</span>)}
            {services.length > 2 && <span className="badge badge-neutral">+{services.length - 2}</span>}
          </div>
        )}
        {ways.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-muted" aria-label="Ways to get it">
            {ways.map((type) => <span key={type} className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px] text-brand-fg">{fulfillmentOf(type).icon}</span>{fulfillmentOf(type).short}</span>)}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-5">
          <div className="mr-auto">
            <p className="text-[11.5px] text-subtle">From</p>
            <p className="text-[14px] font-semibold tabular-nums text-ink">{fromPrice ? formatCurrency(fromPrice) : 'On request'}</p>
          </div>
          <button type="button" onClick={() => onChat(company)} className="btn btn-secondary btn-icon" aria-label={`Message ${company.name}`} title="Message company"><span className="material-symbols-outlined">chat</span></button>
          <button type="button" onClick={() => onBook(company)} className="btn btn-primary">{orders ? 'Order' : 'Book'}</button>
        </div>
      </div>
    </article>
  );
}
