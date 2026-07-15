/**
 * LabourEntryScreen.js — router for the Labour tab.
 *
 * No more "I Want to Hire" / "I Want to Find Work" question. Instead:
 *
 *   - User has already posted their own worker profile (a labour_profiles
 *     row exists, reflected as user.has_labour_profile) → WorkerStatusScreen,
 *     the single-screen, dual-state "am I looking for work / am I on a job"
 *     home. The full request history, ratings, and disputes still live in
 *     HireRequestsScreen — reachable from WorkerStatusScreen's dashboard icon
 *     (route "HireRequests") — but a worker's day-to-day screen no longer
 *     needs any tab bar or navigation to do the one thing they came for.
 *   - Everyone else — guests, and logged-in users who haven't posted a
 *     profile yet — → LabourScreen, the browse-all-workers marketplace.
 *     From there a "Post my profile" CTA lets them become a worker whenever
 *     they're ready; the very next time they open the Labour tab they land
 *     on their dashboard automatically.
 *
 * Profile > "Browse workers" (see ProfileScreen) lets a worker peek at the
 * marketplace without losing their dashboard as the default landing view,
 * via the `forceBrowse` route param.
 *
 * Place at: src/screens/LabourEntryScreen.js
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import LabourScreen from './LabourScreen';
import WorkerStatusScreen from './WorkerStatusScreen';

export default function LabourEntryScreen(props) {
  const { user } = useAuth();
  const forceBrowse = props?.route?.params?.forceBrowse;

  if (user?.has_labour_profile && !forceBrowse) {
    return <WorkerStatusScreen {...props} />;
  }

  // Guests, hirers with no posted profile yet, and anyone who tapped
  // "Browse workers" land on the marketplace.
  return <LabourScreen {...props} />;
}
