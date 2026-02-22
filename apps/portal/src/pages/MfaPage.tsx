import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Alert, Input, Typography, Progress } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const NAVY = '#1B3A5C';
const DIGIT_COUNT = 6;
const TOTP_PERIOD = 30; // seconds

const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
`;

export default function MfaPage() {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(DIGIT_COUNT).fill(null));

  // TOTP 30-second countdown timer
  const [totpRemaining, setTotpRemaining] = useState(() => TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD));
  const [refreshedMsg, setRefreshedMsg] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD);
      setTotpRemaining(remaining);
      if (remaining === TOTP_PERIOD) {
        setRefreshedMsg(true);
        setTimeout(() => setRefreshedMsg(false), 2000);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const submitCode = useCallback((code: string) => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      if (code === '123456') {
        window.location.href = '/operator';
      } else {
        setError('Invalid verification code. Please try again.');
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        setDigits(Array(DIGIT_COUNT).fill(''));
        inputRefs.current[0]?.focus();
      }
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    const code = digits.join('');
    if (code.length === DIGIT_COUNT && digits.every((d) => d !== '')) {
      submitCode(code);
    }
  }, [digits, submitCode]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < DIGIT_COUNT; i++) {
      next[i] = pasted[i] || '';
    }
    setDigits(next);
    const focusIdx = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleRecoverySubmit = () => {
    if (!recoveryCode.trim()) return;
    setLoading(true);
    setError(null);
    setTimeout(() => {
      window.location.href = '/operator';
    }, 1000);
  };

  return (
    <>
      <style>{shakeKeyframes}</style>
      <>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: '0 0 4px', color: NAVY, fontWeight: 700 }}>
            Verification Required
          </Title>
          <Text type="secondary">
            {showRecovery
              ? 'Enter a recovery code to access your account'
              : 'Enter the 6-digit code from your authenticator app'}
          </Text>
        </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              padding: '32px 28px',
            }}
          >
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 20 }}
              />
            )}

            {!showRecovery ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 10,
                    marginBottom: 24,
                    animation: shaking ? 'shake 0.4s ease-in-out' : undefined,
                  }}
                >
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      style={{
                        width: 48,
                        height: 56,
                        textAlign: 'center',
                        fontSize: 24,
                        fontFamily: 'monospace',
                        border: '2px solid #E2E8F0',
                        borderRadius: 10,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = NAVY;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    />
                  ))}
                </div>

                {/* TOTP countdown timer */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Progress
                    type="circle"
                    percent={(totpRemaining / TOTP_PERIOD) * 100}
                    size={48}
                    format={() => `${totpRemaining}s`}
                    strokeColor={totpRemaining <= 5 ? '#f5222d' : NAVY}
                  />
                  {refreshedMsg && (
                    <Text style={{ display: 'block', marginTop: 4, color: '#52c41a', fontSize: 12 }}>
                      Code refreshed
                    </Text>
                  )}
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  loading={loading}
                  onClick={() => submitCode(digits.join(''))}
                  disabled={digits.some((d) => !d)}
                  style={{ height: 48, fontWeight: 600, background: NAVY, marginBottom: 16 }}
                >
                  Verify Code
                </Button>

                <div style={{ textAlign: 'center' }}>
                  <Button
                    type="link"
                    onClick={() => setShowRecovery(true)}
                    style={{ color: NAVY, fontSize: 13 }}
                  >
                    Can&apos;t access your app? Use a recovery code
                  </Button>
                </div>
              </>
            ) : (
              <>
                <TextArea
                  rows={3}
                  placeholder="Enter your recovery code"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  style={{ marginBottom: 16, fontFamily: 'monospace', fontSize: 14 }}
                />
                <Button
                  type="primary"
                  block
                  size="large"
                  loading={loading}
                  onClick={handleRecoverySubmit}
                  disabled={!recoveryCode.trim()}
                  style={{ height: 48, fontWeight: 600, background: NAVY, marginBottom: 16 }}
                >
                  Verify Recovery Code
                </Button>
                <div style={{ textAlign: 'center' }}>
                  <Button
                    type="link"
                    onClick={() => {
                      setShowRecovery(false);
                      setRecoveryCode('');
                    }}
                    style={{ color: NAVY, fontSize: 13 }}
                  >
                    Back to code entry
                  </Button>
                </div>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ color: NAVY, fontSize: 14 }}>
              <ArrowLeftOutlined style={{ marginRight: 6 }} />
              Back to sign in
            </Link>
          </div>
      </>
    </>
  );
}
