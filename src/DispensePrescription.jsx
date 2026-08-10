import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { API_BASE_URL } from './config';
import './DispensePrescription.css';

export default function DispensePrescription({ prescription, onBack, onDispenseComplete }) {
  const [dispensing, setDispensing] = useState(false);
  const [isDispensed, setIsDispensed] = useState(
    prescription?.status?.toLowerCase() === 'dispensed' || prescription?.status?.toLowerCase() === 'completed'
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [checkedMeds, setCheckedMeds] = useState(
    (prescription?.medicines || []).map(() => true)
  );
  
  const [buyingQuantities, setBuyingQuantities] = useState(() => {
    return (prescription?.medicines || []).map(med => {
      const dosageNum = parseInt(med.dosage, 10) || 2;
      const durationNum = parseInt(med.duration, 10) || 3;
      return dosageNum * durationNum;
    });
  });

  const handleBuyingQtyChange = (e, index) => {
    e.stopPropagation();
    const val = e.target.value;
    const newQty = [...buyingQuantities];
    newQty[index] = val === '' ? '' : (parseInt(val, 10) || 0);
    setBuyingQuantities(newQty);
  };

  // 2-Finger Trackpad Horizontal Swipe & Back Gesture -> Redirect to Pharmacy Dashboard
  useEffect(() => {
    let lastSwipeTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleWheel = (e) => {
      // Detect horizontal 2-finger trackpad swipe gesture
      if (Math.abs(e.deltaX) > 15 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const now = Date.now();
        if (now - lastSwipeTime > 400) {
          lastSwipeTime = now;
          e.preventDefault();
          onBack(); // Redirect to Pharmacy Dashboard!
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
        // Horizontal swipe right from left edge or gesture
        if (diffX > 60 && diffY < 50) {
          onBack(); // Redirect to Pharmacy Dashboard!
        }
      }
    };

    window.history.pushState({ portal: 'pharmacy', subview: 'dispense' }, "");

    const handlePopState = (e) => {
      if (e) e.preventDefault();
      onBack(); // Redirect to Pharmacy Dashboard!
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
  }, [onBack]);

  const medicines = prescription?.medicines || [];

  // Calculate Bill Details
  const medicineItems = medicines.map((med, idx) => {
    const dosageNum = parseInt(med.dosage, 10) || 2;
    const durationNum = parseInt(med.duration, 10) || 3;
    const originalQty = dosageNum * durationNum;
    const qty = buyingQuantities[idx] !== undefined ? buyingQuantities[idx] : originalQty;
    const unitPrice = 15; // ₹ 15 per tablet
    const amount = (qty === '' ? 0 : parseInt(qty, 10) || 0) * unitPrice;
    return {
      name: med.name || 'Paracetamol 500mg',
      dosage: med.dosage || '1',
      frequency: Array.isArray(med.frequency) ? med.frequency.join(', ') : (med.frequency || 'Morning, Night'),
      duration: durationNum,
      originalQty,
      qty,
      unitPrice,
      amount
    };
  });

  const medsSubtotal = medicineItems.reduce((sum, item) => sum + item.amount, 0);
  const consultationFee = 200;
  const dispensingFee = 30;
  const subtotal = medsSubtotal + consultationFee + dispensingFee;
  const taxGst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + taxGst;

  const handleToggleCheck = (index) => {
    const updated = [...checkedMeds];
    updated[index] = !updated[index];
    setCheckedMeds(updated);
  };

  const handleDispense = async () => {
    setDispensing(true);
    const targetRxKey = prescription.rxNumber || prescription.id;
    const targetPatientId = prescription.patientId;

    try {
      // 1. Decrement inventory stock for checked medicines
      const dispensedItemsToUpdate = medicineItems
        .filter((_, idx) => checkedMeds[idx])
        .map(item => ({ name: item.name, qty: item.qty }));
      
      if (dispensedItemsToUpdate.length > 0) {
        await fetch(`${API_BASE_URL}/api/inventory/dispense`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicines: dispensedItemsToUpdate })
        });
      }
      
      // Update prescription status in DB
      await fetch(`${API_BASE_URL}/api/prescriptions/${encodeURIComponent(targetRxKey)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Dispensed' })
      });

      // 4. Broadcast real-time update to all open portals
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('patient_sync_channel');
        bc.postMessage({ type: 'REFETCH_PATIENTS' });
        bc.close();
      }
      localStorage.setItem('patient_updated_signal', Date.now());

      setShowInvoiceModal(true);
    } catch (e) {
      console.error("Dispense API error:", e);
      setDispensing(false);
      setShowInvoiceModal(true);
    }
  };

  const handleSendToPatient = async () => {
    setIsSending(true);
    const targetRxKey = prescription?.rxNumber || prescription?.id;
    const targetPatientId = prescription?.patientId;

    try {
      // 1. Explicitly update patient status in DB to 'Dispensed'
      if (targetPatientId) {
        await fetch(`${API_BASE_URL}/api/patients/${encodeURIComponent(targetPatientId)}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Dispensed' })
        }).catch(err => console.warn("Patient status update error:", err));
      }

      // 2. Explicitly update prescription status in DB to 'Dispensed'
      if (targetRxKey) {
        await fetch(`${API_BASE_URL}/api/prescriptions/${encodeURIComponent(targetRxKey)}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Dispensed' })
        }).catch(err => console.warn("Prescription status update error:", err));
      }

      // 3. Dispatch PDF / Invoice & Webhook notification
      const res = await fetch(`${API_BASE_URL}/api/prescriptions/${encodeURIComponent(targetRxKey)}/send-pdf`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: targetPatientId,
          prescriptionData: prescription,
          medicineItems: medicineItems
        })
      });
      
      const result = await res.json();

      if (result.success) {
        console.log("Send to Patient successful:", result.message);
        
        // 4. Real-time Broadcast to all open tabs/portals
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('patient_sync_channel');
          bc.postMessage({ type: 'REFETCH_PATIENTS' });
          bc.close();
        }
        localStorage.setItem('patient_updated_signal', Date.now().toString());

        setIsSending(false);
        setShowInvoiceModal(false);
        if (onDispenseComplete) {
          onDispenseComplete({ ...prescription, status: 'Dispensed' });
        }
      } else {
        alert(result.message || 'Failed to send document to patient.');
        setIsSending(false);
      }
    } catch (err) {
      console.error("PDF generation or sending error:", err);
      alert("An error occurred while dispatching documents to patient.");
      setIsSending(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (!prescription) {
    return (
      <div className="dispense-layout">
        <header className="dispense-header">
          <button className="btn-back-pharmacy" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
            Back to Dashboard
          </button>
        </header>
        <main className="dispense-content">
          <p>No prescription selected.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dispense-layout">
      {/* Top Header */}
      <header className="dispense-header">
        <button className="btn-back-pharmacy" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </button>
        <div className="dispense-header-title">
          <h1>Dispense & Pharmacy Billing</h1>
          <span className="rx-badge">{prescription.rxNumber || prescription.id || '#RX-7284'}</span>
        </div>
      </header>

      <main className="dispense-content">
        {isDispensed && (
          <div className="dispensed-banner">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
            <div style={{ flex: 1 }}>
              <h3>Medication Dispensed & Bill Generated!</h3>
              <p>Prescription has been completed and payment logged into system.</p>
            </div>
            <button className="btn-view-invoice-small" onClick={() => setShowInvoiceModal(true)}>
              🖨️ Print Official Bill
            </button>
          </div>
        )}

        <div className="dispense-two-col-grid">
          {/* Left Column: Patient & Medications */}
          <div className="dispense-card">
            <div className="card-header">
              <h2>Prescription Details</h2>
              <span className={`status-tag ${isDispensed ? 'dispensed' : 'pending'}`}>
                {isDispensed ? 'Dispensed & Paid' : 'Ready for Dispensing'}
              </span>
            </div>

            <div className="patient-summary-box">
              <div className="summary-item">
                <span className="label">Patient Name</span>
                <span className="value strong">{prescription.patientName || 'NIKITHA'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Prescribing Doctor</span>
                <span className="value">{prescription.doctorName || prescription.doctor || 'Dr. J. Montague, MD'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Diagnosis / Symptoms</span>
                <span className="value highlight">{prescription.diagnosis || prescription.illness || 'General Consultation'}</span>
              </div>
              <div className="summary-item">
                <span className="label">Intake Date & Time</span>
                <span className="value">{prescription.time || prescription.createdAt || 'Today'}</span>
              </div>
            </div>

            <div className="medicines-checklist-section">
              <h3>Prescribed Medications ({medicines.length})</h3>

              {medicines.length === 0 ? (
                <div className="no-meds-msg">
                  <p>No itemized medicines attached. Verify with doctor notes.</p>
                </div>
              ) : (
                <div className="meds-checklist-list">
                  {medicineItems.map((med, idx) => (
                    <div 
                      key={idx} 
                      className={`med-check-item ${checkedMeds[idx] ? 'checked' : ''}`}
                      onClick={() => handleToggleCheck(idx)}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!checkedMeds[idx]} 
                        onChange={() => {}} 
                      />
                      <div className="med-info">
                        <div className="med-title-row">
                          <span className="med-name">{med.name}</span>
                          <span className="med-dosage">Dosage: {med.dosage}</span>
                        </div>
                        <div className="med-sub-row">
                          <span>Freq: {med.frequency}</span>
                          <span>•</span>
                          <span>Duration: {med.duration} Days</span>
                          <span>•</span>
                          <span style={{color: '#64748b'}}>Suggested Qty: {med.originalQty}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Buying Quantity:</label>
                          <input 
                            type="number"
                            style={{ 
                              width: '70px', 
                              padding: '6px 10px', 
                              borderRadius: '6px', 
                              border: '2px solid #3b82f6', 
                              fontSize: '14px',
                              fontWeight: '600',
                              backgroundColor: '#ffffff',
                              color: '#0f172a',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                              outline: 'none',
                              cursor: 'text'
                            }}
                            value={buyingQuantities[idx] !== undefined ? buyingQuantities[idx] : med.originalQty}
                            onChange={(e) => handleBuyingQtyChange(e, idx)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <span className="med-price-tag">₹{med.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Bill Summary */}
          <div className="dispense-card bill-card">
            <div className="card-header">
              <h2>Pharmacy Bill Breakdown</h2>
              <span className="currency-tag">INR (₹)</span>
            </div>

            <div className="bill-items-list">
              <div className="bill-row header-row">
                <span>Description</span>
                <span>Qty / Rate</span>
                <span className="text-right">Amount</span>
              </div>

              {medicineItems.map((item, i) => (
                <div className="bill-row" key={i}>
                  <span className="item-name">{item.name}</span>
                  <span className="item-rate">{item.qty} × ₹{item.unitPrice}</span>
                  <span className="item-amount text-right">₹{item.amount.toFixed(2)}</span>
                </div>
              ))}

              <div className="bill-row divider"></div>

              <div className="bill-row">
                <span>Doctor Consultation Fee</span>
                <span>Fixed</span>
                <span className="text-right">₹{consultationFee.toFixed(2)}</span>
              </div>

              <div className="bill-row">
                <span>Pharmacy Dispensing Charge</span>
                <span>Fixed</span>
                <span className="text-right">₹{dispensingFee.toFixed(2)}</span>
              </div>

              <div className="bill-row divider"></div>

              <div className="bill-row subtotal">
                <span>Subtotal</span>
                <span></span>
                <span className="text-right">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="bill-row tax">
                <span>GST Tax (5%)</span>
                <span></span>
                <span className="text-right">₹{taxGst.toFixed(2)}</span>
              </div>

              <div className="bill-row total-row">
                <span>Grand Total</span>
                <span></span>
                <span className="grand-total-val text-right">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bill-actions">
              <button 
                className="btn-generate-bill-primary"
                disabled={dispensing}
                onClick={handleDispense}
              >
                {dispensing ? 'Dispensing...' : isDispensed ? 'Dispensed' : 'Dispense'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Invoice Receipt Printable Modal */}
      {showInvoiceModal && (
        <div className="invoice-modal-overlay">
          <div className="invoice-modal-card">
            <div className="invoice-modal-actions no-print">
              <button className="btn-modal-close" onClick={() => setShowInvoiceModal(false)}>✕ Close</button>
              <button className="btn-modal-print" onClick={handlePrintInvoice}>🖨️ Print Receipt</button>
            </div>

            <div className="printable-invoice">
              <div className="invoice-header">
                <div className="invoice-brand">
                  <h2>SNS Hospital</h2>
                  <p>SNS College of Technology, Saravanampatti, Coimbatore</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>GSTIN: 33AAAAA0000A1Z5</p>
                </div>
                <div className="invoice-meta">
                  <h3>OFFICIAL PHARMACY BILL</h3>
                  <p><strong>Bill No:</strong> INV-{prescription.rxNumber ? prescription.rxNumber.replace('#', '') : '7284'}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="invoice-patient-info">
                <div>
                  <p><strong>Patient Name:</strong> {prescription.patientName || 'NIKITHA'}</p>
                  <p><strong>Rx Reference:</strong> {prescription.rxNumber || '#RX-7284'}</p>
                </div>
                <div>
                  <p><strong>Doctor:</strong> {prescription.doctorName || 'Dr. J. Montague, MD'}</p>
                  <p><strong>Diagnosis:</strong> {prescription.diagnosis || 'General Consultation'}</p>
                </div>
              </div>

              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Item / Medication</th>
                    <th>Dosage</th>
                    <th>Suggested Qty</th>
                    <th>Buying Qty</th>
                    <th>Rate</th>
                    <th className="text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {medicineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.dosage} ({item.frequency})</td>
                      <td>{item.originalQty}</td>
                      <td><strong>{item.qty}</strong></td>
                      <td>₹{item.unitPrice}</td>
                      <td className="text-right">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="6" className="text-right"><strong>Consultation Fee:</strong></td>
                    <td className="text-right">₹{consultationFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6" className="text-right"><strong>Dispensing Charge:</strong></td>
                    <td className="text-right">₹{dispensingFee.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6" className="text-right"><strong>Subtotal:</strong></td>
                    <td className="text-right">₹{subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6" className="text-right"><strong>GST (5%):</strong></td>
                    <td className="text-right">₹{taxGst.toFixed(2)}</td>
                  </tr>
                  <tr className="invoice-total-row">
                    <td colSpan="6" className="text-right"><strong>GRAND TOTAL:</strong></td>
                    <td className="text-right"><strong>₹{grandTotal.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div className="invoice-footer">
                <p>Status: <strong>PAID & DISPENSED</strong></p>
                <p>Thank you for visiting SNS Hospital!</p>
                <div className="no-print" style={{ marginTop: '20px' }}>
                  <button 
                    className="btn-generate-bill-primary"
                    onClick={handleSendToPatient}
                    disabled={isSending}
                    style={{ width: '100%', maxWidth: '300px' }}
                  >
                    {isSending ? 'Sending PDF to Patient...' : 'Send to Patient'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
