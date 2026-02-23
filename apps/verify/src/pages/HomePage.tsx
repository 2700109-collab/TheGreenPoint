import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Search, QrCode, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TRACKING_ID_REGEX = /^(PLT|TRF|SAL)-\d{8}-[A-Z0-9]{3,6}$|^NCTS-ZA-\d{4}-\d{4,8}$/;

function HomePage() {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [touched, setTouched] = useState(false);

  function validate(value: string): string {
    if (!value.trim()) return 'Please enter a tracking ID.';
    if (!TRACKING_ID_REGEX.test(value.trim())) {
      return 'Invalid format. Expected: NCTS-ZA-2026-000001 or PLT-YYYYMMDD-XXXX';
    }
    return '';
  }

  function handleBlur() {
    setTouched(true);
    setValidationError(validate(trackingId));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    console.log('[VERIFY-HOME-DEBUG] form submitted', { trackingId, raw: trackingId.trim() });
    const error = validate(trackingId);
    console.log('[VERIFY-HOME-DEBUG] validation result', { error: error || 'PASS', regex: TRACKING_ID_REGEX.toString() });
    setValidationError(error);
    setTouched(true);
    if (!error) {
      const dest = `/verify/${trackingId.trim()}`;
      console.log('[VERIFY-HOME-DEBUG] navigating to', dest);
      navigate(dest);
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-12 sm:py-20">
      {/* Hero */}
      <div className="flex flex-col items-center text-center max-w-2xl">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#1B3A5C]/10 mb-6">
          <Shield className="w-16 h-16 text-[#1B3A5C]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Verify Cannabis Product Authenticity
        </h1>

        <p className="mt-4 text-lg text-slate-600 max-w-lg">
          Enter a product tracking ID or scan a QR code to instantly verify that
          a cannabis product is registered in South Africa&apos;s National
          Cannabis Tracking System.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="mt-10 w-full max-w-md flex flex-col gap-3"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <Input
            value={trackingId}
            onChange={(e) => {
              setTrackingId(e.target.value.toUpperCase());
              if (touched) setValidationError(validate(e.target.value.toUpperCase()));
            }}
            onBlur={handleBlur}
            placeholder="e.g. NCTS-ZA-2026-000001"
            className="h-11 pl-12 text-base font-mono tracking-wide"
            aria-label="Tracking ID"
            autoComplete="off"
          />
        </div>

        {touched && validationError && (
          <p className="text-sm text-red-600 px-1">{validationError}</p>
        )}

        <Button type="submit" size="lg" className="w-full text-base">
          Verify Product →
        </Button>
      </form>

      {/* OR divider */}
      <div className="flex items-center gap-4 mt-8 w-full max-w-md">
        <div className="flex-1 h-px bg-slate-300" />
        <span className="text-sm text-slate-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-300" />
      </div>

      {/* Scan QR */}
      <div className="mt-6 w-full max-w-md">
        <Link
          to="/scan"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full text-base gap-2')}
        >
          <QrCode className="w-5 h-5" />
          Scan QR Code
        </Link>
      </div>

      {/* Trust badges */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        <TrustBadge
          icon={<Lock className="w-6 h-6 text-[#1B3A5C]" />}
          title="Government Verified"
          description="Authenticated by the National Cannabis Tracking System"
        />
        <TrustBadge
          icon={<FileText className="w-6 h-6 text-[#1B3A5C]" />}
          title="SAHPRA Compliant"
          description="Meets all regulatory requirements"
        />
        <TrustBadge
          icon={<CheckCircle2 className="w-6 h-6 text-[#1B3A5C]" />}
          title="Real-time Data"
          description="Live tracking database verification"
        />
      </div>
    </div>
  );
}

function TrustBadge({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default HomePage;
