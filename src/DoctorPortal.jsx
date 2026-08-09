import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from './config';
import AudioRecorder from './AudioRecorder';
import PrescriptionReview from './PrescriptionReview';
import './DoctorPortal.css';

export default function DoctorPortal({ onBack, onConfirmPrescription, pharmacyQueue, user, onLogout }) {
  const [patients, setPatients] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmacy_ai_patients');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'waiting' | 'in-consultation' | 'approved'
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const fetchedPatients = data.data;
        setPatients(fetchedPatients);
        try {
          localStorage.setItem('pharmacy_ai_patients', JSON.stringify(fetchedPatients));
        } catch (e) {}

        // Keep selected patient reference updated, prioritizing 'In Consultation' patient
        setSelectedPatient(prev => {
          const inConsultationPatient = fetchedPatients.find(p => p.status === 'In Consultation');
          if (inConsultationPatient) {
            return inConsultationPatient;
          }

          const firstWaiting = fetchedPatients.find(p => p.status === 'Waiting');
          if (firstWaiting) {
            return firstWaiting;
          }

          if (prev) {
            const updated = fetchedPatients.find(p => 
              (p.patientId && prev.patientId && p.patientId === prev.patientId) || 
              (p.id && prev.id && String(p.id) === String(prev.id))
            );
            if (updated && (updated.status === 'Waiting' || updated.status === 'In Consultation')) {
              return updated;
            }
          }

          return null;
        });
      }
    } catch (err) {
      console.error("Failed to fetch patients in Doctor Portal:", err);
    }
  }, []);

  useEffect(() => {
    fetchPatients();

    // 1. Polling interval (2s)
    const interval = setInterval(fetchPatients, 2000);

    // 2. BroadcastChannel for instant cross-tab sync
    let bc;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('patient_sync_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'REFETCH_PATIENTS') {
          fetchPatients();
        }
      };
    }

    // 3. Storage listener
    const handleStorage = (e) => {
      if (e.key === 'patient_updated_signal') {
        fetchPatients();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchPatients]);

  // 2-Finger Trackpad Horizontal Swipe & Back Gesture -> Redirect to Doctor Dashboard
  useEffect(() => {
    if (!prescriptionData) return;

    let lastSwipeTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > 15 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const now = Date.now();
        if (now - lastSwipeTime > 400) {
          lastSwipeTime = now;
          e.preventDefault();
          setPrescriptionData(null); // Redirect to Doctor Queue Dashboard!
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
        if (diffX > 60 && diffY < 50) {
          setPrescriptionData(null); // Redirect to Doctor Queue Dashboard!
        }
      }
    };

    window.history.pushState({ portal: 'doctor', subview: 'doctor-review' }, "");

    const handlePopState = (e) => {
      if (e) e.preventDefault();
      setPrescriptionData(null); // Redirect to Doctor Queue Dashboard!
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [prescriptionData]);

  // 2-Finger Horizontal Swipe Right on Main Doctor Dashboard -> Return to Portal Selection
  useEffect(() => {
    if (prescriptionData) return;

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
            if (onBack) onBack();
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
          if (onBack) onBack();
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
  }, [prescriptionData, onBack]);

  const notifyOtherTabs = () => {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('patient_sync_channel');
      bc.postMessage({ type: 'REFETCH_PATIENTS' });
      bc.close();
    }
    localStorage.setItem('patient_updated_signal', Date.now().toString());
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
  };

  const handleAttendPatient = async (patient, e) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    
    if (patient.status === 'Waiting') {
      try {
        await fetch(`${API_BASE_URL}/api/patients/${patient.patientId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Consultation' })
        });
        fetchPatients();
        notifyOtherTabs();
      } catch (e) {
        console.error("Failed to update status:", e);
      }
    }
  };

  const handleConsultationSuccess = (recordedData) => {
    let parsedData = recordedData;
    if (typeof recordedData === "string") {
      try {
        parsedData = JSON.parse(recordedData);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
    }

    // Merge active selected patient details with AI prescription extracted data
    const mergedData = {
      ...parsedData,
      patientName: selectedPatient?.name || parsedData?.patientName || "Unknown Patient",
      patientId: selectedPatient?.patientId || "",
      patientAge: selectedPatient?.age || "",
      patientGender: selectedPatient?.gender || "",
      vitals: {
        temperature: selectedPatient?.temperature || "",
        bloodPressure: selectedPatient?.bloodPressure || ""
      },
      illness: selectedPatient?.complaints || parsedData?.illness || "General Medical Checkup"
    };

    setPrescriptionData(mergedData);
  };

  const handleConfirmPrescription = async (finalPrescription) => {
    const targetId = finalPrescription?.patientId || selectedPatient?.patientId || selectedPatient?.id;

    // 1. Save prescription details to Database
    try {
      const rxPayload = {
        rxNumber: `#RX-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: targetId || '',
        patientName: finalPrescription?.patientName || selectedPatient?.name || 'Unknown Patient',
        doctorName: user?.name ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : 'Dr. Nikitha, MD',
        diagnosis: finalPrescription?.illness || selectedPatient?.complaints || '',
        medicines: finalPrescription?.medicines || [],
        status: 'New'
      };

      await fetch(`${API_BASE_URL}/api/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rxPayload)
      });
    } catch (rxErr) {
      console.error("Failed to save prescription to DB:", rxErr);
    }

    // 2. Update patient status to 'Verified' in backend
    if (targetId) {
      try {
        await fetch(`${API_BASE_URL}/api/patients/${targetId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Verified' })
        });
        
        notifyOtherTabs();
        
        // Optimistically update local state so Verified count increases immediately
        setPatients(prev => prev.map(p => {
          if (p.patientId === targetId || String(p.id) === String(targetId)) {
            return { ...p, status: 'Verified' };
          }
          return p;
        }));

        // Switch filter tab back to 'all' section so doctor can select next patient
        setActiveTabFilter('all');

        // Refetch latest patient records
        const res = await fetch(`${API_BASE_URL}/api/patients`);
        const data = await res.json();
        if (data.success) {
          setPatients(data.data || []);
        }
      } catch (e) {
        console.error("Failed to set patient verified status:", e);
      }
    } else {
      setActiveTabFilter('all');
    }

    // Pass prescription to parent App handler to update Pharmacy Queue
    if (onConfirmPrescription) {
      onConfirmPrescription(finalPrescription);
    }

    setPrescriptionData(null);
  };

  const activePatients = patients.filter(p => p.status !== 'Verified' && p.status !== 'Approved' && p.status !== 'Completed');
  const waitingPatients = patients.filter(p => p.status === 'Waiting');
  const inConsultPatients = patients.filter(p => p.status === 'In Consultation');
  const verifiedPatients = patients.filter(p => p.status === 'Verified' || p.status === 'Approved' || p.status === 'Completed');

  const filteredPatients = activeTabFilter === 'waiting'
    ? waitingPatients
    : activeTabFilter === 'in-consultation'
    ? inConsultPatients
    : activeTabFilter === 'verified'
    ? verifiedPatients
    : activePatients; // 'all' tab displays active queue (unverified patients)

  const getStatusClass = (status) => {
    if (status === 'In Consultation') return 'in-consultation';
    if (status === 'Verified' || status === 'Approved' || status === 'Completed') return 'verified';
    return 'waiting';
  };

  return (
    <div className="doctor-portal-container">
      {/* Top Header Bar */}
      <header className="doctor-header">
        <div className="doctor-header-left">
          <button className="btn-back-portals" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            Portals
          </button>
          <div className="doctor-title-box">
            <h1>Doctor Terminal</h1>
            <span className="live-badge">
              <span className="pulse-dot"></span> Live Sync Connected
            </span>
          </div>
        </div>
        <div className="doctor-profile" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowLogoutMenu(!showLogoutMenu)}>
          {user ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '12px' }}>
                <span className="doctor-name" style={{ fontSize: '14px', fontWeight: 'bold' }}>{user.name}</span>
                <span style={{ fontSize: '12px', color: '#e0e7ff', textTransform: 'capitalize' }}>{user.role}</span>
              </div>
              <span className="doc-avatar">{user.name.charAt(0)}</span>
              {showLogoutMenu && (
                <div style={{ position: 'absolute', top: '50px', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100 }}>
                  <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 12px', fontSize: '13px', fontWeight: 'bold', width: '100%', textAlign: 'left' }}>Logout</button>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="doctor-name">Dr. J. Montague, MD</span>
              <span className="doc-avatar">JM</span>
            </>
          )}
        </div>
      </header>

      {prescriptionData ? (
        <div className="prescription-review-wrapper">
          <PrescriptionReview 
            data={prescriptionData} 
            onConfirm={handleConfirmPrescription} 
            onBack={() => setPrescriptionData(null)}
          />
        </div>
      ) : (
        <div className="doctor-layout">
          {/* Left Panel: Patient Queue */}
          <aside className="patient-queue-panel">
            <div className="queue-panel-header">
              <h2>Patients Queue</h2>
              <span className="queue-count-pill">{patients.length} Registered</span>
            </div>

            {/* Filter Tabs */}
            <div className="queue-filter-tabs">
              <button 
                className={`filter-tab ${activeTabFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTabFilter('all')}
              >
                All ({activePatients.length})
              </button>
              <button 
                className={`filter-tab ${activeTabFilter === 'waiting' ? 'active' : ''}`}
                onClick={() => setActiveTabFilter('waiting')}
              >
                Waiting ({waitingPatients.length})
              </button>
              <button 
                className={`filter-tab ${activeTabFilter === 'verified' ? 'active' : ''}`}
                onClick={() => setActiveTabFilter('verified')}
              >
                Verified ({verifiedPatients.length})
              </button>
            </div>


            {/* Patient Cards List */}
            <div className="patient-cards-list">
              {filteredPatients.length === 0 ? (
                <div className="empty-queue-msg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <p>No patients in this view.</p>
                  <span>New patient registrations from Reception will appear here automatically.</span>
                </div>
              ) : (
                filteredPatients.map(patient => {
                  const isSelected = selectedPatient?.patientId === patient.patientId || selectedPatient?.id === patient.id;
                  const statusClass = getStatusClass(patient.status);
                  return (
                    <div 
                      key={patient.patientId || patient.id} 
                      className={`patient-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="patient-card-top">
                        <span className="patient-id-tag">{patient.patientId}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`status-pill ${statusClass}`}>
                            {patient.status || 'Waiting'}
                          </span>
                          {patient.status === 'Waiting' && (
                            <button 
                              onClick={(e) => handleAttendPatient(patient, e)}
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                            >
                              Attend
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="patient-card-name">{patient.name}</h3>
                      <div className="patient-card-meta">
                        <span>{patient.age ? `${patient.age} yrs` : 'Age N/A'}</span>
                        <span>•</span>
                        <span>{patient.gender || 'Gender N/A'}</span>
                        {patient.temperature && (
                          <>
                            <span>•</span>
                            <span className="vital-highlight">🌡️ {patient.temperature}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Main Area: Selected Patient Details & AudioRecorder */}
          <main className="doctor-main-panel">
            {selectedPatient ? (
              <>
                {/* Reception Intake Details Card */}
                <div className="reception-details-card">
                  <div className="details-card-header">
                    <div className="patient-main-heading">
                      <div className="patient-avatar-icon">
                        {selectedPatient.name ? selectedPatient.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <h2>{selectedPatient.name}</h2>
                        <div className="sub-patient-info">
                          <span>Patient ID: <strong>{selectedPatient.patientId}</strong></span>
                          <span>•</span>
                          <span>Age: {selectedPatient.age || 'N/A'}</span>
                          <span>•</span>
                          <span>Gender: {selectedPatient.gender || 'N/A'}</span>
                          <span>•</span>
                          <span>Contact: {selectedPatient.contact || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`status-badge-lg ${getStatusClass(selectedPatient.status)}`}>
                      {selectedPatient.status || 'Waiting'}
                    </span>
                  </div>

                  {/* Vitals & Complaints Grid */}
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Temperature</span>
                      <span className="detail-value">{selectedPatient.temperature || 'Not recorded'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Blood Pressure</span>
                      <span className="detail-value">{selectedPatient.bloodPressure || 'Not recorded'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">City / Location</span>
                      <span className="detail-value">{selectedPatient.place || 'Not specified'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Intake Date & Time</span>
                      <span className="detail-value">{selectedPatient.recordingDate || 'Today'}</span>
                    </div>
                  </div>

                  {selectedPatient.complaints && (
                    <div className="complaints-box">
                      <span className="complaints-label">Chief Complaints / Symptoms:</span>
                      <p className="complaints-text">{selectedPatient.complaints}</p>
                    </div>
                  )}
                </div>

                {/* Audio Recorder Section */}
                <div className="consultation-recorder-container">
                  <AudioRecorder 
                    activePatient={selectedPatient}
                    onSuccess={handleConsultationSuccess} 
                  />
                </div>
              </>
            ) : (
              <div className="select-patient-prompt">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <h3>No Patient Selected</h3>
                <p>Select a patient name from the left queue to view intake details and start audio consultation.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
