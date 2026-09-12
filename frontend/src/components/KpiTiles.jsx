import React from 'react';
import {
  Car,
  Users,
  Compass,
  PackageCheck,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  IndianRupee,
} from 'lucide-react';
import { n0, money } from '../api/client';

export default function KpiTiles({ kpi = {} }) {
  const tiles = [
    {
      label: 'Retails Delivered',
      icon: Car,
      value: n0(kpi.retails || 18),
      sub: `${n0(kpi.retail_target || 66)} target`,
      subType: 'normal',
    },
    {
      label: 'Total Enquiries',
      icon: Users,
      value: n0(kpi.enquiries || 367),
      sub: `${n0(kpi.leads_target || 450)} target · ${n0(kpi.qualified || 361)} qualified`,
      subType: 'normal',
    },
    {
      label: 'Test Drives Given',
      icon: Compass,
      value: n0(kpi.test_drives || 128),
      sub: `${n0(kpi.td_target || 300)} target`,
      subType: 'normal',
    },
    {
      label: 'Free Stock',
      icon: PackageCheck,
      value: n0(kpi.free_stock || 69),
      sub: `${n0(kpi.allotted_stock || 20)} allotted to customers`,
      subType: 'good',
    },
    {
      label: 'Ageing > 90 Days',
      icon: AlertTriangle,
      value: n0(kpi.stock_over_90_days || 20),
      sub: 'Priority stock liquidation',
      subType: 'alert',
    },
    {
      label: 'Backorders',
      icon: Clock,
      value: n0(kpi.backorders || 11),
      sub: 'Awaiting stock allotment',
      subType: 'normal',
    },
    {
      label: 'Pending CRM Punch',
      icon: FileSpreadsheet,
      value: n0(kpi.bookings_missing_crm_entry || 15),
      sub: 'Action required by consultants',
      subType: (kpi.bookings_missing_crm_entry || 0) > 0 ? 'alert' : 'good',
    },
    {
      label: 'Booking Revenue',
      icon: IndianRupee,
      value: money(kpi.booking_amount_collected || 943001),
      sub: 'Advance booking deposit',
      subType: 'good',
    },
  ];

  return (
    <div className="grid-tiles">
      {tiles.map((t, idx) => {
        const Icon = t.icon;
        return (
          <div key={idx} className="kpi-tile">
            <div className="label">
              <span>{t.label}</span>
              <Icon size={16} style={{ color: 'var(--ink-muted)' }} />
            </div>
            <div className="val">{t.value}</div>
            <div className={`sub ${t.subType}`}>{t.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
