export const FOUR_PUBLIC_STATES = [
  'Received',
  'In Review',
  'Update Available',
  'Closed',
] as const;

export type PublicStatus = (typeof FOUR_PUBLIC_STATES)[number];

export interface InternalStatusOption {
  value: string;
  label: string;
  defaultPublicStatus: PublicStatus;
}

export const INTERNAL_STATUS_OPTIONS: InternalStatusOption[] = [
  { value: 'RECEIVED', label: 'Received & Queued', defaultPublicStatus: 'Received' },
  { value: 'ASSIGNED_INVESTIGATOR', label: 'Investigator Assigned', defaultPublicStatus: 'In Review' },
  { value: 'WITNESS_INTERVIEWS', label: 'Witness Interviews Active', defaultPublicStatus: 'In Review' },
  { value: 'LEGAL_ASSESSMENT', label: 'Legal / HR Assessment', defaultPublicStatus: 'In Review' },
  { value: 'ACTION_RECOMMENDED', label: 'Action Recommendation Prepared', defaultPublicStatus: 'Update Available' },
  { value: 'MEDIATION_SCHEDULED', label: 'Hearing / Update Ready', defaultPublicStatus: 'Update Available' },
  { value: 'RESOLVED', label: 'Case Resolved & Concluded', defaultPublicStatus: 'Closed' },
  { value: 'DISMISSED', label: 'Case Dismissed / Non-actionable', defaultPublicStatus: 'Closed' },
];

export function mapInternalToPublic(internalStatus: string): PublicStatus {
  const match = INTERNAL_STATUS_OPTIONS.find((opt) => opt.value === internalStatus);
  return match ? match.defaultPublicStatus : 'Received';
}
