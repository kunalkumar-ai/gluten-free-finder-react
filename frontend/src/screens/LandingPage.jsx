import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';


const TRIP_WORDS = ['trip', 'hotels', 'flights', 'cruises', 'food', 'emergencies'];

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
      '.landing-page .feature, .landing-page .step, .landing-page .problem-item, .landing-page .condition-row, .landing-page .pricing-card'
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
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <button className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', padding: 0, color: 'var(--gray)' }} onClick={onNavigateToAllergies}>Allergens</button>
          <button className="nav-cta" onClick={scrollToWaitlist}>Join Waitlist</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            One hub for every allergy
          </div>

          <h1>
            Your <span className="hero-allergy-word">allergy</span><br />
            comes with you everywhere.
          </h1>

          <p className="hero-tagline">The anxiety doesn't have to.</p>

          <p className="hero-sub">
            CeliacAI handles your{' '}
            <span className="trip-rotating-word" style={{ opacity: tripVisible ? 1 : 0, transform: tripVisible ? 'translateY(0)' : 'translateY(-8px)' }}>
              {TRIP_WORDS[tripIndex]}
            </span>
            {' '}so you travel freely, not fearfully.
          </p>

          <div className="founder-badge">
            <span className="founder-badge-icon">🌾</span>
            Built by someone who has celiac disease, lactose intolerance &amp; an egg allergy
          </div>

          <div className="allergy-row">
            <span className="allergy-pill pill-celiac"><span className="pill-dot"></span> Celiac / Gluten</span>
            <span className="allergy-pill pill-lactose"><span className="pill-dot"></span> Lactose</span>
            <span className="allergy-pill pill-egg"><span className="pill-dot"></span> Egg</span>
            <span className="allergy-pill pill-nuts"><span className="pill-dot"></span> Nut allergy</span>
            <span className="allergy-pill pill-soy"><span className="pill-dot"></span> Soy</span>
            <span className="allergy-pill pill-more">+14 more</span>
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
      <section className="problem-band">
        <div className="problem-band-inner">
          <p className="section-tag" style={{ background: 'rgba(116,198,157,.12)', color: '#74C69D' }}>The real problem</p>
          <h2>Every tool was built<br />for <em>one condition.</em><br />You have several.</h2>
          <p className="problem-lead">If you have celiac disease plus lactose intolerance plus an egg allergy — which millions of people do — no single app has ever handled all three.</p>

          <div className="problem-grid">
            <div className="problem-item">
              <div className="problem-num">01</div>
              <h3>One card per condition</h3>
              <p>Equal Eats, GlutenFreeCard, Spokin — all excellent for one condition. Your reality is three conditions, three cards, hoping the waiter reads all of them.</p>
            </div>
            <div className="problem-item">
              <div className="problem-num">02</div>
              <h3>No AI, just static text</h3>
              <p>None of the existing tools can read an actual menu in front of you, scan packaging in a Japanese supermarket, or flag that "may contain" thresholds vary by country.</p>
            </div>
            <div className="problem-item">
              <div className="problem-num">03</div>
              <h3>Zero trip preparation</h3>
              <p>You land in Bangkok with no briefing on fish sauce risks, no safe grocery brands, no knowledge of the word "wheat" in Thai. You find out the hard way.</p>
            </div>
          </div>

          <div className="problem-callout">
            <div className="callout-icon">💸</div>
            <div className="callout-text">
              A glutening episode ruins <strong>3–5 days of a holiday</strong>. If your holiday cost €3,000, paying <strong>€49/year</strong> to protect it is the easiest decision you'll ever make.
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-header">
          <span className="section-tag">What CeliacAI does</span>
          <h2>Every tool you need.<br /><em>Finally in one place.</em></h2>
          <p>Built for the strictest dietary condition on earth — so it works for everyone else too.</p>
        </div>

        <div className="features-layout">
          <div className="feature hero-feature">
            <div>
              <span className="feature-coming">Coming soon</span>
              <div className="feature-icon-wrap">📷</div>
              <h3>AI Menu Scanner</h3>
              <p>Point your camera at any menu — printed, handwritten, digital, in any language. CeliacAI scans it against your full allergy profile and shows you exactly what's safe, what to avoid, and what questions to ask.</p>
            </div>
            <div className="hero-feature-visual">
              <div className="scan-header">Live scan — Tokyo restaurant</div>
              <div className="menu-scan-demo">
                <div className="dish-row"><span className="dish-name">Yakitori chicken</span><span className="dish-status safe">✓ Safe</span></div>
                <div className="dish-row"><span className="dish-name">Ramen noodles</span><span className="dish-status danger">✗ Gluten</span></div>
                <div className="dish-row"><span className="dish-name">Edamame</span><span className="dish-status safe">✓ Safe</span></div>
                <div className="dish-row"><span className="dish-name">Tamago sushi</span><span className="dish-status danger">✗ Egg</span></div>
                <div className="dish-row"><span className="dish-name">Miso soup</span><span className="dish-status warn">⚠ Check soy</span></div>
              </div>
            </div>
          </div>

          <div className="feature f1">
            <span className="feature-coming">Coming soon</span>
            <div className="feature-icon-wrap">🗺️</div>
            <h3>Gluten-free restaurant finder</h3>
            <p>Find celiac-safe restaurants near you or in any city worldwide. AI-verified, filtered by your exact conditions.</p>
          </div>

          <div className="feature f2">
            <span className="feature-coming">Coming soon</span>
            <div className="feature-icon-wrap">🪪</div>
            <h3>Multi-condition card</h3>
            <p>One card, all your conditions, in 60+ languages. Celiac + lactose + egg — generated in seconds, shown to any waiter anywhere.</p>
          </div>

          <div className="feature f3">
            <span className="feature-coming">Coming soon</span>
            <div className="feature-icon-wrap">✈️</div>
            <h3>Trip prep assistant</h3>
            <p>Before you land: safe dishes, hidden allergens, local grocery brands, key phrases, and a curated restaurant shortlist — personalised to your conditions.</p>
          </div>

          <div className="feature f4">
            <span className="feature-coming">Coming soon</span>
            <div className="feature-icon-wrap">🚨</div>
            <h3>Emergency layer</h3>
            <p>Nearest hospital in one tap. Local names for your allergens in the local language. Available medications. Pre-filled emergency card for doctors.</p>
          </div>

          <div className="feature f5">
            <span className="feature-coming">Coming soon</span>
            <div className="feature-icon-wrap">⭐</div>
            <h3>Community reviews</h3>
            <p>Reviews filtered by your exact combination — not just "gluten-free friendly" but "safe for celiac + lactose." Real intel from people like you.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="how-inner">
          <h2>How it works <em>at the table</em></h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Set your profile once</h3>
              <p>Enter all your conditions — celiac, lactose, egg, nuts, or whatever combination is yours. CeliacAI remembers all of them, always.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Scan any menu</h3>
              <p>Open the camera. Point at the menu in any language. Get an instant colour-coded breakdown of every dish against your full profile.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Show the card</h3>
              <p>One tap generates your translated multi-condition card. Show it to the waiter. They understand exactly what you need — first time, every time.</p>
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
