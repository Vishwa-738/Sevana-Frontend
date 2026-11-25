import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Clock,
  Check,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button, Input, Alert } from '../components/ui';
import { useAppContext } from '../context';
import { apiClient } from '../api';
import customLogo from '../Logo/logo.png';
import floodBg from '../Logo/sri-lanka-floods-2016-1239766130.jpg';

/* Atmospheric flood-rescue photo background with dark navy gradient overlay */
function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#0D1B2E]">
      {/* Embedded animation keyframes */}
      <style>{`
        @keyframes authFadeSlideUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes authCheckPop {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-auth-content {
          animation: authFadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-check-pop {
          animation: authCheckPop 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Background Image Layer (slight blur + scale keeps 624x351 crisp on large screens) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat scale-105 blur-[2px]"
        style={{ backgroundImage: `url(${floodBg})` }}
      />

      {/* Deep Navy / Royal Blue Gradient Overlay for contrast and readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-[#0B1528]/80 via-[#152C5B]/70 to-[#0B1528]/85"
      />

      {/* Subtle ambient glow accents */}
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-[#3366FF]/20 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#1C1E53]/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

/* Brand header inside the card with high-contrast oval badge and larger logo */
function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-3.5 group cursor-pointer focus:outline-none"
    >
      <div
        className={`flex items-center justify-center rounded-full px-3.5 py-2 transition-transform duration-200 group-hover:scale-105 ${
          dark
            ? 'bg-[#1C1E53]/45 border border-white/25 shadow-md backdrop-blur-sm'
            : 'bg-gradient-to-br from-[#1C1E53] to-[#274B9F] shadow-md shadow-[#1C1E53]/25 ring-2 ring-[#3366FF]/15'
        }`}
      >
        <img
          src={customLogo}
          alt="සෙවණ Logo"
          className="h-12 w-auto object-contain drop-shadow-sm"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-10 h-10 rounded-full flex items-center justify-center text-white">
          <ShieldCheck size={24} />
        </div>
      </div>
      <span
        className={`text-2xl font-bold tracking-tight font-sinhala ${
          dark ? 'text-white' : 'text-[#1E2046]'
        }`}
      >
        
      </span>
    </Link>
  );
}

/* Unified Animated Login / Register Card */
function AnimatedAuthCard({ initialMode }: { initialMode: 'login' | 'register' }) {
  const navigate = useNavigate();
  const { login } = useAppContext();

  const [isRegister, setIsRegister] = useState(initialMode === 'register');

  // Sync if route switches externally
  useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  const toggleMode = (toRegister: boolean) => {
    setIsRegister(toRegister);
    setLoginError('');
    setNeedsOtpVerification(false);
    setRegError('');
    // Keep URL in sync without unmounting the component so the expand/collapse animation runs smoothly
    window.history.replaceState(null, '', toRegister ? '/register' : '/login');
  };

  // ==================== LOGIN STATE & LOGIC ====================
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [needsOtpVerification, setNeedsOtpVerification] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false });

  const handleOpenOtpFromLogin = () => {
    setRegForm((f) => ({ ...f, email: loginForm.email.trim() }));
    setOtp(['', '', '', '', '', '']);
    setTimeLeft(600);
    setRegError('');
    setLoginError('');
    setNeedsOtpVerification(false);
    setStep('otp');
    setIsRegister(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please fill in all fields.');
      return;
    }

    setLoginError('');
    setNeedsOtpVerification(false);
    setLoginLoading(true);

    try {
      const response = await apiClient('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      const rawRole = String(response.user?.role || response.user?.Role);

      let normalizedRole = 'Citizen';
      if (rawRole.toLowerCase() === 'admin' || rawRole === '1') normalizedRole = 'Admin';
      else if (rawRole.toLowerCase() === 'coordinator' || rawRole === '2') normalizedRole = 'Coordinator';
      else if (rawRole.toLowerCase() === 'shelteradmin') normalizedRole = 'ShelterAdmin';
      else if (rawRole.toLowerCase() === 'logisticsmanager' || rawRole.toLowerCase() === 'resourcemgr') normalizedRole = 'LogisticsManager';
      else if (rawRole.toLowerCase() === 'citizen' || rawRole === '3') normalizedRole = 'Citizen';
      else normalizedRole = rawRole;

      const normalizedUser = {
        ...response.user,
        role: normalizedRole,
      };

      login(response.token, normalizedUser);

      // Show the checkmark button animation before navigating
      setLoginSuccess(true);
      setTimeout(() => {
        if (normalizedRole === 'Admin' || normalizedRole === 'Coordinator') {
          navigate('/dashboard');
        } else if (normalizedRole === 'ShelterAdmin') {
          navigate('/shelters');
        } else if (normalizedRole === 'LogisticsManager') {
          navigate('/resources');
        } else if (normalizedRole === 'Volunteer') {
          navigate('/citizen');
        } else {
          navigate('/citizen');
        }
      }, 750);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setLoginError(msg);
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('verify your account')) {
        setNeedsOtpVerification(true);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ==================== REGISTER & OTP STATE & LOGIC ====================
  const [regLoading, setRegLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [regError, setRegError] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'citizen',
    password: '',
    confirm: '',
  });

  // OTP State & 10-minute (600s) Countdown
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== 'otp' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  useEffect(() => {
    if (step !== 'success') return;
    const redirectTimer = setTimeout(() => {
      setStep('form');
      toggleMode(false);
    }, 3000);
    return () => clearTimeout(redirectTimer);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(0[1-9][0-9]{8}|\+94[1-9][0-9]{8})$/.test(cleaned);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regForm.name || !regForm.email || !regForm.phone || !regForm.password || !regForm.confirm) {
      setRegError('Please fill in all required fields.');
      return;
    }
    if (!validateEmail(regForm.email)) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!validatePhone(regForm.phone)) {
      setRegError('Please enter a valid Sri Lankan phone number (e.g., 0771234567).');
      return;
    }
    if (regForm.password.length < 8) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }
    if (regForm.password !== regForm.confirm) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegError('');
    setRegLoading(true);

    try {
      await apiClient('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regForm.name,
          email: regForm.email,
          phone: regForm.phone,
          role: 'Citizen',
          password: regForm.password,
        }),
      });

      setOtp(['', '', '', '', '', '']);
      setTimeLeft(600);
      setStep('otp');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    for (let idx = 0; idx < pasted.length; idx++) {
      next[idx] = pasted[idx];
    }
    setOtp(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (timeLeft <= 0) {
      setRegError('This verification code has expired. Please register again to receive a new code.');
      return;
    }

    const code = otp.join('');
    if (code.length !== 6) {
      setRegError('Please enter the full 6-digit verification code.');
      return;
    }

    setRegLoading(true);
    setRegError('');
    try {
      await apiClient('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: regForm.email,
          code: code,
        }),
      });
      setStep('success');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('expired')) {
        setRegError('Your verification code has expired. Please request a new one.');
      } else {
        setRegError(msg || 'Invalid verification code. Please check your email and try again.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const isExpired = timeLeft <= 0;

  return (
    <AuthBackground>
      {/* Layered Card Wrapper */}
      <div className="relative w-full">
        {/* Subtle stacked card peeking beneath */}
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-3 h-10 rounded-2xl bg-white/25 backdrop-blur-md shadow-[0_14px_30px_rgba(0,0,0,0.25)] transition-all duration-500"
        />

        {/* Main Card */}
        <div
          className={`relative w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_28px_70px_rgba(0,0,0,0.45)] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            isRegister ? 'min-h-[620px]' : 'min-h-[510px]'
          }`}
        >
          {/* ================= WHITE LOGIN LAYER ================= */}
          <div
            className={`p-8 sm:p-10 transition-all duration-300 ${
              isRegister ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'
            }`}
          >
            <div className="mb-6">
              <BrandMark />
            </div>

            <h1 className="text-[26px] font-bold text-[#1E2046] font-[Outfit] tracking-tight mb-7">
              Log In to <span className="font-sinhala"></span>
            </h1>

            {loginError && (
              <div className="mb-4 space-y-2">
                <Alert
                  type="error"
                  message={loginError}
                  onClose={() => {
                    setLoginError('');
                    setNeedsOtpVerification(false);
                  }}
                />
                {needsOtpVerification && (
                  <button
                    type="button"
                    onClick={handleOpenOtpFromLogin}
                    className="w-full h-10 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-xs font-semibold text-[#1D4ED8] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail size={14} />
                    <span>Verify Account with OTP</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* E-Mail */}
              <div>
                <label className="block text-xs font-semibold text-[#5A6A85] mb-1.5">
                  E-Mail
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full h-12 pl-4 pr-11 rounded-lg border-[1.5px] border-[#D8E1EE] bg-white text-sm text-[#1E2046] placeholder-[#A0AEC0] focus:outline-none focus:border-[#3366FF] focus:ring-4 focus:ring-[#3366FF]/10 transition-all duration-200"
                  />
                  <Mail
                    size={17}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] group-focus-within:text-[#3366FF] transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[#5A6A85] mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showLoginPwd ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full h-12 pl-4 pr-11 rounded-lg border-[1.5px] border-[#D8E1EE] bg-white text-sm text-[#1E2046] placeholder-[#A0AEC0] focus:outline-none focus:border-[#3366FF] focus:ring-4 focus:ring-[#3366FF]/10 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPwd((v) => !v)}
                    aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#3366FF] transition-colors cursor-pointer"
                  >
                    {showLoginPwd ? <EyeOff size={17} /> : <Lock size={17} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={(e) => setLoginForm((f) => ({ ...f, remember: e.target.checked }))}
                    className="w-4 h-4 rounded border-[#CBD8E6] text-[#3366FF] focus:ring-[#3366FF]"
                  />
                  <span className="text-xs text-[#64748B]">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="text-xs font-semibold text-[#3366FF] hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </div>

              {/* SIGN IN Button with morphing checkmark success animation */}
              <button
                type="submit"
                disabled={loginLoading || loginSuccess}
                className={`w-full h-12 rounded-lg font-bold text-xs tracking-[0.14em] uppercase text-white flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-md active:scale-[0.99] disabled:cursor-not-allowed ${
                  loginSuccess
                    ? 'bg-[#3366FF] shadow-[#3366FF]/35'
                    : 'bg-[#1C1E53] hover:bg-[#151742] shadow-[#1C1E53]/25'
                }`}
              >
                {loginSuccess ? (
                  <Check size={22} strokeWidth={3} className="text-white animate-check-pop" />
                ) : loginLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              {/* Forgot password link */}
              <div className="text-center pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#94A3B8] hover:text-[#3366FF] transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Citizen Portal Quick Access */}
              <div className="pt-3 border-t border-[#EEF2F7]">
                <button
                  type="button"
                  onClick={() => navigate('/citizen')}
                  className="w-full h-10 rounded-lg border border-[#DCE4F0] text-xs font-semibold text-[#1E2046] hover:bg-[#F6F9FE] hover:border-[#3366FF]/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Continue to Citizen Portal</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* ================= EXPANDING ROYAL BLUE OVERLAY (REGISTER / OTP) ================= */}
          <div
            className={`absolute z-20 bg-[#3366FF] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] overflow-hidden ${
              isRegister
                ? 'inset-0 rounded-2xl shadow-[0_24px_60px_rgba(51,102,255,0.4)]'
                : '-top-5 -right-5 w-[84px] h-[84px] rounded-2xl shadow-[0_14px_32px_rgba(51,102,255,0.5)] hover:scale-105 hover:bg-[#2958EB] cursor-pointer'
            }`}
            onClick={() => {
              if (!isRegister) toggleMode(true);
            }}
            role={!isRegister ? 'button' : undefined}
            aria-label={!isRegister ? 'Switch to Sign Up' : undefined}
            title={!isRegister ? 'Sign Up for සෙවණ' : undefined}
          >
            {/* Top-right morphing 3-bars <-> X Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isRegister) {
                  setStep('form');
                  toggleMode(false);
                } else {
                  toggleMode(true);
                }
              }}
              aria-label={isRegister ? 'Close Sign Up and return to Login' : 'Open Sign Up'}
              className={`absolute z-30 flex items-center justify-center cursor-pointer transition-all duration-500 ${
                isRegister
                  ? 'top-6 right-6 w-10 h-10 rounded-xl hover:bg-white/15'
                  : 'inset-0 w-full h-full'
              }`}
            >
              <div className="relative w-6 h-5 flex flex-col justify-between items-start">
                <span
                  className={`block h-[2.5px] bg-white rounded-full transition-all duration-400 origin-center ${
                    isRegister
                      ? 'w-6 translate-y-[8.5px] rotate-45'
                      : 'w-6'
                  }`}
                />
                <span
                  className={`block h-[2.5px] bg-white rounded-full transition-all duration-300 ${
                    isRegister ? 'w-0 opacity-0' : 'w-4'
                  }`}
                />
                <span
                  className={`block h-[2.5px] bg-white rounded-full transition-all duration-400 origin-center ${
                    isRegister
                      ? 'w-6 -translate-y-[8.5px] -rotate-45'
                      : 'w-2.5'
                  }`}
                />
              </div>
            </button>

            {/* Expanded Blue Sign Up / OTP / Success Content */}
            {isRegister && (
              <div className="h-full w-full p-8 sm:p-9 text-white overflow-y-auto animate-auth-content">
                <div className="mb-5">
                  <BrandMark dark />
                </div>

                {/* STEP 1: REGISTER FORM */}
                {step === 'form' && (
                  <div>
                    <h2 className="text-[24px] font-bold font-[Outfit] tracking-tight mb-5">
                      Sign Up For Free, Now.
                    </h2>

                    {regError && (
                      <div className="mb-4 rounded-xl bg-red-500/20 border border-white/30 px-3.5 py-2.5 text-xs text-white flex items-center justify-between gap-2">
                        <span>{regError}</span>
                        <button
                          type="button"
                          onClick={() => setRegError('')}
                          className="text-white/80 hover:text-white font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Your full name"
                            value={regForm.name}
                            onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-white/45 bg-white/10 text-sm text-white placeholder-white/55 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                          />
                          <User size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1">
                          E-Mail
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="you@example.com"
                            value={regForm.email}
                            onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                            className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-white/45 bg-white/10 text-sm text-white placeholder-white/55 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                          />
                          <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-white/80 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="+94 77 123 4567"
                            value={regForm.phone}
                            onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                            className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-white/45 bg-white/10 text-sm text-white placeholder-white/55 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                          />
                          <Phone size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-white/80 mb-1">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showRegPwd ? 'text' : 'password'}
                              placeholder="Min. 8 chars"
                              value={regForm.password}
                              onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                              className="w-full h-10 pl-3 pr-9 rounded-lg border border-white/45 bg-white/10 text-sm text-white placeholder-white/55 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPwd((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
                            >
                              {showRegPwd ? <EyeOff size={15} /> : <Lock size={15} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-white/80 mb-1">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              type={showRegConfirm ? 'text' : 'password'}
                              placeholder="Re-enter"
                              value={regForm.confirm}
                              onChange={(e) => setRegForm((f) => ({ ...f, confirm: e.target.value }))}
                              className="w-full h-10 pl-3 pr-9 rounded-lg border border-white/45 bg-white/10 text-sm text-white placeholder-white/55 focus:outline-none focus:border-white focus:bg-white/15 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegConfirm((v) => !v)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white cursor-pointer"
                            >
                              {showRegConfirm ? <EyeOff size={15} /> : <Lock size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full h-11 mt-2 rounded-lg bg-white text-[#1C1E53] font-bold text-xs tracking-[0.14em] uppercase hover:bg-white/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 cursor-pointer disabled:opacity-70"
                      >
                        {regLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <span>Create Account</span>
                        )}
                      </button>

                      <p className="text-center text-xs text-white/75 pt-1">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => toggleMode(false)}
                          className="text-white font-semibold underline underline-offset-2 hover:text-white/90 cursor-pointer"
                        >
                          Sign in
                        </button>
                      </p>
                    </form>
                  </div>
                )}

                {/* STEP 2: EMAIL OTP VERIFICATION */}
                {step === 'otp' && (
                  <div className="space-y-5 animate-auth-content">
                    <div>
                      <h2 className="text-[24px] font-bold font-[Outfit] tracking-tight">
                        Verify Your Email
                      </h2>
                      <p className="text-xs text-white/75 mt-1">
                        Enter the 6-digit code sent to your inbox
                      </p>
                    </div>

                    {regError && (
                      <div className="rounded-xl bg-red-500/25 border border-white/35 px-3.5 py-2.5 text-xs text-white flex items-center justify-between gap-2">
                        <span>{regError}</span>
                        <button
                          type="button"
                          onClick={() => setRegError('')}
                          className="text-white/80 hover:text-white font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-3.5 bg-white/15 rounded-xl border border-white/25 text-xs text-white">
                      <Mail size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">A verification code has been sent to your email address.</p>
                        <p className="text-white/80 mt-0.5">
                          Check <strong>{regForm.email}</strong> (including spam).
                        </p>
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-center gap-2 text-xs font-medium ${
                        isExpired ? 'text-red-200' : 'text-white/85'
                      }`}
                    >
                      <Clock size={15} />
                      {isExpired ? (
                        <span>Verification code expired</span>
                      ) : (
                        <span>
                          Code expires in{' '}
                          <strong className="font-mono text-white">{formatTime(timeLeft)}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 justify-center py-1">
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          maxLength={1}
                          inputMode="numeric"
                          disabled={isExpired || regLoading}
                          className="w-11 h-13 text-center text-lg font-bold border-2 border-white/50 rounded-xl focus:outline-none focus:border-white bg-white/15 text-white shadow-sm disabled:opacity-45 transition-all"
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isExpired || regLoading}
                      onClick={handleVerifyOtp}
                      className="w-full h-11 rounded-lg bg-white text-[#1C1E53] font-bold text-xs tracking-[0.14em] uppercase hover:bg-white/95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {regLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify</span>
                      )}
                    </button>

                    <p className="text-center text-xs text-white/75">
                      Entered the wrong email?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setStep('form');
                          setRegError('');
                        }}
                        className="text-white font-semibold underline cursor-pointer"
                      >
                        Go back
                      </button>
                    </p>
                  </div>
                )}

                {/* STEP 3: VERIFICATION SUCCESS */}
                {step === 'success' && (
                  <div className="text-center py-10 space-y-5 animate-auth-content">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-check-pop">
                      <CheckCircle size={42} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-[Outfit]">Email Verified!</h2>
                      <p className="text-xs text-white/80 mt-2 leading-relaxed">
                        Your account is now active. Redirecting you to the login screen...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('form');
                        toggleMode(false);
                      }}
                      className="w-full h-11 rounded-lg bg-white text-[#1C1E53] font-bold text-xs tracking-[0.14em] uppercase hover:bg-white/95 transition-all shadow-lg cursor-pointer"
                    >
                      Continue to Login
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle back-to-home link underneath card (light text for dark photo backdrop) */}
      <Link
        to="/"
        className="mt-7 inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors drop-shadow-sm"
      >
        <ArrowLeft size={14} />
        Back to Home
      </Link>
    </AuthBackground>
  );
}

export function Login() {
  return <AnimatedAuthCard initialMode="login" />;
}

export function Register() {
  return <AnimatedAuthCard initialMode="register" />;
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <AuthBackground>
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-3 h-10 rounded-2xl bg-white/25 backdrop-blur-md shadow-[0_14px_30px_rgba(0,0,0,0.25)]"
        />
        <div className="relative w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_28px_70px_rgba(0,0,0,0.45)] p-8 sm:p-10">
          <div className="mb-6">
            <BrandMark />
          </div>
          <h1 className="text-2xl font-bold text-[#1E2046] font-[Outfit] mb-1">Reset your password</h1>
          <p className="text-[#64748B] text-xs mb-6">Enter your email to receive reset instructions</p>

          {!sent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-4"
            >
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" size="lg">
                Send Reset Link
              </Button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-xs text-[#64748B] hover:text-[#3366FF] pt-1"
              >
                <ArrowLeft size={14} /> Back to login
              </Link>
            </form>
          ) : (
            <div className="text-center py-6 animate-auth-content">
              <div className="w-16 h-16 bg-[#EFF6FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#3366FF]" />
              </div>
              <h3 className="font-semibold text-[#1E2046] mb-2">Check your email</h3>
              <p className="text-xs text-[#64748B] mb-6">
                We sent password reset instructions to <strong>{email}</strong>
              </p>
              <Link to="/login" className="text-xs font-semibold text-[#3366FF] hover:underline">
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </AuthBackground>
  );
}

export function TwoFactor() {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  return (
    <AuthBackground>
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-3 h-10 rounded-2xl bg-white/25 backdrop-blur-md shadow-[0_14px_30px_rgba(0,0,0,0.25)]"
        />
        <div className="relative w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_28px_70px_rgba(0,0,0,0.45)] p-8 sm:p-10">
          <div className="mb-6">
            <BrandMark />
          </div>
          <h1 className="text-2xl font-bold text-[#1E2046] font-[Outfit] mb-1">Two-Factor Authentication</h1>
          <p className="text-[#64748B] text-xs mb-6">Enter the 6-digit code from your authenticator app</p>

          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] text-xs text-[#1D4ED8]">
              <Smartphone size={16} />
              <span>Code sent to +94 77 *** 4567</span>
            </div>
            <div className="flex gap-2 justify-center">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  maxLength={1}
                  className="w-11 h-12 text-center text-lg font-bold border-2 rounded-xl focus:outline-none focus:border-[#3366FF] transition-colors bg-white text-[#1E2046]"
                />
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={() => navigate('/dashboard')}>
              Verify
            </Button>
            <p className="text-center text-xs text-[#64748B]">
              Didn't receive code? <button className="text-[#3366FF] hover:underline">Resend in 45s</button>
            </p>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}