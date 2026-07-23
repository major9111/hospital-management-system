import { FulfillPrescriptionForm, ReportLabResultForm } from '@/components/NurseForms';

export default function NurseDashboard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">Department patients</h1>
      <p className="text-ink-muted text-sm mb-8">Everyone assigned to your department today.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FulfillPrescriptionForm />
        <ReportLabResultForm />
      </div>
    </div>
  );
}
