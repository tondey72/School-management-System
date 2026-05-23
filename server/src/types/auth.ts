export const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "PRINCIPAL",
  "VICE_PRINCIPAL",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "ACCOUNTANT",
  "LIBRARIAN",
  "HR_OFFICER",
  "REGISTRAR",
  "HOSTEL_WARDEN",
  "TRANSPORT_MANAGER"
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface JwtClaims {
  sub: string;
  schoolId: string;
  role: SystemRole;
  email: string;
}