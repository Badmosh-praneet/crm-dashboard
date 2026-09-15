import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

export default function Visualizations({ sources = [], models = [] }) {
  // Use a modern, aesthetic color palette
  const COLORS = ['#0ea5e9', '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // Format data for the pie chart (filter out sources with 0 leads)
  const pieData = sources
    .filter(s => s.leads > 0)
    .sort((a, b) => b.leads - a.leads);

  // Format data for the bar chart
  // The 'models' prop usually corresponds to the v_model_position view (families)
  // v_model_position names the count bookings_this_period; v_model_demand names
  // it bookings. This chart is fed the former, so reading m.bookings drew every
  // bar at zero. Accept either, so it keeps working whichever view supplies it.
  const barData = models.map(m => ({
    family: m.family || m.model || 'Unknown',
    Bookings: m.bookings_this_period ?? m.bookings ?? 0,
    'Free Stock': m.free_stock ?? 0
  }));

  // Custom tooltips
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--grid)',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          color: 'var(--ink)'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{data.source}</p>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--ink-muted)' }}>
            Leads: <span style={{ color: payload[0].payload.fill, fontWeight: 'bold' }}>{data.leads}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--grid)',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          color: 'var(--ink)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '14px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }} />
              <span style={{ color: 'var(--ink-muted)' }}>{entry.name}:</span>
              <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid-2" style={{ marginTop: '20px' }}>
      {/* Leads Source Pie Chart */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ marginBottom: '10px' }}>
          <h2>Lead Sources Breakdown</h2>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Current Period</span>
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="leads"
                  nameKey="source"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', color: 'var(--ink-muted)' }} 
                  iconType="circle" 
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
              No leads data available
            </div>
          )}
        </div>
      </div>

      {/* Model Demand Bar Chart */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ marginBottom: '10px' }}>
          <h2>Model Demand vs Supply</h2>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Bookings vs Free Stock</span>
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={2}
                barSize={30}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid)" />
                <XAxis 
                  dataKey="family" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} 
                />
                <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--grid)', opacity: 0.4 }} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', color: 'var(--ink-muted)', paddingTop: '10px' }} 
                  iconType="circle" 
                />
                <Bar dataKey="Bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Free Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)' }}>
              No model data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
