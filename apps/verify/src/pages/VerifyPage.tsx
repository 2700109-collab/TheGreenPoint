import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Leaf,
  FlaskConical,
  Truck,
  ShoppingCart,
  BadgeCheck,
  Clock,
  ChevronRight,
  Phone,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { useVerifyProduct } from '@ncts/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Supply-chain journey stages                                        */
/* ------------------------------------------------------------------ */
const STAGES = [
  { icon: Leaf, label: 'Cultivated', color: 'text-emerald-600 bg-emerald-50' },
  { icon: FlaskConical, label: 'Lab Tested', color: 'text-blue-600 bg-blue-50' },
  { icon: Truck, label: 'Transferred', color: 'text-amber-600 bg-amber-50' },
  { icon: ShoppingCart, label: 'Sold', color: 'text-violet-600 bg-violet-50' },
] as const;

/* ------------------------------------------------------------------ */
/*  VerifyPage                                                         */
/* ------------------------------------------------------------------ */
function VerifyPage() {
  const { trackingId = '' } = useParams<{ trackingId: string }>();
  console.log('[VERIFY-PAGE-DEBUG] rendering', { trackingId, urlParams: window.location.href });
  const { data, isLoading, error } = useVerifyProduct(trackingId);
  console.log('[VERIFY-PAGE-DEBUG] hook state', { isLoading, hasData: !!data, error: error ? String(error) : null, dataPreview: data ? JSON.stringify(data).substring(0, 200) : null });

  /* If the hook errors out (no backend), show the fail state */
  if (isLoading) return <LoadingState trackingId={trackingId} />;
  if (error || !data) {
    console.warn('[VERIFY-PAGE-DEBUG] showing FAIL state', { error: error ? { message: (error as any).message, status: (error as any).status, body: (error as any).body } : 'no data' });
    return <FailState trackingId={trackingId} />;
  }

  const result = data as VerifiedData;
  console.log('[VERIFY-PAGE-DEBUG] verification result', { status: result.verificationStatus, trackingId: result.trackingId, productName: result.productName });

  if (result.verificationStatus === 'expired') return <ExpiredState data={result} />;
  if (result.verificationStatus === 'pending') return <PendingState data={result} />;

  return <VerifiedState data={result} />;
}

/* ================================================================== */
/*  LOADING                                                            */
/* ================================================================== */
function LoadingState({ trackingId }: { trackingId: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Loader2 className="w-12 h-12 text-[#1B3A5C] animate-spin" />
          <CardTitle className="mt-4">Verifying…</CardTitle>
          <CardDescription>
            Checking the National Cannabis Tracking System database
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Animated progress bar */}
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-[#1B3A5C] animate-pulse" />
          </div>
          <p className="text-xs font-mono text-slate-500">{trackingId}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  EXPIRED                                                            */
/* ================================================================== */
function ExpiredState({ data }: { data: VerifiedData }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 gap-8 max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-100">
          <ShieldAlert className="w-12 h-12 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-amber-700">VERIFICATION EXPIRED</h1>
        <p className="text-slate-600 max-w-md">
          The verification for tracking ID{' '}
          <strong className="font-mono">{data.trackingId}</strong> has expired.
          Please re-verify this product to confirm its current status.
        </p>
      </div>

      <Card className="w-full border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Verifications expire after a set period for security. This does not
              necessarily mean the product is invalid — please scan or look up the
              tracking ID again to get the latest result.
            </p>
          </div>
        </CardContent>
      </Card>

      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'gap-2')}
      >
        Re-verify Product
      </Link>
    </div>
  );
}

/* ================================================================== */
/*  PENDING                                                            */
/* ================================================================== */
function PendingState({ data }: { data: VerifiedData }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 gap-8 max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-100">
          <Clock className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-blue-700">PENDING VERIFICATION</h1>
        <p className="text-slate-600 max-w-md">
          The product with tracking ID{' '}
          <strong className="font-mono">{data.trackingId}</strong> is currently
          undergoing verification. Lab testing may still be in progress.
        </p>
      </div>

      <Card className="w-full border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              This product has been registered in the National Cannabis Tracking
              System but has not yet completed all verification steps. Check back
              later for the final result.
            </p>
          </div>
        </CardContent>
      </Card>

      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  );
}

/* ================================================================== */
/*  VERIFIED (pass)                                                    */
/* ================================================================== */
interface VerifiedData {
  trackingId: string;
  productName: string;
  strain: string;
  operatorName: string;
  batchNumber: string;
  facilityName?: string;
  facilityProvince?: string;
  harvestDate?: string;
  verificationStatus?: 'verified' | 'expired' | 'pending';
  labResult: {
    status: string;
    thcPercent: number;
    cbdPercent: number;
    testDate: string;
    labName: string;
  } | null;
  chainOfCustody: { from: string; to: string; date: string }[];
  verifiedAt: string;
}

function VerifiedState({ data }: { data: VerifiedData }) {
  const [copied, setCopied] = useState(false);

  function copyTrackingId() {
    void navigator.clipboard.writeText(data.trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // TODO: Use server-generated verification ID from API response
  const verificationId = 'VRF-000000-PENDING';

  return (
    <div className="flex flex-col items-center px-4 py-12 gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100">
          <ShieldCheck className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-700">VERIFIED</h1>
        <p className="text-slate-600 max-w-md">
          This product has been verified by the National Cannabis Tracking System.
        </p>
      </div>

      {/* Product details card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {/* Tracking ID */}
            <div className="sm:col-span-2">
              <dt className="text-slate-500 mb-1">Tracking ID</dt>
              <dd className="flex items-center gap-2">
                <code className="font-mono text-base font-semibold text-slate-900">
                  {data.trackingId}
                </code>
                <button
                  onClick={copyTrackingId}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-100 transition-colors"
                  aria-label="Copy tracking ID"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </dd>
            </div>

            <DetailRow label="Product / Strain" value={`${data.productName} — ${data.strain}`} />
            <DetailRow label="Operator" value={data.operatorName} />
            {data.facilityName && (
              <DetailRow
                label="Facility"
                value={
                  data.facilityProvince
                    ? `${data.facilityName}, ${data.facilityProvince}`
                    : data.facilityName
                }
              />
            )}
            <DetailRow label="Batch Number" value={data.batchNumber} />
            {data.harvestDate && (
              <DetailRow label="Harvest Date" value={data.harvestDate} />
            )}

            {data.labResult && (
              <>
                <div>
                  <dt className="text-slate-500 mb-1">Lab Status</dt>
                  <dd>
                    <Badge variant={data.labResult.status === 'Passed' ? 'success' : 'warning'}>
                      {data.labResult.status}
                    </Badge>
                  </dd>
                </div>
                <DetailRow label="THC %" value={`${data.labResult.thcPercent}%`} />
                <DetailRow label="CBD %" value={`${data.labResult.cbdPercent}%`} />
                <div>
                  <dt className="text-slate-500 mb-1">Permit Status</dt>
                  <dd>
                    <Badge variant="success">
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </dd>
                </div>
                <DetailRow label="Lab Test Date" value={data.labResult.testDate} />
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Supply Chain Journey */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Supply Chain Journey</CardTitle>
          <CardDescription>End-to-end chain of custody for this product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                    <div
                      className={cn(
                        'flex items-center justify-center w-11 h-11 rounded-full',
                        stage.color,
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {stage.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Verification metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Verified at {new Date(data.verifiedAt).toLocaleString()}
        </span>
        <span className="font-mono">Verification ID: {verificationId}</span>
      </div>

      {/* Back */}
      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
      >
        <ArrowLeft className="w-4 h-4" />
        Verify Another Product
      </Link>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500 mb-1">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

/* ================================================================== */
/*  NOT VERIFIED (fail / error)                                        */
/* ================================================================== */
function FailState({ trackingId }: { trackingId: string }) {
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  function handleReportSubmit() {
    // TODO: wire up to real reporting API
    setReportSubmitted(true);
  }

  return (
    <div className="flex flex-col items-center px-4 py-12 gap-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100">
          <ShieldX className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-red-700">NOT VERIFIED</h1>
        <p className="text-slate-600 max-w-md">
          The tracking ID <strong className="font-mono">{trackingId}</strong> could
          not be verified. This product may be counterfeit or unregistered.
        </p>
      </div>

      {/* Warning */}
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-red-800">
                Do not consume this product
              </p>
              <p className="text-sm text-red-700">
                Unverified products may pose serious health risks. Please take the
                following steps:
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What to do */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>What to Do</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                Contact the retailer where you purchased the product and request
                proof of authenticity.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                Report suspected counterfeit products to{' '}
                <a
                  href="https://www.sahpra.org.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B3A5C] underline underline-offset-2"
                >
                  SAHPRA
                </a>
                .
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                Call the NCTS hotline:{' '}
                <a
                  href="tel:08006287"
                  className="font-semibold text-[#1B3A5C] underline underline-offset-2"
                >
                  0800-NCTS (6287)
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
              <span>
                Dispose of the product safely and do not share it with others.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Report suspicious product */}
      {!reportSubmitted ? (
        <div className="w-full flex flex-col gap-3">
          {!showReport ? (
            <Button
              variant="destructive"
              className="w-full gap-2 bg-transparent border border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowReport(true)}
            >
              <AlertTriangle className="w-4 h-4" />
              Report Suspicious Product
            </Button>
          ) : (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">Report This Product</CardTitle>
                <CardDescription>
                  Provide details about where and how you obtained this product.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={4}
                  placeholder="Describe the product, retailer, location…"
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A5C] focus-visible:ring-offset-2"
                />
              </CardContent>
              <CardFooter className="gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowReport(false);
                    setReportText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!reportText.trim()}
                  onClick={handleReportSubmit}
                >
                  Submit Report
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      ) : (
        <Card className="w-full border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 text-center">
            <p className="font-semibold text-emerald-800">
              Report submitted successfully. Thank you.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Back */}
      <Link
        to="/"
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2')}
      >
        <ArrowLeft className="w-4 h-4" />
        Verify Another Product
      </Link>
    </div>
  );
}

export default VerifyPage;
