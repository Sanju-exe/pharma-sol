import { useState, useEffect } from "react";
import { API_BASE_URL } from "./config";

export default function PrescriptionReview({ data, onConfirm, onBack }) {
  const [dbInventory, setDbInventory] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/inventory`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setDbInventory(data.data);
        }
      })
      .catch(err => console.warn("Failed to fetch inventory for autocomplete:", err));
  }, []);

  const [prescription, setPrescription] = useState(() => {
    if (!data) {
      return { patientName: "", illness: "", approved: false, medicines: [] };
    }
    
    let rawMeds = data.medicines || data.suggested_medicines || data.extracted_medicines || data.meds || [];
    if (typeof rawMeds === 'string') {
      try { rawMeds = JSON.parse(rawMeds); } catch(e) {}
    }

    let mappedMedicines = [];
    if (Array.isArray(rawMeds) && rawMeds.length > 0) {
      mappedMedicines = rawMeds.map(m => ({
        name: m.medicine_name || m.name || m.medicineName || m.drug_name || m.medicine || "",
        dosage: m.dosage || m.dose || "",
        frequency: Array.isArray(m.frequency) ? m.frequency.join(', ') : (m.frequency || ""),
        duration: m.duration_days || m.duration || m.days || 1,
        foodTiming: m.food_instruction || m.foodTiming || m.instructions || m.timing || "After Food"
      })).filter(m => String(m.name).trim() !== "" || String(m.dosage).trim() !== "");
    }

    if (mappedMedicines.length === 0) {
      mappedMedicines = [{ name: "", dosage: "", frequency: "", duration: 1, foodTiming: "After Food" }];
    }

    return {
      ...data,
      patientName: data.patientName || data.name || "",
      illness: data.illness || data.diagnosis || data.general_consultation || "General Consultation",
      medicines: mappedMedicines
    };
  });
  const [status, setStatus] = useState("reviewing");

  const handleApproveToggle = () => {
    setPrescription({ ...prescription, approved: !prescription.approved });
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = [...(prescription.medicines || [])];
    updatedMedicines[index] = { ...updatedMedicines[index], [field]: value };
    setPrescription({ ...prescription, medicines: updatedMedicines });
  };

  const handleAddMedicine = () => {
    setPrescription({
      ...prescription,
      medicines: [...(prescription.medicines || []), { name: "", dosage: "", frequency: [""], duration: 1 }]
    });
  };

  const handleDeleteMedicine = (index) => {
    const updatedMedicines = prescription.medicines.filter((_, idx) => idx !== index);
    setPrescription({ ...prescription, medicines: updatedMedicines });
  };

  const handleConfirmClick = () => {
    setStatus("success");
    setTimeout(() => {
      onConfirm(prescription);
    }, 2000);
  };

  if (status === "success") {
    return (
      <div className="container">
        <div className="recorder-card prescription-card relative-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
          <h2 className="title" style={{ marginTop: '24px' }}>Approved & Sent!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="recorder-card prescription-card relative-card">
        <button className="btn-back" onClick={onBack} title="Go Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 className="title">Verify Prescription</h1>
        <p className="subtitle">Review the extracted details before confirming.</p>

        <div className="patient-info-banner">
          <div className="info-block">
            <span className="info-label">Patient</span>
            <span className="info-value">{prescription.patientName || "Not provided"}</span>
          </div>
          <div className="info-block">
            <span className="info-label">Diagnosis</span>
            <span className="info-value">{prescription.illness || "Not provided"}</span>
          </div>
        </div>

        {prescription.ai_learn_notes && (
          <div className="ai-learn-notes-section" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              AI Learn Notes (Auto-Extracted)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div><strong style={{color: '#64748b'}}>Complaints:</strong> <span style={{color: '#334155'}}>{prescription.ai_learn_notes.complaints || 'N/A'}</span></div>
              <div><strong style={{color: '#64748b'}}>History:</strong> <span style={{color: '#334155'}}>{prescription.ai_learn_notes.history || 'N/A'}</span></div>
              <div><strong style={{color: '#64748b'}}>Condition:</strong> <span style={{color: '#334155'}}>{prescription.ai_learn_notes.condition || 'N/A'}</span></div>
              <div><strong style={{color: '#64748b'}}>Observations:</strong> <span style={{color: '#334155'}}>{prescription.ai_learn_notes.observations || 'N/A'}</span></div>
              <div style={{ gridColumn: '1 / -1' }}><strong style={{color: '#64748b'}}>Other Notes:</strong> <span style={{color: '#334155'}}>{prescription.ai_learn_notes.other_notes || 'N/A'}</span></div>
            </div>
          </div>
        )}

        <div className="medicines-section">
          <h3 className="section-title">
            {prescription.suggested_medicines ? "AI Suggested Medicines" : "Medicines Extracted"} ({prescription.medicines?.length || 0})
          </h3>
          <div className="medicines-list">
            {prescription.medicines?.map((med, idx) => (
              <div key={idx} className="medicine-item">
                <button 
                  className="btn-delete" 
                  onClick={() => handleDeleteMedicine(idx)}
                  title="Remove Medicine"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                </button>
                <div className="med-row">
                  <div className="input-wrap flex-2" style={{ position: 'relative' }}>
                    <label className="mini-label">Name</label>
                    <input 
                      className="input-field" 
                      value={med.name} 
                      onFocus={() => setActiveSearchIndex(idx)}
                      onChange={(e) => {
                        handleMedicineChange(idx, "name", e.target.value);
                        setActiveSearchIndex(idx);
                      }}
                      placeholder="Search DB inventory..."
                    />
                    {activeSearchIndex === idx && med.name.trim().length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '180px', overflowY: 'auto', marginTop: '4px' }}>
                        {(() => {
                          const q = med.name.trim().toLowerCase();
                          const matches = dbInventory.filter(item => item.name && item.name.toLowerCase().includes(q));
                          if (matches.length === 0) {
                            return (
                              <div style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                No products found in inventory.
                              </div>
                            );
                          }
                          return matches.map((item, mIdx) => (
                            <div 
                              key={mIdx} 
                              onClick={() => {
                                handleMedicineChange(idx, "name", item.name);
                                setActiveSearchIndex(null);
                              }}
                              style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                              onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                            >
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                              <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>Current Stock: {item.stock}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="input-wrap flex-1">
                    <label className="mini-label">Dosage</label>
                    <input 
                      className="input-field" 
                      value={med.dosage} 
                      onChange={(e) => handleMedicineChange(idx, "dosage", e.target.value)}
                    />
                  </div>
                </div>
                <div className="med-row mt-2">
                  <div className="input-wrap flex-2">
                    <label className="mini-label">Frequency (comma separated)</label>
                    <input 
                      className="input-field" 
                      value={Array.isArray(med.frequency) ? med.frequency.join(", ") : med.frequency || ""} 
                      onChange={(e) => handleMedicineChange(idx, "frequency", e.target.value)}
                    />
                  </div>
                  <div className="input-wrap flex-1">
                    <label className="mini-label">Duration (Days)</label>
                    <div className="duration-input-wrapper">
                      <input 
                        type="text"
                        className="input-field" 
                        value={med.duration || ""} 
                        onChange={(e) => handleMedicineChange(idx, "duration", e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>
                <div className="med-row mt-2" style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="food-timing-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: med.foodTiming === 'Before Food' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      background: med.foodTiming === 'Before Food' ? '#eff6ff' : '#ffffff',
                      color: med.foodTiming === 'Before Food' ? '#1d4ed8' : '#4b5563',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleMedicineChange(idx, "foodTiming", "Before Food")}
                  >
                    Before Food
                  </button>
                  <button 
                    className="food-timing-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: med.foodTiming === 'After Food' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      background: med.foodTiming === 'After Food' ? '#eff6ff' : '#ffffff',
                      color: med.foodTiming === 'After Food' ? '#1d4ed8' : '#4b5563',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleMedicineChange(idx, "foodTiming", "After Food")}
                  >
                    After Food
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-secondary mt-3" onClick={handleAddMedicine}>
            + Add Medicine
          </button>
        </div>

        <button className="btn-primary" onClick={handleConfirmClick}>
          Approve and Submit
        </button>
      </div>
    </div>
  );
}
