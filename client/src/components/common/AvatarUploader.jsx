import { useRef, useState } from 'react';
import { Modal, Avatar } from '../ui';

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function crop(source, zoom, size = 320) {
  const image = await loadImage(source);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const scale = Math.max(size / image.width, size / image.height) * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** Pick an image, zoom to frame it, and get a square JPEG data URL back. */
export default function AvatarUploader({ name, src, size = 88, onChange, shape = 'circle' }) {
  const inputRef = useRef(null);
  const [source, setSource] = useState('');
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');

  const pick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Choose an image under 8 MB.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setSource(String(reader.result)); setZoom(1); };
    reader.readAsDataURL(file);
  };

  const apply = async () => { onChange(await crop(source, zoom)); setSource(''); };
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => inputRef.current?.click()} className={`group relative overflow-hidden ${rounded}`} aria-label="Change picture">
        {shape === 'circle' ? <Avatar name={name} src={src} size={size} /> : (
          <span className="grid place-items-center overflow-hidden rounded-2xl border border-line bg-brand-soft text-xl font-bold text-brand-fg" style={{ width: size, height: size }}>
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : String(name || '?').slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className={`absolute inset-0 grid place-items-center bg-navy/50 text-white opacity-0 transition-opacity group-hover:opacity-100 ${rounded}`}><span className="material-symbols-outlined">photo_camera</span></span>
      </button>
      <div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}><span className="material-symbols-outlined">upload</span>Upload picture</button>
        <p className="mt-1.5 text-[12px] text-subtle">{error || 'JPG, PNG or WEBP. Square works best.'}</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={pick} />
      <Modal open={Boolean(source)} onClose={() => setSource('')} title="Frame your picture" size="sm" footer={<><button type="button" className="btn btn-secondary" onClick={() => setSource('')}>Cancel</button><button type="button" className="btn btn-primary" onClick={apply}>Use picture</button></>}>
        <div className="grid justify-items-center gap-5">
          <div className={`h-56 w-56 overflow-hidden border border-line bg-sunken ${rounded}`}>
            {source && <img src={source} alt="" className="h-full w-full object-cover" style={{ transform: `scale(${zoom})` }} />}
          </div>
          <label className="field w-full">
            <span className="label">Zoom</span>
            <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[rgb(var(--brand))]" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
