/**
 * LabourEntryScreen.js — role router for the Labour tab.
 *
 * Every existing `nav.navigate('Labour')` call site in the app keeps working
 * unchanged; this screen decides *what* renders under that tab:
 *
 *   - Not logged in, or logged in with no labour_role yet → LabourRoleGateScreen
 *     ("I Want to Hire" / "I Want to Find Work"). Guests are shown the hiring
 *     marketplace directly (browsing is public) rather than forcing a choice
 *     before they've even signed up.
 *   - labour_role === 'hirer' → LabourScreen (hiring marketplace, unchanged).
 *   - labour_role === 'worker' → HireRequestsScreen (their dashboard for
 *     managing incoming requests / posting their profile).
 *
 * Profile > Switch mode calls setLabourRole(null-ish reset) then this screen
 * naturally shows the gate again next time the tab opens.
 *
 * Place at: src/screens/LabourEntryScreen.js
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LabourRoleGateScreen from './LabourRoleGateScreen';
import LabourScreen from './LabourScreen';
import HireRequestsScreen from './HireRequestsScreen';

export default function LabourEntryScreen(props) {
  const { user } = useAuth();
  // Local override so the screen updates immediately after a choice,
  // without waiting on a full AuthContext re-render round trip.
  const [justChose, setJustChose] = useState(null);

  const labourRole = justChose || user?.labour_role;

  if (user && !labourRole) {
    return <LabourRoleGateScreen onChoose={(role) => setJustChose(role)} />;
  }

  if (labourRole === 'worker') {
    return <HireRequestsScreen {...props} />;
  }

  // Guests, and anyone who chose 'hirer', land on the marketplace.
  return <LabourScreen {...props} />;
}
