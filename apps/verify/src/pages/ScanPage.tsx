import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Flashlight,
  FlashlightOff,
  Camera,
  CameraOff,
  Search,
  SwitchCamera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * BarcodeDetector is available natively in Chrome & Edge.
 * For Safari and Firefox a polyfill such as the `barcode-detector` npm
 * package is required — add it and import before first use.
 */
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => {
      detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
    };
  }
}

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported';

/** Extract an NCTS tracking ID from a scanned QR value (URL or raw ID). */
function extractTrackingId(raw: string): string | null {
  // Match both legacy format (PLT/TRF/SAL-YYYYMMDD-XXXX) and NCTS format (NCTS-ZA-YYYY-NNNNNN)
  const match = raw.match(/\b(PLT|TRF|SAL)-\d{8}-[A-Z0-9]{3,6}\b/i)
    || raw.match(/\bNCTS-ZA-\d{4}-\d{4,8}\b/i);
  return match ? match[0]!.toUpperCase() : null;
}

function ScanPage() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState('');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanError, setScanError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const scanActiveRef = useRef(false);

  /* ---- helpers ---- */

  function cleanupStream() {
    scanActiveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchSupported(false);
    setTorchOn(false);
  }

  function beginQrDetection(video: HTMLVideoElement) {
    if (!window.BarcodeDetector) {
      setScanError(
        'QR scanning is not supported in this browser. Please enter the ID manually below.',
      );
      return;
    }

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    scanActiveRef.current = true;

    const loop = async () => {
      if (!scanActiveRef.current) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        try {
          const results = await detector.detect(video);
          if (results.length > 0 && results[0]) {
            const id = extractTrackingId(results[0].rawValue);
            if (id) {
              scanActiveRef.current = false;
              navigator.vibrate?.(200);
              cleanupStream();
              navigate(`/verify/${id}`);
              return;
            }
            setScanError('QR code not recognized. Try again or enter ID manually.');
          }
        } catch {
          /* frame-level detection error — continue scanning */
        }
      }
      if (scanActiveRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }

  async function openCamera(mode: 'environment' | 'user') {
    cleanupStream();
    setCameraState('requesting');
    setScanError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      /* Check torch availability via ImageCapture API */
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = track.getCapabilities?.() as
            | (MediaTrackCapabilities & { torch?: boolean })
            | undefined;
          if (caps?.torch) setTorchSupported(true);
        } catch {
          /* torch capability check not available */
        }
      }

      setCameraState('active');
      if (videoRef.current) beginQrDetection(videoRef.current);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setCameraState('denied');
      } else if (e.name === 'NotFoundError' || e.name === 'NotReadableError') {
        setCameraState('unsupported');
      } else {
        setCameraState('denied');
        setScanError('Could not access the camera. Please try again.');
      }
    }
  }

  async function handleToggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      // torch is a non-standard constraint supported by Chrome on Android
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      /* torch toggle failed — device may not support it */
    }
  }

  function handleSwitchCamera() {
    const next: 'environment' | 'user' =
      facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    void openCamera(next);
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const id = manualId.trim();
    if (id) navigate(`/verify/${id}`);
  }

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      scanActiveRef.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const showManualOnly = cameraState === 'denied' || cameraState === 'unsupported';

  return (
    <div className="flex flex-col min-h-[80vh]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-1">
          {cameraState === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleSwitchCamera}
              aria-label="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={!torchSupported || cameraState !== 'active'}
            onClick={() => void handleToggleTorch()}
            aria-label={torchOn ? 'Turn off torch' : 'Turn on torch'}
          >
            {torchOn ? (
              <FlashlightOff className="w-4 h-4" />
            ) : (
              <Flashlight className="w-4 h-4" />
            )}
            Torch
          </Button>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-4 pt-6 pb-4 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Scan QR Code</h1>
        <p className="mt-1 text-sm text-slate-500">
          Point your camera at the QR code on the product
        </p>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm aspect-[4/3] rounded-xl border border-slate-300 overflow-hidden bg-black">
          {/* Video stream (always in DOM; visibility toggled) */}
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              cameraState !== 'active' && 'hidden',
            )}
            playsInline
            muted
          />

          {/* Scan-area overlay (visible when camera is live) */}
          {cameraState === 'active' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
              {/* Animated scan line */}
              <div className="absolute inset-x-8 top-8 bottom-8 overflow-hidden">
                <div className="animate-scan-line h-0.5 w-full bg-emerald-400/60 rounded-full" />
              </div>
            </div>
          )}

          {/* Idle / requesting overlay */}
          {(cameraState === 'idle' || cameraState === 'requesting') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-100">
              <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#1B3A5C] rounded-tl-md" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#1B3A5C] rounded-tr-md" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#1B3A5C] rounded-bl-md" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#1B3A5C] rounded-br-md" />

              <Camera className="w-10 h-10 text-slate-400" />
              <p className="text-sm text-slate-600 font-medium text-center px-6">
                Camera access is needed to scan the QR code on the product
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void openCamera(facingMode)}
                disabled={cameraState === 'requesting'}
              >
                {cameraState === 'requesting' ? (
                  <>
                    <Camera className="w-4 h-4 animate-pulse" />
                    Requesting access…
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Enable Camera
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Denied / unsupported overlay */}
          {showManualOnly && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-100 px-6">
              <CameraOff className="w-10 h-10 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {cameraState === 'denied'
                    ? 'Camera access was denied'
                    : 'Camera not available'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {cameraState === 'denied'
                    ? 'Allow camera access in your browser settings, or enter the tracking ID manually below.'
                    : 'Your device does not have a camera. Please enter the tracking ID manually below.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan error message */}
      {scanError && (
        <p className="text-sm text-amber-700 text-center px-4 mt-3">{scanError}</p>
      )}

      {/* Manual entry fallback (always visible) */}
      <div className="px-4 py-6 border-t border-slate-200 bg-white mt-4">
        <p className="text-sm text-slate-500 text-center mb-3">
          Or enter ID manually:
        </p>
        <form
          onSubmit={handleManualSubmit}
          className="flex gap-2 max-w-sm mx-auto"
        >
          <Input
            value={manualId}
            onChange={(e) => setManualId(e.target.value.toUpperCase())}
            placeholder="e.g. SAL-20260115-AB12"
            className="flex-1 font-mono"
            aria-label="Tracking ID"
            autoComplete="off"
          />
          <Button type="submit" size="default" className="gap-1.5 shrink-0">
            <Search className="w-4 h-4" />
            Verify
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ScanPage;
