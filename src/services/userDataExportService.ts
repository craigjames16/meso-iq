import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/env';

export async function downloadSetsCsvExport() {
  return apiClient.downloadGet(API_ENDPOINTS.EXPORT_SETS);
}
