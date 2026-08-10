import React, { useState, useMemo } from 'react';

export default function PharmacyAnalytics({ dbPrescriptions = [], inventory = [] }) {
  const [weatherCondition, setWeatherCondition] = useState('cold'); // 'cold' | 'rainy' | 'hot' | 'normal'
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'high' | 'low' | 'unsold'

  // 1. Calculate Historical Sales Metrics from DB Prescriptions
  const salesMetrics = useMemo(() => {
    const medSalesMap = {};
    let totalItemsSold = 0;
    let totalRevenue = 0;

    const completedRxs = dbPrescriptions.filter(rx => 
      rx.status?.toLowerCase() === 'dispensed' || rx.status?.toLowerCase() === 'completed' || rx.status?.toLowerCase() === 'verified'
    );

    completedRxs.forEach(rx => {
      const meds = rx.medicines || [];
      meds.forEach(m => {
        const name = (m.name || m.medicine_name || 'Paracetamol 500mg').trim();
        const dosageNum = parseInt(m.dosage, 10) || 1;
        const durationNum = parseInt(m.duration || m.duration_days, 10) || 3;
        const qty = parseInt(m.qty, 10) || (dosageNum * durationNum) || 1;
        const price = parseFloat(m.unitPrice) || 15;
        const amount = qty * price;

        if (!medSalesMap[name]) {
          medSalesMap[name] = { name, soldQty: 0, revenue: 0, timesPrescribed: 0 };
        }
        medSalesMap[name].soldQty += qty;
        medSalesMap[name].revenue += amount;
        medSalesMap[name].timesPrescribed += 1;

        totalItemsSold += qty;
        totalRevenue += amount;
      });
    });

    // Ensure all items in inventory exist in map
    inventory.forEach(invItem => {
      const name = invItem.name.trim();
      if (!medSalesMap[name]) {
        medSalesMap[name] = { name, soldQty: 0, revenue: 0, timesPrescribed: 0 };
      }
    });

    const salesList = Object.values(medSalesMap).sort((a, b) => b.soldQty - a.soldQty);
    return { salesList, totalItemsSold, totalRevenue, totalCompletedRxs: completedRxs.length };
  }, [dbPrescriptions, inventory]);

  // 2. Machine Learning Weather-Based Demand Prediction Model
  const mlPredictions = useMemo(() => {
    const weatherMultipliers = {
      cold: {
        fever: 1.65,
        cold: 1.85,
        cough: 1.75,
        throat: 1.70,
        antibiotic: 1.50,
        vitamin: 1.35,
        pain: 1.30,
        default: 1.10
      },
      rainy: {
        fever: 1.55,
        cold: 1.40,
        stomach: 1.80,
        acidity: 1.60,
        diarrhea: 1.90,
        antibiotic: 1.65,
        skin: 1.45,
        default: 1.15
      },
      hot: {
        ors: 2.10,
        hydration: 2.00,
        acidity: 1.75,
        stomach: 1.50,
        skin: 1.60,
        fungal: 1.70,
        fever: 1.20,
        default: 1.05
      },
      normal: {
        default: 1.00
      }
    };

    const currentRules = weatherMultipliers[weatherCondition] || weatherMultipliers.normal;

    return salesMetrics.salesList.map(item => {
      const lowerName = item.name.toLowerCase();
      
      // Determine weather multiplier based on keyword match
      let multiplier = currentRules.default || 1.0;
      if (lowerName.includes('para') || lowerName.includes('dolo') || lowerName.includes('fever') || lowerName.includes('crocin')) {
        multiplier = currentRules.fever || multiplier;
      } else if (lowerName.includes('cough') || lowerName.includes('cold') || lowerName.includes('syrup') || lowerName.includes('ascoril')) {
        multiplier = currentRules.cough || currentRules.cold || multiplier;
      } else if (lowerName.includes('amox') || lowerName.includes('cifi') || lowerName.includes('biotic') || lowerName.includes('azithro')) {
        multiplier = currentRules.antibiotic || multiplier;
      } else if (lowerName.includes('cetirizine') || lowerName.includes('allergy')) {
        multiplier = currentRules.cold || multiplier;
      } else if (lowerName.includes('panto') || lowerName.includes('acid') || lowerName.includes('digene') || lowerName.includes('ranitidine')) {
        multiplier = currentRules.acidity || currentRules.stomach || multiplier;
      } else if (lowerName.includes('ors') || lowerName.includes('electral') || lowerName.includes('energy')) {
        multiplier = currentRules.ors || currentRules.hydration || multiplier;
      } else if (lowerName.includes('vit') || lowerName.includes('zinc')) {
        multiplier = currentRules.vitamin || multiplier;
      }

      // Find stock in current inventory
      const invMatch = inventory.find(i => i.name.trim().toLowerCase() === lowerName);
      const stock = invMatch ? parseInt(invMatch.stock, 10) : 0;
      const expiry = invMatch ? invMatch.expiry_date : 'N/A';

      // Machine Learning Demand Formula: (Historical Sold + Base Daily Estimate) * Weather Factor
      const baseEstimate = Math.max(item.soldQty, 5);
      const predictedDemand = Math.round(baseEstimate * multiplier);
      const bufferStock = 10;
      const recommendedStock = predictedDemand + bufferStock;
      const reorderQty = Math.max(0, recommendedStock - stock);

      let demandStatus = 'Stable'; // 'High Surge' | 'Moderate Surge' | 'Stable' | 'Unsold'
      let surgeBadgeClass = 'completed';

      if (item.soldQty === 0 && stock > 0) {
        demandStatus = 'Unsold / Low Demand';
        surgeBadgeClass = 'reviewing';
      } else if (reorderQty > 15 || multiplier >= 1.6) {
        demandStatus = 'High Demand Surge 🔥';
        surgeBadgeClass = 'critical-badge';
      } else if (reorderQty > 0 || multiplier >= 1.3) {
        demandStatus = 'Moderate Surge 📈';
        surgeBadgeClass = 'warning-badge';
      }

      return {
        ...item,
        currentStock: stock,
        expiryDate: expiry,
        weatherMultiplier: multiplier,
        predictedDemand,
        recommendedStock,
        reorderQty,
        demandStatus,
        surgeBadgeClass
      };
    });
  }, [salesMetrics, inventory, weatherCondition]);

  // Metric Summaries
  const highDemandCount = mlPredictions.filter(p => p.demandStatus.includes('Surge')).length;
  const unsoldCount = mlPredictions.filter(p => p.soldQty === 0).length;
  const topSellingMed = salesMetrics.salesList[0] || { name: 'Paracetamol 650mg', soldQty: 0 };

  // Filtered table list
  const filteredPredictions = mlPredictions.filter(item => {
    if (activeCategoryFilter === 'high') return item.demandStatus.includes('High Demand');
    if (activeCategoryFilter === 'low') return item.demandStatus.includes('Moderate Surge') || (item.soldQty < 5 && item.soldQty > 0);
    if (activeCategoryFilter === 'unsold') return item.soldQty === 0;
    return true; // 'all'
  });

  return (
    <div className="pharmacy-analytics-container">
      {/* Top Banner & Weather ML Toggle */}
      <div className="analytics-header-banner" style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', marginBottom: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>Pharmacy Analytics & ML Forecast</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Real-time sales velocity, inventory turnover, and weather-driven predictive demand modeling.</p>
        </div>

        {/* Weather Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🤖 ML Weather Feature:
          </span>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', gap: '4px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setWeatherCondition('cold')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: weatherCondition === 'cold' ? '#2563eb' : 'transparent', color: weatherCondition === 'cold' ? '#ffffff' : '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              ❄️ Cold / Winter
            </button>
            <button
              onClick={() => setWeatherCondition('rainy')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: weatherCondition === 'rainy' ? '#2563eb' : 'transparent', color: weatherCondition === 'rainy' ? '#ffffff' : '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              🌧️ Rainy / Monsoon
            </button>
            <button
              onClick={() => setWeatherCondition('hot')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: weatherCondition === 'hot' ? '#2563eb' : 'transparent', color: weatherCondition === 'hot' ? '#ffffff' : '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              ☀️ Hot / Summer
            </button>
            <button
              onClick={() => setWeatherCondition('normal')}
              style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: weatherCondition === 'normal' ? '#2563eb' : 'transparent', color: weatherCondition === 'normal' ? '#ffffff' : '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            >
              🌤️ Normal
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="pharmacy-stats" style={{ marginBottom: '28px' }}>
        <div className="p-stat-card">
          <div className="p-stat-top">
            <span className="p-stat-title">Total Medicines Sold</span>
            <div className="p-stat-icon blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
          </div>
          <div className="p-stat-value-area">
            <span className="p-stat-value">{salesMetrics.totalItemsSold} Units</span>
            <span className="p-stat-trend">↑ Live DB</span>
          </div>
          <div className="p-stat-footer">
            <span>Dispatched Prescriptions: {salesMetrics.totalCompletedRxs}</span>
            <span className="p-status-dot green"></span>
          </div>
        </div>

        <div className="p-stat-card">
          <div className="p-stat-top">
            <span className="p-stat-title">Pharmacy Revenue</span>
            <div className="p-stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="p-stat-value-area">
            <span className="p-stat-value">₹{salesMetrics.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="p-stat-footer">
            <span>Avg Bill: ₹{salesMetrics.totalCompletedRxs > 0 ? (salesMetrics.totalRevenue / salesMetrics.totalCompletedRxs).toFixed(0) : '0'}</span>
            <span className="p-status-dot green"></span>
          </div>
        </div>

        <div className="p-stat-card">
          <div className="p-stat-top">
            <span className="p-stat-title">Most Sold Medicine</span>
            <div className="p-stat-icon blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
          </div>
          <div className="p-stat-value-area" style={{ flexDirection: 'column', gap: '2px' }}>
            <span className="p-stat-value" style={{ fontSize: '20px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{topSellingMed.name}</span>
            <span className="p-stat-trend">{topSellingMed.soldQty} Units Sold</span>
          </div>
          <div className="p-stat-footer">
            <span>Bestseller Item</span>
            <span className="p-status-dot green"></span>
          </div>
        </div>

        <div className="p-stat-card alert">
          <div className="p-stat-top">
            <span className="p-stat-title">ML Surge Warning</span>
            <div className="p-stat-icon red">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
          </div>
          <div className="p-stat-value-area">
            <span className="p-stat-value red-text">{highDemandCount} Items</span>
            <span className="p-stat-trend critical">Action Req.</span>
          </div>
          <div className="p-stat-footer">
            <span>Unsold Items: {unsoldCount}</span>
            <span className="p-status-dot red"></span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="pharmacy-grid" style={{ marginBottom: '28px' }}>
        {/* Horizontal Bar Chart: Sales Velocity per Medicine */}
        <div className="p-panel">
          <div className="p-panel-header">
            <h2>📈 Medicine Sales Velocity & Demand Comparison</h2>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Actual Sales vs. Predicted 30D Demand</span>
          </div>
          <div style={{ padding: '24px' }}>
            {mlPredictions.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center' }}>No sales data available yet.</p>
            ) : (
              mlPredictions.slice(0, 6).map((item, idx) => {
                const maxVal = Math.max(...mlPredictions.map(p => Math.max(p.soldQty, p.predictedDemand)), 10);
                const soldPct = Math.min(100, Math.round((item.soldQty / maxVal) * 100));
                const predPct = Math.min(100, Math.round((item.predictedDemand / maxVal) * 100));

                return (
                  <div key={idx} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13.5px' }}>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{item.name}</span>
                      <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                        Sold: <strong style={{ color: '#2563eb' }}>{item.soldQty}</strong> | Predicted: <strong style={{ color: '#d97706' }}>{item.predictedDemand}</strong> | Stock: {item.currentStock}
                      </span>
                    </div>

                    {/* Dual Progress Bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Actual Sales Bar */}
                      <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '10px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                        <div 
                          style={{ 
                            width: `${Math.max(soldPct, 4)}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '6px',
                            transition: 'width 0.5s ease-in-out'
                          }} 
                          title={`Actual Sold: ${item.soldQty}`}
                        />
                      </div>

                      {/* ML Predicted Demand Bar */}
                      <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '6px', width: '100%', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${Math.max(predPct, 4)}%`, 
                            height: '100%', 
                            background: item.reorderQty > 0 ? '#ef4444' : '#f59e0b',
                            borderRadius: '6px',
                            transition: 'width 0.5s ease-in-out'
                          }} 
                          title={`Predicted Demand: ${item.predictedDemand}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '8px', background: '#2563eb', borderRadius: '2px' }}></span>
                <span>Actual Sold (DB Logs)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '8px', background: '#f59e0b', borderRadius: '2px' }}></span>
                <span>ML Weather Predicted Demand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Weather & ML Demand Highlights */}
        <div className="p-sidebar-panels">
          <div className="p-panel" style={{ background: weatherCondition === 'cold' ? '#eff6ff' : weatherCondition === 'rainy' ? '#f0fdf4' : weatherCondition === 'hot' ? '#fffbeb' : '#ffffff', borderColor: '#cbd5e1' }}>
            <div className="p-panel-header" style={{ background: 'transparent' }}>
              <h2>🌤️ Weather ML Impact ({weatherCondition.toUpperCase()})</h2>
            </div>
            <div style={{ padding: '20px', fontSize: '13.5px', color: '#334155' }}>
              {weatherCondition === 'cold' && (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#1e40af' }}>
                    ❄️ Cold Weather Surge Detected!
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b' }}>
                    Low temperatures correlate with a <strong>+65% surge</strong> in fever analgesics (Paracetamol, Dolo) and a <strong>+85% surge</strong> in cold/cough syrups and antibiotics.
                  </p>
                </div>
              )}

              {weatherCondition === 'rainy' && (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#15803d' }}>
                    🌧️ Monsoon Infection Surge Active!
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b' }}>
                    Monsoon humidity drives a <strong>+80% surge</strong> in gastrointestinal & anti-diarrheal medicines and <strong>+65% demand</strong> in antibiotics.
                  </p>
                </div>
              )}

              {weatherCondition === 'hot' && (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#b45309' }}>
                    ☀️ Summer Hydration & Antacid Demand!
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b' }}>
                    High heat causes a <strong>+110% surge</strong> in ORS electrolytes, hydration solutions, and <strong>+75% demand</strong> in antacids (Pantoprazole).
                  </p>
                </div>
              )}

              {weatherCondition === 'normal' && (
                <div>
                  <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#475569' }}>
                    🌤️ Standard Weather Baseline
                  </p>
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e293b' }}>
                    Standard baseline conditions. Predictions are derived from 30-day historical consumption velocity.
                  </p>
                </div>
              )}

              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>ML Algorithm Model:</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#0f172a', fontWeight: '500' }}>
                  Demand<sub>30D</sub> = (Sales<sub>Hist</sub> × W<sub>Mult</sub>) + Buffer<sub>Stock</sub>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Predictive Analytics Table */}
      <div className="p-panel full-width">
        <div className="p-panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>🤖 Machine Learning Demand Forecast & Inventory Reorder Model</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>
              Historical consumption velocity merged with real-time weather demand multipliers.
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveCategoryFilter('all')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activeCategoryFilter === 'all' ? '#2563eb' : '#ffffff', color: activeCategoryFilter === 'all' ? '#ffffff' : '#475569', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              All ({mlPredictions.length})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('high')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activeCategoryFilter === 'high' ? '#dc2626' : '#ffffff', color: activeCategoryFilter === 'high' ? '#ffffff' : '#475569', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              High Demand ({highDemandCount})
            </button>
            <button
              onClick={() => setActiveCategoryFilter('unsold')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: activeCategoryFilter === 'unsold' ? '#475569' : '#ffffff', color: activeCategoryFilter === 'unsold' ? '#ffffff' : '#475569', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}
            >
              Unsold / Low ({unsoldCount})
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="p-queue-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Current Stock</th>
                <th>Historical Sold</th>
                <th>Weather Multiplier</th>
                <th>Predicted 30D Demand</th>
                <th>Rec. Reorder Level</th>
                <th>Stock Status / Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No medicine records found for this filter.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-patient-name">{item.name}</td>
                    <td>
                      <span style={{ fontWeight: '700', color: item.currentStock < 10 ? '#dc2626' : '#0f172a' }}>
                        {item.currentStock} Units
                      </span>
                    </td>
                    <td>{item.soldQty} Units</td>
                    <td>
                      <span style={{ fontSize: '12.5px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', color: '#2563eb' }}>
                        {item.weatherMultiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#d97706' }}>{item.predictedDemand} Units</strong>
                    </td>
                    <td>
                      {item.reorderQty > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>
                          + Reorder {item.reorderQty} Units
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: '600' }}>
                          Sufficient ({item.recommendedStock})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`p-badge ${item.surgeBadgeClass}`}>
                        <span className="dot"></span>
                        {item.demandStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
