export enum Role {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  PATIENT = 'patient',
}

// Resource+action+scope permission string, e.g. "patient_record:read:own"
export type Scope = 'own' | 'department' | 'hospital' | 'all';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete';
  scope: Scope;
}

// Default permission matrix — mirrors the seed data in db/schema.sql.
// Keep this in sync with the `role_permissions` table; this in-memory copy
// is used for fast checks, with the DB as the source of truth on role changes.
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    { resource: 'patient_record', action: 'read', scope: 'all' },
    { resource: 'patient_record', action: 'write', scope: 'all' },
    { resource: 'billing', action: 'read', scope: 'all' },
    { resource: 'billing', action: 'write', scope: 'all' },
    { resource: 'inventory', action: 'write', scope: 'all' },
    { resource: 'user_management', action: 'write', scope: 'all' },
    { resource: 'prescription', action: 'read', scope: 'all' },
    { resource: 'prescription', action: 'write', scope: 'all' },
    { resource: 'lab_order', action: 'read', scope: 'all' },
    { resource: 'lab_order', action: 'write', scope: 'all' },
    { resource: 'telemedicine', action: 'read', scope: 'all' },
    { resource: 'telemedicine', action: 'write', scope: 'all' },
  ],
  [Role.DOCTOR]: [
    { resource: 'patient_record', action: 'read', scope: 'department' },
    { resource: 'patient_record', action: 'write', scope: 'own' }, // own = own patients
    { resource: 'appointment', action: 'write', scope: 'own' },
    { resource: 'prescription', action: 'write', scope: 'own' },   // doctor writes prescriptions for their own patients
    { resource: 'prescription', action: 'read', scope: 'own' },
    { resource: 'lab_order', action: 'write', scope: 'own' },      // doctor orders labs for their own patients
    { resource: 'lab_order', action: 'read', scope: 'own' },
    { resource: 'telemedicine', action: 'write', scope: 'own' },
    { resource: 'telemedicine', action: 'read', scope: 'own' },
  ],
  [Role.NURSE]: [
    { resource: 'patient_record', action: 'read', scope: 'department' },
    { resource: 'patient_record', action: 'write', scope: 'department' },
    { resource: 'appointment', action: 'read', scope: 'department' },
    { resource: 'prescription', action: 'read', scope: 'department' },
    { resource: 'prescription', action: 'write', scope: 'department' }, // fulfillment (dispensing), no ward pharmacist role yet
    { resource: 'lab_order', action: 'write', scope: 'department' },    // records results coming back from the lab
    { resource: 'lab_order', action: 'read', scope: 'department' },
  ],
  [Role.RECEPTIONIST]: [
    { resource: 'appointment', action: 'read', scope: 'hospital' },
    { resource: 'appointment', action: 'write', scope: 'hospital' },
    { resource: 'patient_record', action: 'read', scope: 'hospital' }, // demographic only, enforced at field level
    { resource: 'telemedicine', action: 'write', scope: 'hospital' },  // can create a session for a booked visit
    { resource: 'billing', action: 'read', scope: 'hospital' },        // front desk handles invoicing day-to-day
    { resource: 'billing', action: 'write', scope: 'hospital' },
  ],
  [Role.PATIENT]: [
    { resource: 'patient_record', action: 'read', scope: 'own' },
    { resource: 'appointment', action: 'read', scope: 'own' },
    { resource: 'appointment', action: 'write', scope: 'own' },
    { resource: 'prescription', action: 'read', scope: 'own' },
    { resource: 'lab_order', action: 'read', scope: 'own' },
    { resource: 'telemedicine', action: 'read', scope: 'own' },
  ],
};
