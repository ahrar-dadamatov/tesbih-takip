import { useEffect, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus, SyncStatus } from '../lib/progressSync';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return status;
}
