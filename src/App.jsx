import { useState, useEffect, useCallback, useRef } from "react";
import AudioRecorder from "./AudioRecorder";
import PrescriptionReview from "./PrescriptionReview";
import ParticleBackground from "./ParticleBackground";
import Reception from "./Reception";
import PortalSelection from "./PortalSelection";
import Login from "./Login";
import Pharmacy from "./Pharmacy";
import DoctorPortal from "./DoctorPortal";
import LandingPage from "./LandingPage";

function App() {
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [portal, setPortal] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPortal = params.get('portal');
      if (urlPortal) return urlPortal;
      const savedPortal = localStorage.getItem('pharmacy_ai_active_portal');
      return savedPortal || null;
    } catch (e) {
      return null;
    }
  }); // null means Landing/PortalSelection

  const [viewMode, setViewMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') || localStorage.getItem('pharmacy_ai_active_portal')) return 'portals';
      if (params.get('view') === 'portals') return 'portals';
      return 'landing';
    } catch (e) {
      return 'landing';
    }
  }); // 'landing' | 'portals'

  const [loggedInPortals, setLoggedInPortals] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_ai_logged_in_portals');
      return saved ? JSON.parse(saved) : {
        reception: null,
        doctor: null,
        pharmacy: null
      };
    } catch (e) {
      return {
        reception: null,
        doctor: null,
        pharmacy: null
      };
    }
  });

  const lastPopStateTimeRef = useRef(0);

  // Sync active portal to localStorage
  const updateActivePortalState = (newPortal, newViewMode = 'portals') => {
    setPortal(newPortal);
    setViewMode(newViewMode);
    try {
      if (newPortal) {
        localStorage.setItem('pharmacy_ai_active_portal', newPortal);
      } else {
        localStorage.removeItem('pharmacy_ai_active_portal');
      }
    } catch (e) {}
  };

  // Initialize History API for native swipe-to-go-back support
  useEffect(() => {
    // Static center position for background glow
    document.documentElement.style.setProperty('--mouse-x', `50vw`);
    document.documentElement.style.setProperty('--mouse-y', `50vh`);

    const params = new URLSearchParams(window.location.search);
    const initialPortal = params.get('portal') || localStorage.getItem('pharmacy_ai_active_portal');
    const initialView = params.get('view');
    
    if (initialPortal) {
      updateActivePortalState(initialPortal, 'portals');
      window.history.replaceState({ viewMode: 'portals', portal: initialPortal }, "", `?portal=${initialPortal}`);
    } else if (initialView === 'portals') {
      updateActivePortalState(null, 'portals');
      window.history.replaceState({ viewMode: 'portals', portal: null }, "", "?view=portals");
    } else {
      updateActivePortalState(null, 'landing');
      window.history.replaceState({ viewMode: 'landing', portal: null }, "", window.location.pathname);
    }

    const handlePopState = (e) => {
      lastPopStateTimeRef.current = Date.now();

      if (e.state && e.state.subview) {
        if (e.state.portal) {
          updateActivePortalState(e.state.portal, 'portals');
        }
        return;
      }

      setPortal((currentPortal) => {
        // If user is currently inside a portal (pharmacy, doctor, reception), 2-finger back swipe goes to Portals Selection!
        if (currentPortal !== null) {
          updateActivePortalState(null, 'portals');
          return null;
        }

        // If user is on Portals Selection, back swipe goes to Landing Page
        setViewMode((currentViewMode) => {
          const nextMode = (currentViewMode === 'portals') ? 'landing' : (e.state?.viewMode || 'landing');
          updateActivePortalState(e.state?.portal || null, nextMode);
          return nextMode;
        });

        return e.state?.portal || null;
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reset scroll to top on page view transition
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [viewMode, portal]);

  const goToPortals = useCallback(() => {
    const now = Date.now();
    if (now - lastPopStateTimeRef.current < 400) return;

    if (viewMode !== 'portals' || portal !== null) {
      window.history.pushState({ viewMode: 'portals', portal: null }, "", "?view=portals");
      updateActivePortalState(null, 'portals');
    }
  }, [viewMode, portal]);

  const goToLanding = useCallback(() => {
    const now = Date.now();
    if (now - lastPopStateTimeRef.current < 400) return;

    if (viewMode !== 'landing' || portal !== null) {
      window.history.pushState({ viewMode: 'landing', portal: null }, "", window.location.pathname.replace(/\\?.*$/, ''));
      updateActivePortalState(null, 'landing');
    }
  }, [viewMode, portal]);

  const navigateTo = useCallback((p) => {
    if (p === portal) return;
    if (p) {
      window.history.pushState({ viewMode: 'portals', portal: p }, "", `?portal=${p}`);
      updateActivePortalState(p, 'portals');
    } else {
      goToPortals();
    }
  }, [portal, goToPortals]);

  const goBack = useCallback(() => {
    const now = Date.now();
    if (now - lastPopStateTimeRef.current < 400) return;

    if (portal !== null) {
      goToPortals();
    } else if (viewMode === 'portals') {
      goToLanding();
    } else {
      goToPortals();
    }
  }, [portal, viewMode, goToPortals, goToLanding]);

  const handleLogin = (portalType, user) => {
    setLoggedInPortals(prev => {
      const updated = { ...prev, [portalType]: user };
      try {
        localStorage.setItem('pharmacy_ai_logged_in_portals', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleLogout = (portalType) => {
    setLoggedInPortals(prev => {
      const updated = { ...prev, [portalType]: null };
      try {
        localStorage.setItem('pharmacy_ai_logged_in_portals', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleConsultationSuccess = (data) => {
    let parsedData = data;
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
    }
    setPrescriptionData(parsedData);
  };

  const handleConfirm = (finalData) => {
    console.log("Verified Prescription:", finalData);
    setPrescriptionData(null);
  };

  // Reception Portal
  if (portal === 'reception') {
    if (!loggedInPortals.reception) {
      return (
        <div key="reception-login" className="view-fade-in">
          <ParticleBackground />
          <Login portalType="reception" onLogin={(user) => handleLogin('reception', user)} onBack={goBack} />
        </div>
      );
    }
    return (
      <div key="reception-view" className="view-fade-in">
        <Reception onBack={goBack} user={loggedInPortals.reception} onLogout={() => handleLogout('reception')} />
      </div>
    );
  }

  // Doctor Portal
  if (portal === 'doctor') {
    if (!loggedInPortals.doctor) {
      return (
        <div key="doctor-login" className="view-fade-in">
          <ParticleBackground />
          <Login portalType="doctor" onLogin={(user) => handleLogin('doctor', user)} onBack={goBack} />
        </div>
      );
    }
    return (
      <div key="doctor-view" className="view-fade-in">
        <DoctorPortal 
          onBack={goBack} 
          onConfirmPrescription={handleConfirm}
          user={loggedInPortals.doctor}
          onLogout={() => handleLogout('doctor')}
        />
      </div>
    );
  }

  // Pharmacy Portal
  if (portal === 'pharmacy') {
    if (!loggedInPortals.pharmacy) {
      return (
        <div key="pharmacy-login" className="view-fade-in">
          <ParticleBackground />
          <Login portalType="pharmacy" onLogin={(user) => handleLogin('pharmacy', user)} onBack={goBack} />
        </div>
      );
    }
    return (
      <div key="pharmacy-view" className="view-fade-in">
        <Pharmacy onBack={goBack} user={loggedInPortals.pharmacy} onLogout={() => handleLogout('pharmacy')} />
      </div>
    );
  }

  // Default Home View: Landing Page or Portal Selection
  if (viewMode === 'portals') {
    return (
      <div key="portals-view" className="view-fade-in">
        <ParticleBackground />
        <PortalSelection 
          onSelect={navigateTo} 
          onBackToLanding={goToLanding}
        />
      </div>
    );
  }

  return (
    <div key="landing-view" className="view-fade-in">
      <LandingPage 
        onBookDemo={(targetPortal) => {
          if (targetPortal) {
            navigateTo(targetPortal);
          } else {
            goToPortals();
          }
        }} 
      />
    </div>
  );
}

export default App;