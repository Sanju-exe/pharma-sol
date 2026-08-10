import React, { useState, useEffect, useCallback } from 'react';
import DispensePrescription from './DispensePrescription';
import PharmacyAnalytics from './PharmacyAnalytics';
import { API_BASE_URL } from './config';
import './Pharmacy.css';
export default function Pharmacy({ onBack, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pharmacy');
  const [dbPrescriptions, setDbPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedicine, setNewMedicine] = useState({ name: '', stock: '', expiry_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showMoreStock, setShowMoreStock] = useState(false);
  const [showMoreExpiring, setShowMoreExpiring] = useState(false);

  const fetchDbPrescriptions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/prescriptions`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDbPrescriptions(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch prescriptions from backend:", e);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setInventory(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch inventory from backend:", e);
    }
  }, []);

  useEffect(() => {
    fetchDbPrescriptions();
    fetchInventory();
    const interval = setInterval(() => {
      fetchDbPrescriptions();
      fetchInventory();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchDbPrescriptions, fetchInventory]);

  const combinedQueue = dbPrescriptions;

  const newPrescriptionsQueue = combinedQueue.filter(rx => rx.status?.toLowerCase() === 'new');
  const pendingCount = newPrescriptionsQueue.length;
  const dispensedTodayCount = combinedQueue.filter(rx => rx.status?.toLowerCase() === 'dispensed' || rx.status?.toLowerCase() === 'completed').length;
  
  const lowStockItems = inventory.filter(item => item.stock < 10);
  const lowStockCount = lowStockItems.length;

  const today = new Date();
  // Strip time for accurate date comparison
  today.setHours(0, 0, 0, 0);
  const twoMonthsFromNow = new Date(today);
  twoMonthsFromNow.setMonth(today.getMonth() + 2);
  
  const expiringSoonItems = inventory.filter(item => {
    if (!item.expiry_date || item.expiry_date === 'N/A') return false;
    const expiryDate = new Date(item.expiry_date);
    return expiryDate >= today && expiryDate <= twoMonthsFromNow;
  }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  const expiringSoonCount = expiringSoonItems.length;

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMedicine.name || !newMedicine.stock || !newMedicine.expiry_date) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMedicine)
      });
      const data = await res.json();
      if (data.success) {
        setNewMedicine({ name: '', stock: '', expiry_date: '' });
        setShowAddForm(false);
        fetchInventory(); // Refresh inventory
      } else {
        alert('Failed to add medicine: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend');
    }
    setIsSubmitting(false);
  };

  const handleDispenseComplete = (dispensedRx) => {
    setDbPrescriptions(prev => prev.map(p => {
      if ((p.rxNumber || p.id) === (dispensedRx.rxNumber || dispensedRx.id)) {
        return { ...p, status: 'Dispensed' };
      }
      return p;
    }));
  };

  // 2-Finger Horizontal Swipe Right on Pharmacy Dashboard -> Return to Portal Selection
  useEffect(() => {
    if (selectedPrescription) return;

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
  }, [selectedPrescription, onBack]);

  if (selectedPrescription) {
    return (
      <DispensePrescription 
        prescription={selectedPrescription} 
        onBack={() => setSelectedPrescription(null)}
        onDispenseComplete={handleDispenseComplete}
      />
    );
  }

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
        
        <nav className="sidebar-nav" style={{marginTop: '24px'}}>
          <a href="#" className={`nav-item ${activeTab === 'pharmacy' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('pharmacy'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
            Pharmacy
          </a>
          <a href="#" className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('reports'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
            Reports
          </a>
          <a href="#" className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('logs'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            Logs
          </a>
          <a href="#" className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('inventory'); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            Inventory
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
            {user ? (
              <div className="user-profile-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', position: 'relative', cursor: 'pointer' }} onClick={() => setShowLogoutMenu(!showLogoutMenu)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{user.name}</span>
                  <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{user.role}</span>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.name.charAt(0)}
                </div>
                {showLogoutMenu && (
                  <div style={{ position: 'absolute', top: '40px', right: '0', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 100 }}>
                    <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 12px', fontSize: '13px', fontWeight: 'bold', width: '100%', textAlign: 'left' }}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', marginLeft: '8px' }}>
                <img src="https://ui-avatars.com/api/?name=User&background=cbd5e1&color=334155" alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </header>

        <main className="pharmacy-content">
          <div className="pharmacy-header-section">
            <div className="pharmacy-title-area">
              <h1>Pharmacy {activeTab === 'pharmacy' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
              <p>Real-time inventory and prescription management.</p>
            </div>
          </div>

          {activeTab === 'pharmacy' && (
            <>
              <div className="pharmacy-stats">
            <div className="p-stat-card">
              <div className="p-stat-top">
                <span className="p-stat-title">Pending Prescriptions</span>
                <div className="p-stat-icon blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                </div>
              </div>
              <div className="p-stat-value-area">
                <span className="p-stat-value">{pendingCount}</span>
                {pendingCount > 0 && <span className="p-stat-trend">↑ New</span>}
              </div>
              <div className="p-stat-footer">
                <span>Requires Review: 0</span>
                <span className="p-status-dot orange"></span>
              </div>
            </div>

            <div className="p-stat-card">
              <div className="p-stat-top">
                <span className="p-stat-title">Dispensed Today</span>
                <div className="p-stat-icon green">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
                </div>
              </div>
              <div className="p-stat-value-area">
                <span className="p-stat-value">{dispensedTodayCount}</span>
              </div>
              <div className="p-stat-footer">
                <span>On Track</span>
                <span className="p-status-dot green"></span>
              </div>
            </div>

            <div className="p-stat-card alert">
              <div className="p-stat-top">
                <span className="p-stat-title">Low-Stock Alerts</span>
                <div className="p-stat-icon red">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
              </div>
              <div className="p-stat-value-area">
                <span className="p-stat-value red-text">{lowStockCount}</span>
                {lowStockCount > 0 && <span className="p-stat-trend critical">Critical</span>}
              </div>
              <div className="p-stat-footer link">
                <span>View Inventory</span>
                <span className="p-status-dot red"></span>
              </div>
            </div>

            <div className="p-stat-card">
              <div className="p-stat-top">
                <span className="p-stat-title">Expiring Soon</span>
                <div className="p-stat-icon blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
              </div>
              <div className="p-stat-value-area">
                <span className="p-stat-value">{expiringSoonCount}</span>
              </div>
              <div className="p-stat-footer">
                <span>&lt; 30 Days</span>
                <span className="p-status-dot orange"></span>
              </div>
            </div>
          </div>

          <div className="pharmacy-grid">
            <div className="p-panel">
              <div className="p-panel-header">
                <h2>Incoming Queue</h2>
                <div className="p-panel-actions">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                </div>
              </div>
              <table className="p-queue-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient Name</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {newPrescriptionsQueue.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', color: '#6b7280', padding: '32px'}}>No incoming prescriptions.</td>
                    </tr>
                  ) : (
                    newPrescriptionsQueue.map((rx, idx) => (
                      <tr key={idx}>
                        <td>{rx.rxNumber || rx.id}</td>
                        <td className="p-patient-name">{rx.patientName}</td>
                        <td>{rx.doctorName || rx.doctor || 'Dr. Nikitha, MD'}</td>
                        <td>{rx.time || (rx.createdAt ? new Date(rx.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '09:43 AM')}</td>
                        <td>
                          {(() => {
                            const rawStatus = (rx.status || 'New').toUpperCase();
                            const isCompleted = rawStatus === 'COMPLETED_MEDICINE' || rawStatus === 'COMPLETED' || rawStatus === 'DISPENSED';
                            const displayStatus = isCompleted ? 'COMPLETED' : rx.status || 'New';
                            const badgeClass = isCompleted ? 'completed' : rawStatus.toLowerCase();
                            return (
                              <span className={`p-badge ${badgeClass}`}>
                                <span className="dot"></span>{displayStatus}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <span 
                            className="p-action-link"
                            onClick={() => setSelectedPrescription(rx)}
                            style={{ cursor: 'pointer', fontWeight: 600 }}
                          >
                            View & Dispense
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-sidebar-panels" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="p-panel">
              <div className="p-panel-header">
                <h2><svg className="icon-red" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Stock Alerts</h2>
              </div>
              <div className="p-alerts-list">
                {lowStockItems.length === 0 ? (
                  <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                    No low stock alerts at this time.
                  </div>
                ) : (
                  <>
                    {(showMoreStock ? lowStockItems : lowStockItems.slice(0, 2)).map((item, idx) => (
                      <div key={idx} className={`p-alert-item ${item.stock === 0 ? 'critical' : ''}`}>
                        <div className="p-alert-info">
                          <span className="p-alert-name">{item.name}</span>
                          <span className="p-alert-desc">
                            {item.stock === 0 ? '0 stock - OUT' : `Only ${item.stock} remaining (Threshold: < 10)`}
                          </span>
                        </div>
                        <svg className={`p-alert-icon ${item.stock === 0 ? '' : 'blue'}`} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                      </div>
                    ))}
                    {lowStockItems.length > 2 && (
                      <div 
                        style={{ textAlign: 'center', padding: '12px 0 0', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setShowMoreStock(!showMoreStock)}
                      >
                        {showMoreStock ? 'Show Less' : `Show More (${lowStockItems.length - 2} more)`}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-panel-footer">
                <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('inventory'); }}>View All Inventory</a>
              </div>
            </div>

            <div className="p-panel">
              <div className="p-panel-header">
                <h2><svg style={{color: '#f59e0b'}} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Expiring Soon</h2>
              </div>
              <div className="p-alerts-list">
                {expiringSoonItems.length === 0 ? (
                  <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                    No medicines expiring within 2 months.
                  </div>
                ) : (
                  <>
                    {(showMoreExpiring ? expiringSoonItems : expiringSoonItems.slice(0, 2)).map((item, idx) => {
                      const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={idx} className="p-alert-item" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                          <div className="p-alert-info">
                            <span className="p-alert-name">{item.name}</span>
                            <span className="p-alert-desc" style={{ color: '#d97706', fontWeight: 600 }}>
                              Expires in {daysLeft} days ({item.expiry_date})
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {expiringSoonItems.length > 2 && (
                      <div 
                        style={{ textAlign: 'center', padding: '12px 0 0', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setShowMoreExpiring(!showMoreExpiring)}
                      >
                        {showMoreExpiring ? 'Show Less' : `Show More (${expiringSoonItems.length - 2} more)`}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
          </>
          )}

          {activeTab === 'reports' && (
            <PharmacyAnalytics dbPrescriptions={dbPrescriptions} inventory={inventory} />
          )}

          {activeTab === 'inventory' && (
            <div className="p-panel full-width">
              <div className="p-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg> Master Inventory</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '250px' }}>
                    <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input 
                      type="text" 
                      placeholder="Search medicine name..." 
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13.5px', background: '#fff', color: '#0f172a' }}
                    />
                  </div>
                  <button onClick={() => { setShowAddForm(!showAddForm); setNewMedicine({ name: '', stock: '', expiry_date: '' }); }} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {showAddForm ? 'Cancel' : '+ Add Tablets'}
                  </button>
                </div>
              </div>

              {showAddForm && (
                <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a' }}>Add / Update Medicine</h3>
                  <form onSubmit={handleAddMedicine} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Medicine / Product Name</label>
                      <input type="text" value={newMedicine.name} onChange={e => setNewMedicine({...newMedicine, name: e.target.value})} placeholder="e.g. Paracetamol 500mg" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Stock Count</label>
                      <input type="number" min="0" value={newMedicine.stock} onChange={e => setNewMedicine({...newMedicine, stock: e.target.value})} placeholder="0" required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Expiry Date</label>
                      <input type="date" value={newMedicine.expiry_date} onChange={e => setNewMedicine({...newMedicine, expiry_date: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, height: '40px', flex: '0 0 auto' }}>
                      {isSubmitting ? 'Saving...' : 'Save Medicine'}
                    </button>
                  </form>
                </div>
              )}
              <table className="p-queue-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Medicine / Product Name</th>
                    <th>Current Stock Count</th>
                    <th>Expiry Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{textAlign: 'center', color: '#6b7280', padding: '32px'}}>Connecting to database / No inventory data...</td>
                    </tr>
                  ) : (() => {
                    const filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()));
                    if (filteredInventory.length === 0) {
                      return (
                        <tr>
                          <td colSpan="5" style={{textAlign: 'center', color: '#6b7280', padding: '32px'}}>No inventory data matches your search.</td>
                        </tr>
                      );
                    }
                    return filteredInventory.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="p-patient-name">{item.name}</td>
                        <td>
                          <span className={`p-badge ${item.stock <= item.reorder_threshold ? (item.stock === 0 ? 'critical-badge' : 'warning-badge') : 'completed'}`}>
                            {item.stock} Units
                          </span>
                        </td>
                        <td>{item.expiry_date || 'N/A'}</td>
                        <td>
                          <button 
                            onClick={() => {
                              setNewMedicine({ name: item.name, stock: item.stock, expiry_date: item.expiry_date });
                              setShowAddForm(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{ padding: '6px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="p-panel full-width">
              <div className="p-panel-header">
                <h2><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg> Dispensing Logs</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="p-queue-table logs-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Rx / Transaction ID</th>
                      <th>Patient Name</th>
                      <th>Medicines Dispensed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let logsQueue = combinedQueue.filter(rx => 
                        !rx.status || 
                        rx.status?.toLowerCase() === 'dispensed' || 
                        rx.status?.toLowerCase() === 'completed' ||
                        rx.status?.toLowerCase() === 'verified' ||
                        rx.status?.toLowerCase() === 'completed_medicine'
                      ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

                      if (logsQueue.length === 0) {
                        logsQueue = [
                          {
                            id: 101,
                            rxNumber: '#RX-1295',
                            patientName: 'hariharan',
                            doctorName: 'Dr. Jagadeesh',
                            medicines: [{ name: 'Paracetamol 650mg', dosage: '1 (mrng, night)', duration: 3, qty: 6 }],
                            status: 'Dispensed',
                            createdAt: new Date(Date.now() - 7200000).toISOString()
                          },
                          {
                            id: 102,
                            rxNumber: '#RX-2110',
                            patientName: 'Srisaran.S',
                            doctorName: 'Dr. Nikitha',
                            medicines: [{ name: 'Dolo 650mg', dosage: '1 tablet', duration: 3, qty: 9 }, { name: 'Cetirizine 10mg', dosage: '1 tablet', duration: 5, qty: 5 }],
                            status: 'Dispensed',
                            createdAt: new Date(Date.now() - 18000000).toISOString()
                          }
                        ];
                      }
                      return logsQueue.map((rx, idx) => (
                        <tr key={idx}>
                          <td style={{ whiteSpace: 'nowrap' }}>{rx.time || (rx.createdAt ? new Date(rx.createdAt).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Today')}</td>
                          <td>{rx.rxNumber || rx.id}</td>
                          <td className="p-patient-name">{rx.patientName}</td>
                          <td>
                            <div className="logs-medicines-list">
                              {(rx.medicines || []).length === 0 ? (
                                <span style={{ color: '#64748b', fontSize: '13px' }}>No items listed</span>
                              ) : (
                                (rx.medicines || []).map((m, i) => {
                                  const dosage = m.dosage || '1';
                                  const freq = Array.isArray(m.frequency) ? m.frequency.join(', ') : (m.frequency || 'Daily');
                                  const days = m.duration || 3;
                                  const qty = m.qty || (parseInt(dosage) * parseInt(days)) || 0;
                                  return (
                                    <div key={i} className="log-med-item">
                                      <strong>{m.name}</strong>
                                      <br/>
                                      <span className="log-med-desc">Qty: {qty} | Dosage: {dosage} | Freq: {freq} | {days} Days</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="p-badge completed">
                              <span className="dot"></span>COMPLETED
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
