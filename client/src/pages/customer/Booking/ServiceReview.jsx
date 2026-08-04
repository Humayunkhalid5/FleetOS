import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants';
import api from '../../../services/api';

function ServiceReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedTech = location.state?.selectedTech || 'Marcus Vance';
  const bookingId = location.state?.bookingId || null;
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);


  const getTechAvatar = (name) => {
    if (name === 'Elena Rodriguez') return "https://lh3.googleusercontent.com/aida-public/AB6AXuDnCiWvnkOKQReJfbwVPnaN6tu7s5397gTYSVBPMyiX6toCf8p5wo3eRuZ2QIc2TqcZrm-1vI7JyRT7oqpSWXpAdRECBDCnRGuLQM6zGzCDYi5wegUEzJG2p7E7E7jfdx9hSCUUoveU458OaY-di3G4frMSjmTJwjSznLPYXVl_zY_nMTuD0q3drMrje1gMak8VTFXTBe687naWHZTIHqBAHuyZqtzAN7B6ZysOa9vPYFnRqmNuHtlY1A";
    if (name === 'Jordan Smith') return "https://lh3.googleusercontent.com/aida-public/AB6AXuBdSq9kds-9hvrnwo749V1I2EinNun7_8MX5BIE5-IMKUNAe4eYNSZlRYfJsQoPN6Bhr_Si7Oj9uq3XH8CcF0q8t2BSjIFBI_5A248PGaEjKqs1N1rbNOcqGh-pFfZ5qZmC7dv0k7AJ0lOUJGzjeGN4P8Z_QnnObTriizg6iqp9D11hzs6aSOcdIpfpF8Q04gH3UJwNaz_BNK0OIH9K1hLW_V9CsATPDG8NQAVE-f5Eg0eDZhdoGe4WAg";
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuCXwsweOO86ly3Mjt2oPOTZRYD1NP5mFpi-bynzXFWH7BK3T1YL55KCFFrZrOcUURPtfBegXO4gbwW3z5IQjimD9PJdNPhesJ7hL7KISKXUv2KgwVNlnz3xE0qI3A_5wrkX3sa2pXAqeANZCpoaBO2LDhb6qnmgB5-KmV-pNODRMH9NfpRAtxVFJQVyju9SQjow0qsPDwEUkQxQe7i-Ws5_NWjIGSggzyQu6yGIMjlDQRpIl02wL0Lvqw";
  };
  const [photos, setPhotos] = useState([]);
  
  const ratingLabels = ["Poor", "Fair", "Good", "Great", "Excellent!"];

  const handleFileUpload = (e) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        bookingId,
        technician: selectedTech,
        service: 'Fleet Full Inspection',
        rating,
        comment: feedback,
      });
      alert('Review Submitted Successfully!');
      navigate(ROUTES.dashboard);
    } catch (err) {
      alert(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-x-hidden min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-lg h-16 bg-surface shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(ROUTES.dashboard)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">menu</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">FleetOS</h1>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={() => navigate(ROUTES.bookings)} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-primary">notifications</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-32 max-w-2xl mx-auto px-container-margin">
        {/* Success Headline Area */}
        <div className="text-center mb-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-tertiary-container text-on-tertiary-container rounded-full mb-md shadow-lg shadow-tertiary/20">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'wght' 600" }}>check_circle</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Service Completed!</h2>
          <p className="text-on-secondary-container font-body-lg text-body-lg">Thank you for choosing FleetOS. Your feedback helps our partners improve.</p>
        </div>

        {/* Review Card */}
        <section className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_16px_rgba(11,29,45,0.12)] border border-surface-container-high">
          {/* Rating Selector Section */}
          <div className="flex flex-col items-center mb-xl">
            <label className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-md">How was your service?</label>
            <div className="flex gap-xs">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  className="group p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95" 
                  onClick={() => setRating(star)}
                >
                  <span 
                    className={`material-symbols-outlined text-5xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-surface-variant group-hover:text-yellow-400'}`}
                    style={{ fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <p className={`mt-sm font-nav-item text-nav-item italic h-5 ${rating > 0 ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
              {rating > 0 ? ratingLabels[rating - 1] : ''}
            </p>
          </div>

          {/* Text Feedback Area */}
          <div className="mb-lg">
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs" htmlFor="experience">Tell us about your experience</label>
            <textarea 
              id="experience" 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-surface-container rounded-lg border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary p-md font-body-md text-body-md placeholder:text-on-secondary-container/50 transition-all resize-none" 
              placeholder="Was the service on time? Did the technician follow all safety protocols?" 
              rows="5"
            ></textarea>
          </div>

          {/* Upload Photos Area */}
          <div className="mb-xl">
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Upload Photos (Optional)</label>
            <div className="group relative w-full border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container-high hover:border-primary transition-all cursor-pointer">
              <input 
                type="file" 
                multiple 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              />
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-sm group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">add_a_photo</span>
              </div>
              <span className="font-nav-item text-nav-item text-primary font-bold">Add photos of the work</span>
              <p className="text-xs text-on-surface-variant mt-1">Capture details to help verification</p>
              
              {/* Image Previews */}
              {photos.length > 0 && (
                <div className="mt-lg flex flex-wrap gap-md justify-center w-full z-10 relative">
                  {photos.map((src, index) => (
                    <div key={index} className="w-20 h-20 rounded-lg bg-surface-container-highest flex items-center justify-center overflow-hidden border border-surface-container-high relative group/img">
                      <img src={src} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removePhoto(index); }}
                        className="absolute top-1 right-1 bg-error text-on-error rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity flex"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-md mt-lg">
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-on-primary font-bold py-md px-xl rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Review
                  <span className="material-symbols-outlined">send</span>
                </>
              )}
            </button>
            <button 
              onClick={() => navigate('/customer/dashboard')}
              className="flex-1 bg-surface-container-high text-on-surface-variant font-bold py-md px-xl rounded-xl hover:bg-surface-container-highest transition-all"
            >
              Back to Home
            </button>
          </div>
        </section>

        {/* Context Card: Service Summary */}
        <div className="mt-xl grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="bg-surface-container-low p-md rounded-xl flex items-start gap-md">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary">oil_barrel</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Service Type</p>
              <p className="font-headline-md text-headline-md">Mobile Oil Change</p>
              <p className="text-xs text-outline">Reference: #FOS-88219</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-md rounded-xl flex items-start gap-md">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-surface-container-high">
              <img className="w-full h-full object-cover" alt={selectedTech} src={getTechAvatar(selectedTech)} />
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Technician</p>
              <p className="font-headline-md text-headline-md">{selectedTech}</p>
              <p className="text-xs text-tertiary flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Certified Expert
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-container-margin py-sm bg-surface shadow-[0_-4px_16px_0_rgba(11,29,45,0.12)] rounded-t-xl">
        <a href={ROUTES.dashboard} onClick={e => {e.preventDefault(); navigate(ROUTES.dashboard);}} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-transform duration-150 scale-95 active:scale-90">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-nav-item text-nav-item">Dashboard</span>
        </a>
        <a href={ROUTES.bookings} onClick={e => {e.preventDefault(); navigate(ROUTES.bookings);}} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-transform duration-150 scale-95 active:scale-90">
          <span className="material-symbols-outlined">event_note</span>
          <span className="font-nav-item text-nav-item">Bookings</span>
        </a>
        <a href={ROUTES.bookings} onClick={e => {e.preventDefault(); navigate(ROUTES.bookings);}} className="flex flex-col items-center justify-center text-on-secondary-fixed-variant px-4 py-1 hover:bg-surface-container-high transition-transform duration-150 scale-95 active:scale-90">
          <span className="material-symbols-outlined">search</span>
          <span className="font-nav-item text-nav-item">Search</span>
        </a>
        <a href={ROUTES.profile} onClick={e => {e.preventDefault(); navigate(ROUTES.profile);}} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 transition-transform duration-150 scale-95 active:scale-90">
          <span className="material-symbols-outlined">person</span>
          <span className="font-nav-item text-nav-item">Profile</span>
        </a>
      </nav>
    </div>
  );
}

export default ServiceReview;
