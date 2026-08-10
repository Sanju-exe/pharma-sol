import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from './config';
import './Reception.css';

export default function Reception({ onBack, user, onLogout }) {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'patients' | 'registration'
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [revisitSearch, setRevisitSearch] = useState('');
  const [isRevisit, setIsRevisit] = useState(false);
  const [queueTab, setQueueTab] = useState('waiting'); // 'waiting' | 'completed'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    contact: '',
    email: '',
    place: '',
    temperature: '',
    bloodPressure: '',
    recordingDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    complaints: ''
  });

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPatients(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  }, []);

  useEffect(() => {
    fetchPatients();

    // 1. Polling interval for multi-tab sync
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

    // 3. Storage event fallback for multi-tab sync
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

  // 2-Finger Trackpad Horizontal Swipe & Back Gesture -> Redirect to Receptionist Dashboard
  useEffect(() => {
    if (view === 'dashboard') return;

    let lastSwipeTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > 15 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const now = Date.now();
        if (now - lastSwipeTime > 400) {
          lastSwipeTime = now;
          e.preventDefault();
          setView('dashboard'); // Redirect to Receptionist Dashboard!
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
          setView('dashboard'); // Redirect to Receptionist Dashboard!
        }
      }
    };

    window.history.pushState({ portal: 'reception', subview: 'reception-form' }, "");

    const handlePopState = (e) => {
      if (e) e.preventDefault();
      setView('dashboard'); // Redirect to Receptionist Dashboard!
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
  }, [view]);

  // 2-Finger Horizontal Swipe Right on Receptionist Dashboard -> Return to Portal Selection
  useEffect(() => {
    if (view === 'reception-form') return;

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
  }, [view, onBack]);

  const notifyOtherTabs = () => {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('patient_sync_channel');
      bc.postMessage({ type: 'REFETCH_PATIENTS' });
      bc.close();
    }
    localStorage.setItem('patient_updated_signal', Date.now().toString());
  };

  const handleDeletePatient = async (patient) => {
    const targetKey = patient.patientId || patient.id;
    const confirmDelete = window.confirm(`Are you sure you want to delete patient record for "${patient.name}" (${targetKey})?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/${encodeURIComponent(targetKey)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setPatients(prev => prev.filter(p => (p.patientId || p.id) !== targetKey));
        notifyOtherTabs();
      } else {
        alert(data.message || "Failed to delete patient record.");
      }
    } catch (err) {
      console.error("Failed to delete patient:", err);
      alert("An error occurred while deleting patient record.");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClearForm = () => {
    setFormData({
      name: '',
      age: '',
      gender: '',
      contact: '',
      email: '',
      place: '',
      temperature: '',
      bloodPressure: '',
      recordingDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      complaints: ''
    });
  };

  const handleSubmit = async (targetStatus = 'Waiting') => {
    if (!formData.name.trim()) {
      alert("Please enter Patient Full Name.");
      return;
    }

    setLoading(true);
    try {
      const generatedId = `PT-${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = {
        patientId: generatedId,
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        contact: formData.contact,
        email: formData.email,
        place: formData.place,
        temperature: formData.temperature,
        bloodPressure: formData.bloodPressure,
        recordingDate: formData.recordingDate || new Date().toLocaleString(),
        complaints: formData.complaints,
        status: targetStatus,
        collected_by: user ? user.name : 'Unknown'
      };

      const res = await fetch(`${API_BASE_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        handleClearForm();
        setPatients(prev => [...prev, { ...payload, id: Date.now() }]);
        await fetchPatients();
        notifyOtherTabs();
        setView('dashboard');
        alert(`Patient ${payload.name} (${payload.patientId}) saved to Database and sent to Doctor Terminal!`);
      } else {
        alert(data.message || "Failed to save patient record.");
      }
    } catch (err) {
      console.error("Error saving patient:", err);
      alert("An error occurred while saving patient. Ensure backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Live Stats calculations
  const totalToday = patients.length;
  const waitingCount = patients.filter(p => p.status === 'Waiting').length;
  const completedCount = patients.filter(p => p.status === 'Completed' || p.status === 'Approved' || p.status === 'Verified').length;
  const pendingCount = patients.filter(p => p.status === 'Waiting' || p.status === 'In Consultation').length;

  // Filtered patients for Patient Log
  const filteredPatients = patients.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.patientId && p.patientId.toLowerCase().includes(query)) ||
      (p.complaints && p.complaints.toLowerCase().includes(query)) ||
      (p.status && p.status.toLowerCase().includes(query))
    );
  });

  // Group filtered patients by day
  const groupedPatients = {};
  filteredPatients.forEach(patient => {
    let dateStr = patient.recordingDate || patient.createdAt;
    let dateObj = new Date();
    
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey = '';
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (dateObj.toDateString() === today.toDateString()) {
      groupKey = `Today, ${weekday}`;
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      groupKey = `Yesterday, ${weekday}`;
    } else {
      groupKey = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    if (!groupedPatients[groupKey]) {
      groupedPatients[groupKey] = [];
    }
    groupedPatients[groupKey].push(patient);
  });

  const revisitSearchResults = patients.filter(p => {
    if (!revisitSearch) return false;
    const q = revisitSearch.toLowerCase();
    return (p.name && p.name.toLowerCase().includes(q)) || 
           (p.patientId && p.patientId.toLowerCase().includes(q));
  });

  // To avoid duplicates in search results by name/contact (since same patient could have multiple visits)
  const uniqueRevisitResults = [];
  const seenNames = new Set();
  revisitSearchResults.forEach(p => {
    const key = p.name ? p.name.toLowerCase() : p.patientId;
    if (!seenNames.has(key)) {
      seenNames.add(key);
      uniqueRevisitResults.push(p);
    }
  });

  return (
    <div className="reception-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" onClick={onBack} style={{cursor: 'pointer'}} title="Back to Portals">
          <div className="logo-icon">HS</div>
          <div className="logo-text">
            <h2>SNS Hospital</h2>
            <span>Admin Terminal</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView('dashboard'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
            Receptionist Dashboard
          </a>
          <a href="#" className={`nav-item ${view === 'patients' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setView('patients'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            Patient Log
          </a>
        </nav>


        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <button 
            onClick={onBack} 
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'transparent', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              color: '#4b5563', 
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            Back to Portals
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="brand">SNS Hospital</div>
          <nav className="top-nav">
          </nav>
          <div className="header-actions">
            {user && (
              <div className="user-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', position: 'relative', cursor: 'pointer' }} onClick={() => setShowLogoutMenu(!showLogoutMenu)}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.name.charAt(0)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{user.name}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{user.role}</span>
                </div>
                {showLogoutMenu && (
                  <div style={{ position: 'absolute', top: '40px', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100 }}>
                    <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 12px', fontSize: '13px', fontWeight: 'bold', width: '100%', textAlign: 'left' }}>Logout</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <button className="btn-notification" onClick={() => setShowNotifications(!showNotifications)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', top: '40px', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '160px', textAlign: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>No notifications</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {view === 'dashboard' && (
          <main className="dashboard-content">
            <div className="dashboard-header">
              <div>
                <h1 className="dashboard-title">Receptionist Dashboard</h1>
                <p className="dashboard-subtitle">Manage patient flow and daily operations.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-register" onClick={() => { setRevisitSearch(''); setView('already-visited-search'); }} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Already Visited
                </button>
                <button className="btn-register" onClick={() => { handleClearForm(); setIsRevisit(false); setView('registration'); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  New Entry
                </button>
              </div>
            </div>



            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <h3>Today's Patient Count</h3>
                  <span className="stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                </div>
                <div className="stat-value">{totalToday}</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-header">
                  <h3>Waiting Patients</h3>
                  <span className="stat-icon warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
                  </span>
                </div>
                <div className="stat-value">{waitingCount}</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <h3>Completed Registrations</h3>
                  <span className="stat-icon success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
                  </span>
                </div>
                <div className="stat-value">{completedCount}</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <h3>Pending Consultations</h3>
                  <span className="stat-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </span>
                </div>
                <div className="stat-value">{pendingCount}</div>
              </div>
            </div>

            {/* Patient Queue Table */}
            <div className="queue-section">
              <div className="queue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Patient Queue</h2>
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', gap: '4px', width: '300px' }}>
                  <button 
                    onClick={() => setQueueTab('waiting')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: queueTab === 'waiting' ? '#ffffff' : 'transparent',
                      color: queueTab === 'waiting' ? '#2563eb' : '#64748b',
                      boxShadow: queueTab === 'waiting' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      flex: '7',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    Waiting
                  </button>
                  <button 
                    onClick={() => setQueueTab('completed')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: queueTab === 'completed' ? '#ffffff' : 'transparent',
                      color: queueTab === 'completed' ? '#10b981' : '#64748b',
                      boxShadow: queueTab === 'completed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      flex: '3',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    Completed
                  </button>
                </div>
              </div>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Complaints / Notes</th>
                    <th>Registered By</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const completedStatuses = ['Completed', 'Approved', 'Verified', 'Dispensed'];
                    const queuePatients = patients.filter(p => 
                      queueTab === 'waiting' 
                        ? !completedStatuses.includes(p.status) 
                        : completedStatuses.includes(p.status)
                    );
                    
                    if (queuePatients.length === 0) {
                      return (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                            {queueTab === 'waiting' 
                              ? 'No patients in waiting queue. Click "+ New Entry" on the top to add a patient.'
                              : 'No completed patients.'}
                          </td>
                        </tr>
                      );
                    }

                    return queuePatients.map((patient) => (
                      <tr key={patient.patientId || patient.id}>
                        <td><strong>{patient.patientId}</strong></td>
                        <td>{patient.name}</td>
                        <td>{patient.age || '--'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{patient.gender || '--'}</td>
                        <td>
                          <span className={`status-badge ${patient.status === 'In Consultation' ? 'in-consultation' : completedStatuses.includes(patient.status) ? 'completed' : 'waiting'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              {completedStatuses.includes(patient.status) ? (
                                <path d="M20 6L9 17l-5-5"/>
                              ) : patient.status === 'In Consultation' ? (
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 6v6l4 2"/>
                                </>
                              )}
                            </svg>
                            {patient.status || 'Waiting'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {patient.complaints || 'N/A'}
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', color: '#4b5563' }}>
                            {patient.collected_by || 'Unknown'}
                          </div>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleDeletePatient(patient)}
                            title="Delete Patient Record"
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fecaca'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {view === 'patients' && (
          <main className="dashboard-content">
            <div className="dashboard-header">
              <div>
                <h1 className="dashboard-title">Patient Log & Audit Records</h1>
                <p className="dashboard-subtitle">Complete chronological history of all intake entries and consultation logs.</p>
              </div>
            </div>

            {/* Patient Log Table */}
            <div className="queue-section">
              <div className="queue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Patient Log Records ({filteredPatients.length})</h2>
                {searchQuery && <span style={{ fontSize: '13px', color: '#6b7280' }}>Filtered by "{searchQuery}"</span>}
              </div>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Full Name</th>
                    <th>Age / Gender</th>
                    <th>Contact / Place</th>
                    <th>Vitals (Temp / BP)</th>
                    <th>Intake Date & Time</th>
                    <th>Chief Complaints</th>
                    <th>Registered By</th>
                    <th>Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No records found matching your query.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(groupedPatients).map(([groupName, groupPatients]) => (
                      <React.Fragment key={groupName}>
                        <tr className="group-header">
                          <td colSpan="9" style={{ background: '#f8fafc', fontWeight: 'bold', color: '#334155', padding: '12px 16px', borderTop: '2px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                            {groupName} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>({groupPatients.length} records)</span>
                          </td>
                        </tr>
                        {groupPatients.map((patient) => (
                          <tr key={patient.patientId || patient.id}>
                            <td><strong>{patient.patientId}</strong></td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{patient.name}</td>
                            <td>{patient.age ? `${patient.age} yrs` : '--'} • {patient.gender || '--'}</td>
                            <td>{patient.contact || '--'} <br/><small style={{ color: '#64748b' }}>{patient.place || ''}</small></td>
                            <td>
                              {patient.temperature ? `🌡️ ${patient.temperature}` : ''}
                              {patient.bloodPressure ? ` • 💓 ${patient.bloodPressure}` : ''}
                              {!patient.temperature && !patient.bloodPressure && '--'}
                            </td>
                            <td>{patient.recordingDate || 'Today'}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {patient.complaints || 'N/A'}
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', color: '#4b5563' }}>
                                {patient.collected_by || 'Unknown'}
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge ${patient.status === 'In Consultation' ? 'in-consultation' : (patient.status === 'Completed' || patient.status === 'Approved' || patient.status === 'Verified') ? 'completed' : 'waiting'}`}>
                                {patient.status || 'Waiting'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {view === 'already-visited-search' && (
          <main className="dashboard-content">
            <div className="dashboard-header">
              <div>
                <h1 className="dashboard-title">Search Existing Patient</h1>
                <p className="dashboard-subtitle">Find a patient who has visited before to quickly register a new visit.</p>
              </div>
            </div>
            
            <div className="search-section" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Search by Patient Name or ID..." 
                value={revisitSearch}
                onChange={(e) => setRevisitSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', fontSize: '15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                autoFocus
              />
            </div>

            <div className="queue-section">
              <div className="queue-header">
                <h2>Search Results</h2>
              </div>
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Patient ID (Last Visit)</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Contact</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!revisitSearch ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        Type a name or ID to search for existing patients.
                      </td>
                    </tr>
                  ) : uniqueRevisitResults.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                        No existing patients found matching your search.
                      </td>
                    </tr>
                  ) : (
                    uniqueRevisitResults.map(p => (
                      <tr key={p.patientId || p.id}>
                        <td><strong>{p.patientId}</strong></td>
                        <td>{p.name}</td>
                        <td>{p.age || '--'}</td>
                        <td>{p.gender || '--'}</td>
                        <td>{p.contact || '--'}</td>
                        <td>
                          <button 
                            className="btn-register"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => {
                              setFormData({
                                name: p.name || '',
                                age: p.age || '',
                                gender: p.gender || '',
                                contact: p.contact || '',
                                email: p.email || '',
                                place: p.place || '',
                                temperature: '',
                                bloodPressure: '',
                                recordingDate: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
                                complaints: ''
                              });
                              setIsRevisit(true);
                              setView('registration');
                            }}
                          >
                            Select & Update Vitals
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {view === 'registration' && (
          <main className="dashboard-content registration-content">
            <div className="dashboard-header">
              <div>
                <h1 className="dashboard-title">{isRevisit ? 'New Visit Vitals' : 'Patient Registration'}</h1>
                <p className="dashboard-subtitle">{isRevisit ? 'Record new vitals and symptoms for the returning patient.' : 'Enter patient details to create a new record in the system.'}</p>
              </div>
            </div>

            {!isRevisit ? (
              <div className="form-section">
              <div className="form-section-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <h2>Personal Information</h2>
              </div>
              <div className="form-section-body">
                <div className="form-group full-width">
                  <label>Full Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g., Jane Doe" 
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age <span className="required">*</span></label>
                    <input 
                      type="number" 
                      min="0"
                      max="120"
                      placeholder="e.g. 34" 
                      value={formData.age}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (Number(val) >= 0 && Number(val) <= 120)) {
                          handleInputChange('age', val);
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Gender <span className="required">*</span></label>
                    <select 
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Number <span className="required">*</span></label>
                    <input 
                      type="tel" 
                      maxLength="10"
                      placeholder="e.g., 9876543210" 
                      value={formData.contact}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // keep only digits
                        if (val.length <= 10) handleInputChange('contact', val);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (Optional)</label>
                    <input 
                      type="email" 
                      placeholder="e.g., patient@example.com" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Place / City</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Seattle, WA" 
                    value={formData.place}
                    onChange={(e) => handleInputChange('place', e.target.value)}
                  />
                </div>
              </div>
            </div>
            ) : (
              <div className="form-section" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div className="form-section-header" style={{ borderBottom: '1px solid #bfdbfe', paddingBottom: '16px', display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <h2 style={{ color: '#1e3a8a', margin: 0, marginLeft: '8px' }}>Selected Patient Details</h2>
                  <button onClick={() => setView('already-visited-search')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Change Patient</button>
                </div>
                <div className="form-section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px' }}>
                  <div style={{ color: '#1e3a8a' }}><strong>Name:</strong> {formData.name}</div>
                  <div style={{ color: '#1e3a8a' }}><strong>Age / Gender:</strong> {formData.age} / {formData.gender}</div>
                  <div style={{ color: '#1e3a8a' }}><strong>Contact:</strong> {formData.contact || 'N/A'}</div>
                  <div style={{ color: '#1e3a8a' }}><strong>Place:</strong> {formData.place || 'N/A'}</div>
                </div>
              </div>
            )}

            <div className="form-section">
              <div className="form-section-header with-badge">
                <div className="header-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <h2>Vital Signs & Symptoms</h2>
                </div>
                <span className="badge-prioritized">! Prioritized</span>
              </div>
              <div className="form-section-body">
                <div className="form-row">
                  <div className="form-group icon-input-group">
                    <div className="input-header">
                      <label>Temperature</label>
                      <span className="unit">°F / °C</span>
                    </div>
                    <div className="input-wrapper">
                      <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
                      <input 
                        type="text" 
                        placeholder="e.g., 98.6°F" 
                        value={formData.temperature}
                        onChange={(e) => handleInputChange('temperature', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group icon-input-group">
                    <div className="input-header">
                      <label>Blood Pressure</label>
                      <span className="unit">mmHg</span>
                    </div>
                    <div className="input-wrapper">
                      <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <input 
                        type="text" 
                        placeholder="e.g., 120/80" 
                        value={formData.bloodPressure}
                        onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group full-width mt-4">
                  <label>Chief Complaints / Symptoms</label>
                  <textarea 
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      colorScheme: 'light'
                    }}
                    placeholder="Describe main symptoms, e.g. Severe headache, fever for 2 days..."
                    value={formData.complaints}
                    onChange={(e) => handleInputChange('complaints', e.target.value)}
                  />
                </div>

                <div className="form-group full-width mt-4">
                  <label>Recording Date & Time</label>
                  <div className="input-wrapper icon-right">
                    <input 
                      type="text" 
                      value={formData.recordingDate}
                      onChange={(e) => handleInputChange('recordingDate', e.target.value)}
                    />
                    <svg className="input-icon right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-clear" onClick={() => setView('dashboard')}>Cancel / Back</button>
              <div className="right-actions">
                <button 
                  className="btn-save" 
                  disabled={loading}
                  onClick={() => handleSubmit('Waiting')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  {loading ? "Saving & Sending..." : "Save & Send to Doctor"}
                </button>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
