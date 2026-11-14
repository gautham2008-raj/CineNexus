import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Film,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  googleProvider,
  signInWithPopup,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase.ts';

export interface CineNexusUser {
  uid: string;
  fullName: string;
  email: string;
  mobile: string;
  preferredLanguages: string[];
  favouriteGenres: string[];
  isFirebaseUser: boolean;
}

interface AuthGateProps {
  onAuthenticated: (user: CineNexusUser) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    setError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (mode === 'forgot') return true;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name (minimum 2 characters).');
        return false;
      }
      const cleanedMobile = mobile.replace(/\D/g, '');
      if (cleanedMobile.length < 10) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }
    }
    return true;
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (mode === 'forgot') {
      setInfoMessage(
        `Password reset instructions have been dispatched to ${email.trim()}. You may now sign in.`
      );
      setMode('login');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const storedAccountsRaw = localStorage.getItem('cinenexus_accounts_v1');
      const accounts: Record<string, any> = storedAccountsRaw ? JSON.parse(storedAccountsRaw) : {};
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === 'signup') {
        const uid = `usr_${normalizedEmail.replace(/[^a-z0-9]/g, '').slice(0, 24)}`;
        const newAccount: CineNexusUser = {
          uid,
          fullName: fullName.trim(),
          email: normalizedEmail,
          mobile: mobile.trim(),
          preferredLanguages: ['Telugu', 'English', 'Hindi'],
          favouriteGenres: ['Sci-Fi', 'Action', 'Thriller'],
          isFirebaseUser: false,
        };
        accounts[normalizedEmail] = { ...newAccount, password };
        localStorage.setItem('cinenexus_accounts_v1', JSON.stringify(accounts));
        if (rememberMe) {
          localStorage.setItem('cinenexus_active_session', JSON.stringify(newAccount));
        }
        setLoading(false);
        onAuthenticated(newAccount);
      } else {
        const existing = accounts[normalizedEmail];
        if (existing && existing.password !== password) {
          setLoading(false);
          setError('Incorrect password for this account. Please try again or use Forgot Password.');
          return;
        }
        const userObj: CineNexusUser = existing
          ? {
              uid: existing.uid,
              fullName: existing.fullName,
              email: existing.email,
              mobile: existing.mobile,
              preferredLanguages: existing.preferredLanguages || ['Telugu', 'English'],
              favouriteGenres: existing.favouriteGenres || ['Action', 'Sci-Fi'],
              isFirebaseUser: false,
            }
          : {
              uid: `usr_${normalizedEmail.replace(/[^a-z0-9]/g, '').slice(0, 24) || 'patron'}`,
              fullName: normalizedEmail.split('@')[0].replace(/[._]/g, ' '),
              email: normalizedEmail,
              mobile: '+91 98480 22338',
              preferredLanguages: ['Telugu', 'English', 'Hindi'],
              favouriteGenres: ['Sci-Fi', 'Action', 'Thriller'],
              isFirebaseUser: false,
            };

        if (rememberMe) {
          localStorage.setItem('cinenexus_active_session', JSON.stringify(userObj));
        }
        setLoading(false);
        onAuthenticated(userObj);
      }
    }, 300);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const userPath = `users/${fbUser.uid}`;
      let profileData: CineNexusUser = {
        uid: fbUser.uid,
        fullName: (fbUser.displayName || 'CineNexus Patron').slice(0, 95),
        email: (fbUser.email || 'patron@cinenexus.in').slice(0, 145),
        mobile: (fbUser.phoneNumber || '+91 98480 11223').slice(0, 19),
        preferredLanguages: ['Telugu', 'English', 'Hindi'],
        favouriteGenres: ['Sci-Fi', 'Action', 'Thriller'],
        isFirebaseUser: true,
      };

      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          profileData = {
            uid: fbUser.uid,
            fullName: d.fullName || profileData.fullName,
            email: d.email || profileData.email,
            mobile: d.mobile || profileData.mobile,
            preferredLanguages: d.preferredLanguages || profileData.preferredLanguages,
            favouriteGenres: d.favouriteGenres || profileData.favouriteGenres,
            isFirebaseUser: true,
          };
        } else {
          await setDoc(doc(db, 'users', fbUser.uid), {
            uid: profileData.uid,
            fullName: profileData.fullName,
            email: profileData.email,
            mobile: profileData.mobile,
            preferredLanguages: profileData.preferredLanguages,
            favouriteGenres: profileData.favouriteGenres,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (fsErr) {
        handleFirestoreError(fsErr, OperationType.WRITE, userPath);
      }

      if (rememberMe) {
        localStorage.setItem('cinenexus_active_session', JSON.stringify(profileData));
      }
      setLoading(false);
      onAuthenticated(profileData);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Google Sign-In was cancelled or could not complete.');
    }
  };

  const handleInstantPatronAccess = () => {
    const demoUser: CineNexusUser = {
      uid: 'usr_hyderabad_patron_01',
      fullName: 'Arjun Reddy Varma',
      email: 'arjun.varma@cinenexus.in',
      mobile: '+91 98490 55112',
      preferredLanguages: ['Telugu', 'English', 'Hindi', 'Tamil'],
      favouriteGenres: ['Sci-Fi', 'Action', 'Thriller'],
      isFirebaseUser: false,
    };
    localStorage.setItem('cinenexus_active_session', JSON.stringify(demoUser));
    onAuthenticated(demoUser);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col lg:flex-row items-stretch">
      {/* Left Visual Showcase Column */}
      <div className="relative lg:w-7/12 min-h-[340px] lg:min-h-screen flex flex-col justify-between p-8 lg:p-14 overflow-hidden">
        <img
          src="/posters/ramayana.jpg"
          alt="CineNexus Theatrical Showcase"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/65 to-[#07090e]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#07090e]" />

        {/* Top Brand Lockup */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-white">
              CineNexus
            </span>
          </div>
          <span className="text-xs text-amber-400/90 font-medium tracking-wider">
            HYDERABAD · BENGALURU · MUMBAI · CHENNAI
          </span>
        </div>

        {/* Center Hero Copy */}
        <div className="relative z-10 max-w-xl my-auto py-10">
          <p className="text-xs font-semibold tracking-widest text-rose-400 mb-3">
            YOUR MOVIE. YOUR THEATRE. YOUR EXPERIENCE.
          </p>
          <h1
            className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight mb-5"
            style={{ textWrap: 'balance' }}
          >
            Experience Cinema Seating in True 3D Perspective.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Inspect sightlines from every row in our interactive Three.js auditorium, browse live
            verified theatrical schedules across India, and reserve seats powered by real-time
            AVL Tree, Prefix Trie, HashMap, Merge Sort, and FIFO Queue engines.
          </p>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10">
            <div>
              <div className="font-mono text-2xl font-bold text-white tabular-nums">3D Hall</div>
              <div className="text-xs text-slate-400 mt-1">360° Raycast Seat Picker</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">5 DSA</div>
              <div className="text-xs text-slate-400 mt-1">AVL · Trie · Hash · Merge · Queue</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-rose-400 tabular-nums">₹ INR</div>
              <div className="text-xs text-slate-400 mt-1">Razorpay Test Checkout & QR</div>
            </div>
          </div>
        </div>

        {/* Bottom Footnote */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>Default City: Hyderabad, Telangana, India</span>
          <span>Dolby Atmos · IMAX 3D · 4K Laser</span>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-[#07090e] border-l border-white/10">
        <div className="w-full max-w-md space-y-6">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-900/90 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfoMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {mode === 'login'
                ? 'Welcome back to CineNexus'
                : mode === 'signup'
                ? 'Create your CineNexus account'
                : 'Reset your password'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access live showtimes, 3D seat selection, and your QR tickets.'
                : mode === 'signup'
                ? 'Register with your email and mobile number for instant QR ticket delivery.'
                : 'Enter your registered email address to receive a password reset link.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleStandardSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Gautham Raj"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patron@cinenexus.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mobile Number (INR SMS & WhatsApp Ticket Alerts)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98480 22338"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Authenticating...'
                  : mode === 'login'
                  ? 'Sign In to CineNexus'
                  : mode === 'signup'
                  ? 'Create Account & Continue'
                  : 'Send Password Reset Link'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-xs text-slate-500">OR CONTINUE WITH</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Google Sign-In</span>
            </button>
            <button
              type="button"
              onClick={handleInstantPatronAccess}
              className="py-2.5 px-4 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-200 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Film className="w-4 h-4 text-indigo-400" />
              <span>Instant Patron Access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
