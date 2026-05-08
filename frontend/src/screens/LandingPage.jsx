import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';


const TRIP_WORDS = [ 'allergy', 'planning', 'itenerary','language barriers', 'food', 'emergencies'];

const LandingPage = ({ onNavigateToAllergies }) => {
  const [formStep, setFormStep] = useState(1);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedTier, setSelectedTier] = useState('Traveller — €49/yr');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [emailError, setEmailError] = useState(false);
  const [counterValue, setCounterValue] = useState(0);
  const [finalEmail, setFinalEmail] = useState('');
  const [finalDone, setFinalDone] = useState(false);
  const [tripIndex, setTripIndex] = useState(0);
  const [tripVisible, setTripVisible] = useState(true);
  const animationDoneRef = useRef(false);
  const targetCountRef = useRef(0);

  // Fetch real count then animate up to it
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
    fetch(`${backendUrl}/waitlist-count`)
      .then((r) => r.json())
      .then((data) => {
        const target = data.count || 0;
        targetCountRef.current = target;
        const duration = 2000;
        const startTime = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - startTime) / duration, 1);
          setCounterValue(Math.floor(progress * target));
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            animationDoneRef.current = true;
          }
        };
        requestAnimationFrame(tick);
      })
      .catch(() => {
        // Fallback: animate to 0 silently
        animationDoneRef.current = true;
      });
  }, []);

  // Occasional live counter increment after initial animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (animationDoneRef.current && Math.random() > 0.7) {
        setCounterValue((v) => v + 1);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Rotating subline word
  useEffect(() => {
    const interval = setInterval(() => {
      setTripVisible(false);
      setTimeout(() => {
        setTripIndex((i) => (i + 1) % TRIP_WORDS.length);
        setTripVisible(true);
      }, 300);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  // Scroll-reveal IntersectionObserver
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.landing-page .feature, .landing-page .step, .landing-page .problem-item, .landing-page .condition-row, .landing-page .pricing-card, .landing-page .fe-row'
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleJoinWaitlist = async () => {
    if (!email || !email.includes('@')) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setIsSubmitting(true);
    setSubmitError(null);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
    try {
      const res = await fetch(`${backendUrl}/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, plan: selectedTier }),
      });
      if (res.ok) {
        setFormStep(2);
        setCounterValue((v) => v + 1);
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalJoin = async () => {
    if (!finalEmail || !finalEmail.includes('@')) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5007';
    try {
      await fetch(`${backendUrl}/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail, name: '', plan: 'Free' }),
      });
    } catch { /* silent */ }
    setFinalDone(true);
    setCounterValue((v) => v + 1);
  };

  const scrollToWaitlist = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="landing-page">

      {/* NAV */}
      <nav>
        <a href="/" className="logo">
          <div className="logo-mark">C</div>
          <span className="logo-text">Celiac<span>AI</span></span>
        </a>
        <div className="nav-right">
          <a href="#problem" className="nav-link">Problem</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <button className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', padding: 0, color: 'var(--gray)' }} onClick={onNavigateToAllergies}>Allergens</button>
          <button className="nav-cta" onClick={scrollToWaitlist}>Join Waitlist</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">

        <div className="hero-founder-bar">
          <span className="hero-founder-bar-icon">🌾</span>
          Built by someone with celiac disease, lactose intolerance &amp; an egg allergy
        </div>

        <div className="hero-left">
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            One hub for every allergy
          </div>

          <h1>
            We handle your{' '}
            <span
              className="trip-rotating-word"
              style={{ opacity: tripVisible ? 1 : 0, transform: tripVisible ? 'translateY(0)' : 'translateY(-8px)' }}
            >
              {TRIP_WORDS[tripIndex]}
            </span>
            <br />so you travel freely, not fearfully.
          </h1>

          <p className="hero-sub">
            Your <span className="hero-allergy-word">allergies</span> come with you.
            The <span className="hero-tagline-anxiety">anxiety</span> doesn't have to.
          </p>

          <div className="allergy-row">
            <span className="allergy-pill pill-celiac">🌾 Celiac / Gluten</span>
            <span className="allergy-pill pill-lactose">🥛 Milk / Lactose</span>
            <span className="allergy-pill pill-peanut">🥜 Peanuts</span>
            <span className="allergy-pill pill-egg">🥚 Egg</span>
            <span className="allergy-pill pill-fish">🐟 Fish / Shellfish</span>
            <span className="allergy-pill pill-nuts">🌰 Tree Nuts</span>
            <span className="allergy-pill pill-soy">🫘 Soy</span>
            <span className="allergy-pill pill-preserv">🧪 Preservatives</span>
            
          </div>

          <div className="social-strip">
            <div className="avatars">
              <div className="avatar av1">MK</div>
              <div className="avatar av2">SR</div>
              <div className="avatar av3">JL</div>
              <div className="avatar av4">AP</div>
              <div className="avatar av5">TW</div>
            </div>
            <div>
              <div className="stars">★★★★★</div>
              <div className="social-text"><strong>{counterValue} people</strong> already on the waitlist</div>
            </div>
          </div>
        </div>

        {/* WAITLIST CARD */}
        <div className="waitlist-card" id="waitlist">
          <div className="card-counter">
            <div>
              <div className="counter-left">Waitlist spots taken</div>
              <div className="counter-num">{counterValue}</div>
            </div>
            <div className="counter-live">
              <span className="live-dot"></span>
              Live
            </div>
          </div>

          {/* STEP 1 */}
          <div className={`card-step ${formStep === 1 ? 'active' : ''}`}>
            <div className="step1-title">Reserve your spot</div>
            <p className="step1-sub">Tell us which plan interests you — this helps us build the right features first. No charge until launch.</p>

            <div className="form-group">
              <label className="form-label" htmlFor="wl-email">Your email</label>
              <input
                className={`form-input ${emailError ? 'error' : ''}`}
                type="email"
                id="wl-email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="wl-name">Your name</label>
              <input
                className="form-input"
                type="text"
                id="wl-name"
                placeholder="First name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <span className="tier-label">Which plan are you interested in?</span>
            <div className="tiers">
              <div
                className={`tier-option ${selectedTier === 'Free' ? 'selected' : ''}`}
                onClick={() => setSelectedTier('Free')}
              >
                <div className="tier-radio"><div className="tier-radio-inner"></div></div>
                <div className="tier-info">
                  <div className="tier-name">Free</div>
                  <div className="tier-desc">3 menu scans/month · basic card</div>
                </div>
                <div className="tier-price">€0</div>
              </div>

              <div
                className={`tier-option ${selectedTier === 'Traveller — €49/yr' ? 'selected' : ''}`}
                onClick={() => setSelectedTier('Traveller — €49/yr')}
              >
                <div className="tier-badge">Popular</div>
                <div className="tier-radio"><div className="tier-radio-inner"></div></div>
                <div className="tier-info">
                  <div className="tier-name">Traveller</div>
                  <div className="tier-desc">Unlimited scans · 60+ languages · trip prep</div>
                </div>
                <div className="tier-price">€49/yr</div>
              </div>

              <div
                className={`tier-option ${selectedTier === 'Family — €99/yr' ? 'selected' : ''}`}
                onClick={() => setSelectedTier('Family — €99/yr')}
              >
                <div className="tier-radio"><div className="tier-radio-inner"></div></div>
                <div className="tier-info">
                  <div className="tier-name">Family</div>
                  <div className="tier-desc">Up to 5 profiles · all conditions</div>
                </div>
                <div className="tier-price">€99/yr</div>
              </div>
            </div>

            <button className="btn-join" onClick={handleJoinWaitlist} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Reserve my spot →'}
            </button>
            {submitError && <p className="submit-error">{submitError}</p>}
            <p className="card-privacy">🔒 No spam. No card required. Unsubscribe anytime.</p>
          </div>

          {/* STEP 2 */}
          <div className={`card-step ${formStep === 2 ? 'active' : ''}`}>
            <div className="step2-inner">
              <div className="step2-icon">✓</div>
              <div className="step2-title">You're on the list!</div>
              <p className="step2-sub">We'll email you the moment CeliacAI launches. You're one of the first — founding member pricing is locked in for you.</p>
              <div className="tier-selected-badge">{selectedTier}</div>
              <p className="share-prompt">Know someone who'd benefit?</p>
              <div className="share-btns">
                <a
                  className="share-btn"
                  href="https://twitter.com/intent/tweet?text=Just%20joined%20the%20CeliacAI%20waitlist%20—%20an%20AI%20travel%20companion%20for%20celiacs%20and%20allergy%20sufferers.%20celiacai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >🐦 Share on X</a>
                <a
                  className="share-btn"
                  href="https://wa.me/?text=Just%20joined%20CeliacAI%20waitlist%20—%20finally%20an%20AI%20app%20for%20celiac%20%26%20allergy%20travel.%20celiacai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >💬 WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="problem-band" id="problem">
        <div className="problem-band-inner">

          <p className="section-tag">What you actually carry</p>

          <h2>You don't just travel<br />with your <em>allergy.</em></h2>

          <div className="burden-list">
            <div className="burden-item">😰 <span>The fear</span></div>
            <div className="burden-item">📋 <span>The planning</span></div>
            <div className="burden-item">🗣️ <span>The explaining</span></div>
            <div className="burden-item">😔 <span>The isolation</span></div>
            <div className="burden-item">😟 <span>The constant worry</span></div>
          </div>

          <div className="problem-resolution">
            <div className="resolution-divider" />
            <p className="resolution-text">
              CeliacAI carries <em>all of it</em> 
            </p>
            <p className="resolution-payoff">so you just carry your excitement.</p>
          </div>

        </div>
      </section>

      {/* FEATURES EDITORIAL */}
      <section className="fe-section" id="features">
        <div className="fe-inner">
          <div className="fe-header">
            <p className="section-tag">What CeliacAI handles</p>
            <h2>Every moment of your trip.<br /><em>Covered.</em></h2>
          </div>

          {/* 1. Restaurant Finder — photo left */}
          <div className="fe-row">
            <div className="fe-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80')" }} />
            <div className="fe-text">
              <span className="fe-icon">📍</span>
              <h3 className="fe-heading">Safe restaurants,<br />found.</h3>
              <p className="fe-body">From boutique cafés to last-minute dinners — our AI surfaces only places verified safe for your exact conditions, wherever you are.</p>
              <span className="fe-badge fe-badge-live">✓ Available now</span>
            </div>
          </div>

          {/* 2. Menu Scanner — photo right */}
          <div className="fe-row fe-row-reverse">
            <div className="fe-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80')" }} />
            <div className="fe-text">
              <span className="fe-icon">📷</span>
              <h3 className="fe-heading">Any menu,<br />anywhere, decoded.</h3>
              <p className="fe-body">Point your camera at a menu — in any language — and get an instant dish-by-dish verdict against your personal allergy profile.</p>
              <span className="fe-badge fe-badge-soon">Coming soon</span>
            </div>
          </div>

          {/* 3. Trip Planning — photo left */}
          <div className="fe-row">
            <div className="fe-photo" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80')" }} />
            <div className="fe-text">
              <span className="fe-icon">🧳</span>
              <h3 className="fe-heading">Your whole trip,<br />prepped.</h3>
              <p className="fe-body">Hotels, restaurants, grocery stores, and local allergy phrases — all lined up before you land, so every destination is safe before you arrive.</p>
              <span className="fe-badge fe-badge-soon">Coming soon</span>
            </div>
          </div>

          {/* 4. Emergencies — phone panel right */}
          <div className="fe-row fe-row-reverse">
            <div className="fe-emergency">
              <div className="fe-phone">
                <div className="fep-notch" />
                <div className="fep-status">
                  <span>9:41</span>
                  <span>▲ SOS</span>
                </div>
                <div className="fep-sos-bar">
                  <span className="fep-dot" />
                  <span>EMERGENCY MODE</span>
                </div>
                <div className="fep-number-block">
                  <div className="fep-label">Emergency Services</div>
                  <div className="fep-number">112</div>
                  <div className="fep-sublabel">EU universal · works anywhere</div>
                </div>
                <div className="fep-contacts">
                  <div className="fep-contact"><span>🇮🇹 Italy</span><span>112</span></div>
                  <div className="fep-contact"><span>🇯🇵 Japan</span><span>119</span></div>
                  <div className="fep-contact"><span>🇺🇸 USA</span><span>911</span></div>
                </div>
                <div className="fep-call">📞 CALL NOW</div>
              </div>
            </div>
            <div className="fe-text">
              <span className="fe-icon">🚨</span>
              <h3 className="fe-heading">Emergencies,<br />handled.</h3>
              <p className="fe-body">Nearest hospital, allergen names in the local language, and local emergency numbers — one tap away, always. Even offline.</p>
              <span className="fe-badge fe-badge-emergency">⚡ Always available</span>
            </div>
          </div>

        </div>
      </section>


      {/* FOUNDER STORY */}
      <section className="founder">
        <div className="founder-left">
          <blockquote className="founder-quote">
            "I got sick in three countries before I built the app <em>I actually needed.</em>"
          </blockquote>
          <div className="founder-name">The founder</div>
          <div className="founder-role">Celiac disease · Lactose intolerance · Egg allergy</div>
        </div>
        <div className="founder-right">
          <div className="founder-conditions">
            <div className="condition-row">
              <span className="condition-icon">🌾</span>
              <div className="condition-text">
                <h4>Celiac disease</h4>
                <p>Strict gluten-free required — not preference, medical necessity</p>
              </div>
            </div>
            <div className="condition-row">
              <span className="condition-icon">🥛</span>
              <div className="condition-text">
                <h4>Lactose intolerance</h4>
                <p>Hidden dairy in sauces, breads, and dressings everywhere</p>
              </div>
            </div>
            <div className="condition-row">
              <span className="condition-icon">🥚</span>
              <div className="condition-text">
                <h4>Egg allergy</h4>
                <p>Used in pastas, glazes, mayonnaise — often invisible on menus</p>
              </div>
            </div>
          </div>
          <div className="founder-note">
            No single app handled all three. So CeliacAI became the tool every multi-condition traveler has been missing.
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="pricing-inner">
          <h2>Less than one <em>bad meal abroad.</em></h2>

          <div className="pricing-cards">
            <div className="pricing-card">
              <div className="plan-name">Free</div>
              <div className="plan-price">€0</div>
              <div className="plan-period">forever</div>
              <ul className="plan-features">
                <li>3 AI menu scans / month</li>
                <li>Basic translation card (English)</li>
                <li>Restaurant finder</li>
                <li>Emergency hospital finder</li>
              </ul>
              <button className="plan-btn" onClick={scrollToWaitlist}>Join waitlist free</button>
            </div>

            <div className="pricing-card featured">
              <div className="featured-badge">Most popular</div>
              <div className="plan-name">Traveller</div>
              <div className="plan-price">€49<span className="plan-saving">Save 35%</span></div>
              <div className="plan-period">per year · or €5.99/month</div>
              <ul className="plan-features">
                <li>Unlimited AI menu scans</li>
                <li>Multi-condition cards in 60+ languages</li>
                <li>Trip prep for unlimited destinations</li>
                <li>Packaging barcode scanner</li>
                <li>Full emergency layer</li>
                <li>Community reviews + contribute</li>
              </ul>
              <button className="plan-btn" onClick={scrollToWaitlist}>Reserve founding price</button>
            </div>

            <div className="pricing-card">
              <div className="plan-name">Family</div>
              <div className="plan-price">€99</div>
              <div className="plan-period">per year — up to 5 profiles</div>
              <ul className="plan-features">
                <li>Everything in Traveller</li>
                <li>5 separate allergy profiles</li>
                <li>Group trip prep assistant</li>
                <li>B2B enquiries welcome</li>
              </ul>
              <button className="plan-btn" onClick={scrollToWaitlist}>Reserve founding price</button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <h2>Eat safely.<br /><em>Everywhere.</em></h2>
        <p>Join {counterValue} celiacs and allergy travelers who are done leaving their health to chance.</p>
        <div className="final-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={finalEmail}
            onChange={(e) => setFinalEmail(e.target.value)}
            disabled={finalDone}
          />
          <button onClick={handleFinalJoin} disabled={finalDone}>
            {finalDone ? "You're on the list ✓" : 'Join waitlist →'}
          </button>
        </div>
        <p className="final-note">No card required. No spam. Just a heads-up when we launch.</p>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-left">
          <div className="logo">
            <div className="logo-mark">C</div>
            <span className="logo-text">Celiac<span>AI</span></span>
          </div>
          <span className="footer-tagline">One hub for every allergy.</span>
        </div>
        <div className="footer-right">Built by a celiac traveler. © 2025 CeliacAI · celiacai.com</div>
      </footer>

    </div>
  );
};

export default LandingPage;
