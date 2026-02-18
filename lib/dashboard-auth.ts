export const DASHBOARD_AUTH_COOKIE = 'spectra_dashboard_auth';

export function getDashboardPassword(): string {
  return process.env.DASHBOARD_PASSWORD?.trim() || '';
}
