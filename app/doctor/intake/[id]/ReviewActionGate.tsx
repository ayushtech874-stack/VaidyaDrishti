'use client';

export default function ReviewActionGate({
  intakeId,
  status,
  markAsReviewedAction,
}: {
  intakeId: string;
  confidence?: string;
  status: string;
  markAsReviewedAction: (formData: FormData) => Promise<void>;
}) {
  if (status === 'doctor_reviewed') {
    return (
      <span className="bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-xl text-sm">
        ✓ Marked as Treated & Cured
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <form action={markAsReviewedAction}>
        <input type="hidden" name="intake_id" value={intakeId} />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition active:scale-[0.99]"
        >
          ✅ Mark as Treated & Cured
        </button>
      </form>
    </div>
  );
}
