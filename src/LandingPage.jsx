import React, { useState, useEffect } from 'react';
import './LandingPage.css';

export default function LandingPage({ onBookDemo }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAgent, setActiveAgent] = useState('clinical');
  const [workflowBranch, setWorkflowBranch] = useState('available');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    pharmacyName: '',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // 2-Finger Horizontal Swipe Right on Landing Page -> Navigate to Portal Selection
  useEffect(() => {
    if (!onBookDemo) return;

    let lastSwipeTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        e.preventDefault();
        if (e.deltaX < -15) {
          const now = Date.now();
          if (now - lastSwipeTime > 500) {
            lastSwipeTime = now;
            onBookDemo();
          }
        }
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY);
        if (diffX > 70 && diffY < 50) {
          onBookDemo();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onBookDemo]);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="remedy-landing">
      {/* Background Animated Gradient Blobs */}
      <div className="remedy-bg-glow glow-1"></div>
      <div className="remedy-bg-glow glow-2"></div>
      <div className="remedy-bg-glow glow-3"></div>

      {/* TOP NAVIGATION BAR */}
      <header className="remedy-navbar">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="logo-icon-box">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="url(#logo-grad)"/>
                <path d="M7 12H17M12 7V17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <defs>
                  <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563EB"/>
                    <stop offset="1" stopColor="#7C3AED"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="logo-text">Hosp<span className="logo-accent">Sync</span></span>
          </div>

          <nav className="nav-menu">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Features</a>
            <a href="#workflow" onClick={(e) => { e.preventDefault(); scrollToSection('workflow'); }}>Workflow</a>
            <a href="#dashboard" onClick={(e) => { e.preventDefault(); scrollToSection('dashboard'); }}>Dashboard</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection('pricing'); }}>Pricing</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}>Contact</a>
          </nav>

          <div className="nav-actions">
            <button className="btn-nav-demo" onClick={() => onBookDemo()}>
              Book Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="remedy-hero">
        <div className="hero-container">
          <div className="hero-pill-badge">
            <span className="pill-dot"></span>
            <span>SNS Hospital Operating System 2.0</span>
            <span className="pill-arrow">&rarr;</span>
          </div>

          <h1 className="hero-headline">
            AI Agents That Power <br />
            <span className="hero-gradient-text">Modern Pharmacies</span>
          </h1>

          <p className="hero-subheading">
            Automate the entire medication journey—from AI voice prescriptions and clinical validation to inventory management and patient notifications—while reducing medication errors and improving operational efficiency.
          </p>

          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={() => onBookDemo()}>
              Book Demo
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button className="btn-hero-secondary" onClick={() => scrollToSection('workflow')}>
              Watch Workflow
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            </button>
          </div>
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section className="remedy-workflow" id="workflow">
        <div className="section-header">
          <span className="section-tag">INTELLIGENT ARCHITECTURE</span>
          <h2 className="section-title">Complete AI Medication Workflow</h2>
          <p className="section-desc">An end-to-end autonomous pipeline connecting doctors, pharmacies, and patients seamlessly.</p>
        </div>

        {/* Workflow Branch Selector Toggle */}
        <div className="workflow-branch-toggle">
          <button 
            className={`toggle-btn ${workflowBranch === 'available' ? 'active' : ''}`}
            onClick={() => setWorkflowBranch('available')}
          >
            Branch 1: Medicine Available (Standard Flow)
          </button>
          <button 
            className={`toggle-btn ${workflowBranch === 'unavailable' ? 'active' : ''}`}
            onClick={() => setWorkflowBranch('unavailable')}
          >
            Branch 2: Medicine Unavailable (Restock & Re-route)
          </button>
        </div>

        <div className="workflow-vertical-timeline">
          {/* Node 1 */}
          <div className="wf-card-node">
            <div className="wf-step-badge">01</div>
            <div className="wf-node-content">
              <h4>Patient Visits Doctor</h4>
              <p>Initial consultation conducted at clinic or hospital terminal.</p>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 2 */}
          <div className="wf-card-node">
            <div className="wf-step-badge">02</div>
            <div className="wf-node-content">
              <h4>AI Voice Prescription</h4>
              <p>Whisper AI listens to doctor-patient conversation and transcribes medical intent in real time.</p>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 3 */}
          <div className="wf-card-node highlight-card">
            <div className="wf-step-badge purple">03</div>
            <div className="wf-node-content">
              <h4>AI Clinical Validation</h4>
              <div className="validation-tags">
                <span className="v-tag">✓ Dosage Check</span>
                <span className="v-tag">✓ Allergy Detection</span>
                <span className="v-tag">✓ Drug Interaction Analysis</span>
              </div>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 4 */}
          <div className="wf-card-node">
            <div className="wf-step-badge">04</div>
            <div className="wf-node-content">
              <h4>Doctor Verification</h4>
              <p>Doctor reviews AI-extracted structured prescription, approves, and signs digitally.</p>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 5 */}
          <div className="wf-card-node">
            <div className="wf-step-badge">05</div>
            <div className="wf-node-content">
              <h4>Digital Prescription Generated</h4>
              <p>Encrypted PDF & FHIR JSON prescription generated instantly with unique QR verification.</p>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 6 */}
          <div className="wf-card-node split-node">
            <div className="wf-step-badge blue">06</div>
            <div className="wf-node-content">
              <h4>Prescription Sent Simultaneously to</h4>
              <div className="split-badges">
                <span className="s-badge">Patient App / WhatsApp</span>
                <span className="s-badge">Pharmacy Terminal</span>
              </div>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* Node 7 */}
          <div className="wf-card-node">
            <div className="wf-step-badge">07</div>
            <div className="wf-node-content">
              <h4>AI Prescription & Inventory Check</h4>
              <p>Pharmacy AI agent checks stock availability and validates dosage against pharmacy inventory.</p>
            </div>
          </div>
          <div className="wf-connector">↓</div>

          {/* DYNAMIC BRANCHING WORKFLOW */}
          {workflowBranch === 'available' ? (
            <div className="branch-container branch-success">
              <div className="branch-header-tag green">BRANCH ONE: MEDICINE AVAILABLE</div>
              
              <div className="wf-card-node branch-node">
                <div className="wf-step-badge green">08A</div>
                <div className="wf-node-content">
                  <h4>Pharmacist Verification</h4>
                  <p>Pharmacist verifies AI bill breakdown and approves automated itemized GST order.</p>
                </div>
              </div>
              <div className="wf-connector">↓</div>

              <div className="wf-card-node branch-node">
                <div className="wf-step-badge green">09A</div>
                <div className="wf-node-content">
                  <h4>Medicine Dispensed</h4>
                  <p>Medication packaged with smart QR label and handed to patient.</p>
                </div>
              </div>
              <div className="wf-connector">↓</div>

              <div className="wf-card-node branch-node highlight-green">
                <div className="wf-step-badge green">10A</div>
                <div className="wf-node-content">
                  <h4>Patient Notified</h4>
                  <p>Automatic SMS & WhatsApp sent with digital receipt, dosage schedule, and intake alerts.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="branch-container branch-alert">
              <div className="branch-header-tag orange">BRANCH TWO: MEDICINE UNAVAILABLE</div>

              <div className="wf-card-node branch-node">
                <div className="wf-step-badge orange">08B</div>
                <div className="wf-node-content">
                  <h4>Notify Doctor & Patient</h4>
                  <p>Instant alert dispatched suggesting alternative substitute medications.</p>
                </div>
              </div>
              <div className="wf-connector">↓</div>

              <div className="wf-card-node branch-node">
                <div className="wf-step-badge orange">09B</div>
                <div className="wf-node-content">
                  <h4>AI Inventory Management Restock</h4>
                  <p>Inventory AI agent triggers urgent auto-purchase order to regional distributor.</p>
                </div>
              </div>
              <div className="wf-connector">↓</div>

              <div className="wf-card-node branch-node highlight-orange">
                <div className="wf-step-badge orange">10B</div>
                <div className="wf-node-content">
                  <h4>Medicine Restocked & Patient Notified</h4>
                  <p>Patient notified when stock arrives or re-routed to nearest partner pharmacy branch.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="remedy-features" id="features">
        <div className="section-header">
          <span className="section-tag">CORE CAPABILITIES</span>
          <h2 className="section-title">Built for High-Precision Pharmacy Operations</h2>
          <p className="section-desc">Six core AI modules working in harmony to eliminate errors and speed up dispensing.</p>
        </div>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon-box blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </div>
            <h3>AI Voice Prescription</h3>
            <p>Convert doctor-patient acoustic conversations into structured digital prescriptions instantly.</p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon-box purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <h3>Clinical Validation</h3>
            <p>Detect allergies, dosage mistakes, and lethal drug-to-drug interactions before dispensing.</p>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div className="feature-icon-box teal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h3>Smart Inventory</h3>
            <p>Track live medicine stock, monitor shelf expiration dates, and predict regional stock shortages.</p>
          </div>

          {/* Feature 4 */}
          <div className="feature-card">
            <div className="feature-icon-box blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3>Digital Prescription</h3>
            <p>Secure, cloud-based encrypted prescription storage accessible by authorized medical staff anytime.</p>
          </div>

          {/* Feature 5 */}
          <div className="feature-card">
            <div className="feature-icon-box green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>Patient Communication</h3>
            <p>Automatic SMS, WhatsApp, and app notifications with digital invoices and intake schedule reminders.</p>
          </div>

          {/* Feature 6 */}
          <div className="feature-card">
            <div className="feature-icon-box purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </div>
            <h3>Analytics Dashboard</h3>
            <p>Monitor pharmacy revenue performance, medicine consumption trends, and terminal queue efficiency.</p>
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section className="remedy-dashboard-showcase" id="dashboard">
        <div className="section-header">
          <span className="section-tag">OPERATING SYSTEM PREVIEW</span>
          <h2 className="section-title">An Intelligent OS Built for Pharmacy Teams</h2>
          <p className="section-desc">Experience modern SaaS software design tailored for doctors, pharmacists, and clinic managers.</p>
        </div>

        <div className="saas-dashboard-frame">
          <div className="saas-sidebar">
            <div className="sidebar-brand">
              <span className="s-logo">SNS Hospital OS</span>
            </div>
            <div className="sidebar-menu">
              <button 
                className={`s-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Dashboard
              </button>
              <button 
                className={`s-item ${activeTab === 'patients' ? 'active' : ''}`}
                onClick={() => setActiveTab('patients')}
              >
                👥 Patients
              </button>
              <button 
                className={`s-item ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctors')}
              >
                🩺 Doctors
              </button>
              <button 
                className={`s-item ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('prescriptions')}
              >
                📝 Prescriptions
              </button>
              <button 
                className={`s-item ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                📦 Inventory
              </button>
              <button 
                className={`s-item ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📈 Analytics
              </button>
            </div>
          </div>

          <div className="saas-main-viewport">
            <div className="saas-top-header">
              <h3>Pharmacy Operations Overview</h3>
              <div className="saas-user-badge">
                <span className="u-avatar">RM</span>
                <span>SNS Hospital Main Terminal</span>
              </div>
            </div>

            <div className="saas-widgets-grid">
              {/* Widget 1: Today's Prescriptions */}
              <div className="s-widget">
                <div className="w-header">
                  <span>Today's Prescriptions</span>
                  <span className="w-pill green">+14.2%</span>
                </div>
                <div className="w-big-number">128 <small>Rx Total</small></div>
                <div className="w-bar-bg"><div className="w-bar-fill" style={{ width: '84%' }}></div></div>
              </div>

              {/* Widget 2: Low Stock Medicines */}
              <div className="s-widget">
                <div className="w-header">
                  <span>Low Stock Alert</span>
                  <span className="w-pill orange">3 Items</span>
                </div>
                <div className="w-stock-item">
                  <span>Paracetamol 500mg</span>
                  <span className="s-num">12 left</span>
                </div>
                <div className="w-stock-item">
                  <span>Amoxicillin 250mg</span>
                  <span className="s-num">5 left</span>
                </div>
              </div>

              {/* Widget 3: Pending Verifications */}
              <div className="s-widget">
                <div className="w-header">
                  <span>Pending Verifications</span>
                  <span className="w-pill blue">2 Queue</span>
                </div>
                <div className="w-list-row">
                  <span>#RX-34862 (SRI SARAN)</span>
                  <span className="w-badge-blue">In Review</span>
                </div>
                <div className="w-list-row">
                  <span>#RX-1486 (NIKITHA)</span>
                  <span className="w-badge-teal">Ready</span>
                </div>
              </div>

              {/* Widget 4: AI Safety Alerts */}
              <div className="s-widget alert-widget">
                <div className="w-header">
                  <span>AI Safety Alerts</span>
                  <span className="w-pill green">0 Errors</span>
                </div>
                <div className="w-alert-box">
                  <span>✓ 100% of today's prescriptions validated against allergy database.</span>
                </div>
              </div>

              {/* Widget 5: Revenue Analytics Chart */}
              <div className="s-widget span-2">
                <div className="w-header">
                  <span>Revenue Analytics & Dispense Trends</span>
                  <span className="w-pill blue">This Week</span>
                </div>
                <svg className="w-chart-svg" viewBox="0 0 400 90" fill="none">
                  <path d="M0 70 Q 50 30, 100 50 T 200 20 T 300 60 T 400 15" stroke="#2563EB" strokeWidth="3" fill="none"/>
                  <path d="M0 70 Q 50 30, 100 50 T 200 20 T 300 60 T 400 15 L 400 90 L 0 90 Z" fill="url(#w-chart-grad)" opacity="0.15"/>
                  <defs>
                    <linearGradient id="w-chart-grad" x1="0" y1="0" x2="0" y2="90">
                      <stop stopColor="#2563EB"/>
                      <stop offset="1" stopColor="#2563EB" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Widget 6: Patient Notifications */}
              <div className="s-widget span-2">
                <div className="w-header">
                  <span>Patient Notifications Activity</span>
                  <span className="w-pill green">WhatsApp & SMS Live</span>
                </div>
                <div className="w-notif-log">
                  <div className="n-log-item">
                    <span className="n-time">10:42 AM</span>
                    <span>SMS Receipt sent to <strong>SRI SARAN</strong> (+91 98402****)</span>
                  </div>
                  <div className="n-log-item">
                    <span className="n-time">10:35 AM</span>
                    <span>WhatsApp Prescription QR delivered to <strong>NIKITHA</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SNS HOSPITAL */}
      <section className="features-section" id="features">
        <div className="section-header fade-up">
          <span className="section-tag">WHY SNS HOSPITAL</span>
          <h2 className="section-title">Transforming Pharmacy Operations</h2>
          <p className="section-desc">Designed to solve modern pharmacy bottlenecks with autonomous intelligence.</p>
        </div>

        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon blue">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M8 12h8"/></svg>
            </div>
            <h3>Reduce Medication Errors</h3>
            <p>AI checks every prescription for drug interactions, dosage limits, and patient allergies before dispensing.</p>
          </div>

          <div className="why-card">
            <div className="why-icon teal">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h3>Increase Pharmacy Efficiency</h3>
            <p>Automate repetitive pharmacy intake workflows, invoice calculations, and inventory audit logs.</p>
          </div>

          <div className="why-card">
            <div className="why-icon purple">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3>Improve Patient Safety</h3>
            <p>Deliver medicines faster with automated WhatsApp and SMS patient communication and dosage guidance.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="remedy-pricing" id="pricing">
        <div className="section-header">
          <span className="section-tag">PRICING TIERS</span>
          <h2 className="section-title">Transparent Enterprise Pricing</h2>
          <p className="section-desc">Choose the plan that fits your pharmacy network scale.</p>
        </div>

        <div className="pricing-grid">
          {/* Tier 1 */}
          <div className="price-card">
            <h3 className="p-tier">Starter</h3>
            <div className="p-amount">₹2,999 <span>/ month</span></div>
            <p className="p-desc">Ideal for single independent retail pharmacies.</p>
            <ul className="p-features">
              <li>✓ Up to 1,000 AI Voice Prescriptions</li>
              <li>✓ Clinical Dosage Validation</li>
              <li>✓ Basic Inventory Management</li>
              <li>✓ Email & SMS Support</li>
            </ul>
            <button className="btn-price-outline" onClick={() => onBookDemo()}>Select Starter</button>
          </div>

          {/* Tier 2: Professional */}
          <div className="price-card popular-card">
            <div className="popular-badge">MOST POPULAR</div>
            <h3 className="p-tier">Professional</h3>
            <div className="p-amount">₹6,999 <span>/ month</span></div>
            <p className="p-desc">For high-volume pharmacies & multi-specialty clinics.</p>
            <ul className="p-features">
              <li>✓ Unlimited AI Voice Prescriptions</li>
              <li>✓ Advanced Allergy & Interaction Check</li>
              <li>✓ Automated Restock Inventory Sync</li>
              <li>✓ WhatsApp & SMS Patient Alerts</li>
              <li>✓ Real-Time Analytics Dashboard</li>
            </ul>
            <button className="btn-price-solid" onClick={() => onBookDemo()}>Start Free Trial</button>
          </div>

          {/* Tier 3 */}
          <div className="price-card">
            <h3 className="p-tier">Enterprise</h3>
            <div className="p-amount">Custom</div>
            <p className="p-desc">For hospital chains & regional pharmacy networks.</p>
            <ul className="p-features">
              <li>✓ Multi-Branch Swarm AI Agents</li>
              <li>✓ Custom FHIR / EHR System Integration</li>
              <li>✓ Dedicated Account Manager</li>
              <li>✓ 99.99% Uptime SLA</li>
              <li>✓ 24/7 Priority Phone Support</li>
            </ul>
            <button className="btn-price-outline" onClick={() => onBookDemo()}>Contact Sales</button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="remedy-final-cta">
        <div className="cta-box">
          <h2>Transform Your Pharmacy with AI</h2>
          <p>Join the next generation of intelligent pharmacy management powered by SNS Hospital agents.</p>
          <button className="btn-final-demo" onClick={() => onBookDemo()}>
            Book a Demo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="remedy-contact" id="contact">
        <div className="section-header">
          <span className="section-tag">CONTACT</span>
          <h2 className="section-title">Ready to transform your hospital?</h2>
          <p className="section-desc">Tell us about your facility and our team will reach out.</p>
        </div>

        <div className="contact-grid-container">
          {/* Left Card: Form */}
          <div className="contact-form-card">
            {formSubmitted ? (
              <div className="form-success-box">
                <div className="success-icon-circle">✓</div>
                <h3>Message Sent Successfully</h3>
                <p>Thank you for reaching out{contactForm.name ? `, ${contactForm.name}` : ''}. Our team will contact you shortly.</p>
                <button className="btn-send-again" onClick={() => { setFormSubmitted(false); setContactForm({ name: '', email: '', phone: '', pharmacyName: '', message: '' }); }}>Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div className="form-row-2col">
                  <div className="form-field">
                    <label>Name</label>
                    <input 
                      type="text" 
                      placeholder="Sanjay D" 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-field">
                    <label>Email</label>
                    <input 
                      type="email" 
                      placeholder="sanjay.d2147@gmail.com" 
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      required 
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div className="form-field">
                    <label>Phone</label>
                    <input 
                      type="tel" 
                      placeholder="6382070682" 
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-field">
                    <label>Hospital / Facility Name</label>
                    <input 
                      type="text" 
                      placeholder="SNS College of Technology" 
                      value={contactForm.pharmacyName}
                      onChange={(e) => setContactForm({...contactForm, pharmacyName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Message</label>
                  <textarea 
                    rows="4" 
                    placeholder="How can SNS Hospital help your team?" 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn-submit-contact">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Contact Info Card */}
          <div className="contact-info-col">
            {/* Top Card: Contact Information */}
            <div className="contact-info-card">
              <h3>Contact Information</h3>
              
              <div className="contact-info-row">
                <div className="info-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className="info-detail-text">
                  <span className="detail-label">NAME</span>
                  <span className="detail-value">Sanjay D</span>
                </div>
              </div>

              <div className="contact-info-row">
                <div className="info-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div className="info-detail-text">
                  <span className="detail-label">EMAIL</span>
                  <a href="mailto:sanjay.d2147@gmail.com" className="detail-value-link">sanjay.d2147@gmail.com</a>
                </div>
              </div>

              <div className="contact-info-row">
                <div className="info-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div className="info-detail-text">
                  <span className="detail-label">PHONE</span>
                  <span className="detail-value">6382070682</span>
                </div>
              </div>

              <div className="contact-info-row">
                <div className="info-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="info-detail-text">
                  <span className="detail-label">ADDRESS</span>
                  <span className="detail-value">SNS College of Technology, Saravanampatti, Coimbatore</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="remedy-footer">
        <div className="footer-grid">
          <div className="f-col main-col">
            <div className="nav-logo">
              <div className="logo-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="6" fill="#2563EB"/>
                  <path d="M7 12H17M12 7V17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="logo-text">SNS Hospital</span>
            </div>
            <p className="f-tagline">Smarter Prescriptions. Safer Pharmacies. Better Patient Care.</p>
            <p className="f-copy">© 2026 SNS Hospital Systems Inc. All rights reserved.</p>
          </div>

          <div className="f-col f-links">
            <h4>Product</h4>
            <a href="#features" onClick={() => scrollToSection('features')}>Features</a>
            <a href="#workflow" onClick={() => scrollToSection('workflow')}>About SNS Hospital</a>
            <a href="#contact" onClick={() => scrollToSection('contact')}>Contact Sales</a>
          </div>

          <div className="f-col">
            <h4>Features</h4>
            <a href="#features" onClick={() => scrollToSection('features')}>Voice Prescription</a>
            <a href="#features" onClick={() => scrollToSection('features')}>Clinical Validation</a>
            <a href="#features" onClick={() => scrollToSection('features')}>Smart Inventory</a>
            <a href="#dashboard" onClick={() => scrollToSection('dashboard')}>Analytics Dashboard</a>
          </div>

          <div className="f-col">
            <h4>Resources</h4>
            <a href="#terms">Terms of Service</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
