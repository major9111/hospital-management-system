export enum Role {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  PATIENT = 'patient',
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AppointmentDto {
  id: string;
  patientId: string;
  doctorId: string;
  department: string;
  scheduledAt: string; // ISO string
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  bookedVia: 'staff' | 'ai_receptionist' | 'patient_portal';
}

export interface PatientDto {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
}
