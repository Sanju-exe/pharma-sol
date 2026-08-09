import React, { useEffect } from 'react';
import './PortalSelection.css';

export default function PortalSelection({ onSelect, onBackToLanding }) {
  // 2-Finger Horizontal Swipe Right on Portal Selection -> Return to Landing Page
  useEffect(() => {
    if (!onBackToLanding) return;

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
            onBackToLanding();
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
          onBackToLanding();
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
  }, [onBackToLanding]);
  return (
    <div className="portal-container">
      <div className="portal-header">
        <h1 className="brand-title">SNS Hospital</h1>
        <h2 className="sub-system-title">AI Powered Healthcare Management System</h2>
        <p className="portal-subtitle">
          Select your administrative portal to securely access hospital<br/>
          operations and patient management systems.
        </p>
      </div>

      <div className="portal-cards">
        <div className="portal-card" onClick={() => onSelect('reception')}>
          <div className="card-image-wrapper">
            <img src="/receptionist_portal.png" alt="Receptionist" className="portal-card-img" />
          </div>
          <h2>Receptionist</h2>
          <p>Manage patient flow, registrations, and daily front-desk operations securely.</p>
          <div className="access-link">Access Portal &rarr;</div>
        </div>

        <div className="portal-card" onClick={() => onSelect('doctor')}>
          <div className="card-image-wrapper">
            <img src="/doctor_portal.png" alt="Doctor" className="portal-card-img" />
          </div>
          <h2>Doctor</h2>
          <p>Consult with patients, review medical histories, and issue or verify secure digital prescriptions.</p>
          <div className="access-link">Access Portal &rarr;</div>
        </div>
        
        <div className="portal-card" onClick={() => onSelect('pharmacy')}>
          <div className="card-image-wrapper">
            <img src="/pharmacy_portal.png" alt="Pharmacy Manager" className="portal-card-img" />
          </div>
          <h2>Pharmacy Manager</h2>
          <p>Manage pharmaceutical stock, dispense medicines, and process patient billing and insurance.</p>
          <div className="access-link">Access Portal &rarr;</div>
        </div>
      </div>

      <div className="portal-footer">
        <p>Authorized personnel only. All access is logged and monitored for compliance.</p>
        <p>© 2026 SNS Hospital Systems.</p>
      </div>
    </div>
  );
}
