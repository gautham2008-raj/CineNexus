/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Search,
  RefreshCw,
  Clock,
  Star,
  Play,
  Bookmark,
  BookmarkCheck,
  Calendar,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  LogOut,
  Ticket,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AuthGate, CineNexusUser } from './components/AuthGate.tsx';
import { Auditorium3D } from './components/Auditorium3D.tsx';
import { TheatreMap } from './components/TheatreMap.tsx';
import { DigitalTicketModal } from './components/DigitalTicketModal.tsx';
import { DSAEngineRoom } from './components/DSAEngineRoom.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PBLDocumentation } from './components/PBLDocumentation.tsx';
import {
  BookingSummaryData,
  IndianCity,
  Movie,
  SeatInfo,
  ShowtimeSlot,
  Theatre,
} from './types/cinema.ts';
import {
  INDIAN_CITIES,
  getNextSevenDates,
} from './data/liveCinemaProvider.ts';
import {
  auth,
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  firebaseSignOut,
  handleFirestoreError,
  OperationType,
} from './lib/firebase.ts';

type NavTab = 'home' | 'map' | 'dsa' | 'docs' | 'admin' | 'profile';

export default function App() {
  // 1. Google Maps Platform Tier 2 Quota Warning State (Per google-maps-platform/SKILL.md Section 8 Case A)
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // 2. Authentication & Persistent User Session State
  const [currentUser, setCurrentUser] = useState<CineNexusUser | null>(() => {
    try {
      const saved = localStorage.getItem('cinenexus_active_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 3. Primary Navigation & City State (Default: Hyderabad, Telangana, India)
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCity, setSelectedCity] = useState<IndianCity>('Hyderabad');
  const [providerMode, setProviderMode] = useState<'verified' | 'strict_partner'>('verified');

  // 4. Live Movies, Theatres & Filtering State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [datesList, setDatesList] = useState(getNextSevenDates());
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string>(new Date().toISOString());
  const [providerMeta, setProviderMeta] = useState<any>(null);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(true);

  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('All');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('All');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<
    'now_showing' | 'trending' | 'popular_city' | 'recommended'
  >('now_showing');
  const [sortBy, setSortBy] = useState<string>('popularity');

  // 5. Prefix Trie Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [trieSuggestions, setTrieSuggestions] = useState<Movie[]>([]);
  const [trieTrace, setTrieTrace] = useState<{
    complexity: string;
    executionTimeUs: number;
  } | null>(null);

  // 6. Selected Movie Details & Step-by-Step Booking Flow State
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'schedule' | 'auditorium3d' | 'checkout'>('details');

  const [bookingLanguage, setBookingLanguage] = useState<string>('Telugu');
  const [bookingFormat, setBookingFormat] = useState<string>('Dolby Atmos');
  const [bookingDate, setBookingDate] = useState<string>(getNextSevenDates()[0]?.dateStr || '');
  const [bookingTheatre, setBookingTheatre] = useState<Theatre | null>(null);
  const [bookingShowtime, setBookingShowtime] = useState<ShowtimeSlot | null>(null);

  // 7. 3D Auditorium Seats & Atomic Lock / Payment State
  const [auditoriumSeats, setAuditoriumSeats] = useState<SeatInfo[]>([]);
  const [layoutSource, setLayoutSource] = useState<string>('CONFIGURABLE_3D_AUDITORIUM_MANIFEST');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [lockingInProgress, setLockingInProgress] = useState<boolean>(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [lockCountdownSec, setLockCountdownSec] = useState<number>(0);

  const [razorpayOrder, setRazorpayOrder] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking' | 'Wallet'>('UPI');
  const [upiIdInput, setUpiIdInput] = useState<string>('patron@okaxis');
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);

  // 8. Confirmed Bookings, Watchlist & Active Ticket Modal
  const [bookings, setBookings] = useState<BookingSummaryData[]>(() => {
    try {
      const raw = localStorage.getItem('cinenexus_bookings_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    try {
      const raw = localStorage.getItem('cinenexus_watchlist_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeTicketModal, setActiveTicketModal] = useState<BookingSummaryData | null>(null);

  // 9. Profile Edit State
  const [editFullName, setEditFullName] = useState(currentUser?.fullName || '');
  const [editMobile, setEditMobile] = useState(currentUser?.mobile || '');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEditFullName(currentUser.fullName);
      setEditMobile(currentUser.mobile);
    }
  }, [currentUser]);

  // Fetch Live Movies & Theatres from Backend
  const fetchLiveCinemaData = useCallback(
    async (refreshFlag: boolean = false) => {
      setLoadingMovies(true);
      try {
        const params = new URLSearchParams({
          city: selectedCity,
          language: selectedLanguageFilter,
          genre: selectedGenreFilter,
          sortBy,
          mode: providerMode,
          refresh: String(refreshFlag),
        });
        const [movRes, thRes] = await Promise.all([
          fetch(`/api/movies?${params.toString()}`),
          fetch(`/api/theatres?city=${encodeURIComponent(selectedCity)}`),
        ]);

        if (movRes.ok) {
          const movData = await movRes.json();
          setMovies(movData.movies || []);
          if (movData.dates) setDatesList(movData.dates);
          if (movData.meta) {
            setProviderMeta(movData.meta);
            setLastUpdatedIso(movData.meta.lastUpdatedIso || new Date().toISOString());
          }
        }
        if (thRes.ok) {
          const thData = await thRes.json();
          setTheatres(thData.theatres || []);
        }
      } catch (err) {
        console.error('Error loading live cinema data:', err);
      } finally {
        setLoadingMovies(false);
      }
    },
    [selectedCity, selectedLanguageFilter, selectedGenreFilter, sortBy, providerMode]
  );

  useEffect(() => {
    fetchLiveCinemaData(false);
  }, [fetchLiveCinemaData]);

  // Live Prefix Trie Autocomplete Lookup
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTrieSuggestions([]);
      setTrieTrace(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/movies/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setTrieSuggestions(data.matches || []);
          setTrieTrace(data.dsaTrace || null);
        }
      } catch (e) {
        console.error(e);
      }
    }, 90);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Seat Lock Countdown Timer
  useEffect(() => {
    if (!lockExpiresAt) {
      setLockCountdownSec(0);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setLockCountdownSec(rem);
      if (rem === 0 && bookingStep === 'checkout') {
        setPaymentFeedback({
          type: 'error',
          text: 'Your 5-minute temporary seat lock has expired. Please re-select your seats.',
        });
        setBookingStep('auditorium3d');
        setLockExpiresAt(null);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt, bookingStep]);

  // Open Movie Details & Initialize Booking Defaults
  const handleOpenMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setBookingLanguage(movie.languages[0] || 'Telugu');
    setBookingFormat(movie.formats[0] || '2D');
    const firstValidDate =
      datesList.find((d) => d.hasConfirmedShows)?.dateStr || datesList[0]?.dateStr || '';
    setBookingDate(firstValidDate);
    const defaultTheatre = theatres[0] || null;
    setBookingTheatre(defaultTheatre);
    const firstSlot = defaultTheatre?.showtimesByDate?.[firstValidDate]?.[0] || null;
    setBookingShowtime(firstSlot);
    setSelectedSeatIds([]);
    setBookingStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load 3D Auditorium Seats for Selected Showtime
  const handleEnter3DAuditorium = async (theatre: Theatre, slot: ShowtimeSlot) => {
    if (!selectedMovie) return;
    setBookingTheatre(theatre);
    setBookingShowtime(slot);
    setSelectedSeatIds([]);
    setPaymentFeedback(null);

    const showKey = `${selectedMovie.id}_${theatre.id}_${bookingDate}_${slot.id}`;
    try {
      const res = await fetch(
        `/api/seats?showKey=${encodeURIComponent(showKey)}&stdPrice=${slot.standardPriceInr}&execPrice=${slot.executivePriceInr}&vipPrice=${slot.vipReclinerPriceInr}`
      );
      if (res.ok) {
        const data = await res.json();
        setAuditoriumSeats(data.seats || []);
        setLayoutSource(data.layoutSource || 'CONFIGURABLE_3D_AUDITORIUM_MANIFEST');
      }
    } catch (e) {
      console.error(e);
    }
    setBookingStep('auditorium3d');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Seat in 3D / 2D Auditorium
  const handleToggleSeat = (seat: SeatInfo) => {
    if (seat.status !== 'available') return;
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 10) return prev; // Max 10 seats per booking
      return [...prev, seat.id];
    });
  };

  // Lock Seats Atomically via FIFO Queue & Create Razorpay INR Order
  const handleProceedToCheckout = async () => {
    if (!selectedMovie || !bookingTheatre || !bookingShowtime || !currentUser) return;
    const selectedSeatsObj = auditoriumSeats.filter((s) => selectedSeatIds.includes(s.id));
    if (selectedSeatsObj.length === 0) return;

    const subtotalInr = selectedSeatsObj.reduce((sum, s) => sum + s.priceInr, 0);
    const gstInr = Math.round(subtotalInr * 0.18);
    const convenienceFeeInr = selectedSeatsObj.length * 30;
    const totalAmountInr = subtotalInr + gstInr + convenienceFeeInr;
    const showKey = `${selectedMovie.id}_${bookingTheatre.id}_${bookingDate}_${bookingShowtime.id}`;

    setLockingInProgress(true);
    setPaymentFeedback(null);

    try {
      const lockRes = await fetch('/api/seats/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showKey,
          seatIds: selectedSeatIds,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          movieTitle: selectedMovie.title,
          theatreName: bookingTheatre.name,
          amountInr: totalAmountInr,
        }),
      });
      const lockData = await lockRes.json();
      if (!lockRes.ok) {
        setPaymentFeedback({
          type: 'error',
          text: lockData.error || 'Could not lock seats.',
        });
        setLockingInProgress(false);
        return;
      }

      setLockExpiresAt(lockData.expiresAt);

      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showKey,
          seatIds: selectedSeatIds,
          userId: currentUser.uid,
          subtotalInr,
          gstInr,
          convenienceFeeInr,
          totalAmountInr,
        }),
      });
      const orderData = await orderRes.json();
      if (orderRes.ok) {
        setRazorpayOrder(orderData);
        setBookingStep('checkout');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setPaymentFeedback({
        type: 'error',
        text: err?.message || 'Error initiating checkout.',
      });
    } finally {
      setLockingInProgress(false);
    }
  };

  // Verify Razorpay INR Payment (Success, Failed, or Cancelled)
  const handleVerifyPayment = async (simulateStatus: 'success' | 'failed' | 'cancelled') => {
    if (!selectedMovie || !bookingTheatre || !bookingShowtime || !currentUser || !razorpayOrder)
      return;

    const selectedSeatsObj = auditoriumSeats.filter((s) => selectedSeatIds.includes(s.id));
    const subtotalInr = selectedSeatsObj.reduce((sum, s) => sum + s.priceInr, 0);
    const gstInr = Math.round(subtotalInr * 0.18);
    const convenienceFeeInr = selectedSeatsObj.length * 30;
    const totalAmountInr = subtotalInr + gstInr + convenienceFeeInr;
    const showKey = `${selectedMovie.id}_${bookingTheatre.id}_${bookingDate}_${bookingShowtime.id}`;

    setPaymentProcessing(true);
    setPaymentFeedback(null);

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: razorpayOrder.orderId,
          paymentMethod: selectedPaymentMethod,
          showKey,
          seatIds: selectedSeatIds,
          userId: currentUser.uid,
          simulateStatus,
          bookingDetails: {
            movieTitle: selectedMovie.title,
            theatreName: bookingTheatre.name,
            totalAmountInr,
          },
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.verified) {
        setPaymentFeedback({
          type: 'error',
          text:
            verifyData.message ||
            verifyData.error ||
            'Payment could not be verified. Seat locks released.',
        });
        setPaymentProcessing(false);
        return;
      }

      const confirmedBooking: BookingSummaryData = {
        bookingId: verifyData.bookingId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        movie: selectedMovie,
        theatre: bookingTheatre,
        screenName: bookingShowtime.screenName,
        showDate: bookingDate,
        showTime: bookingShowtime.time,
        language: bookingLanguage,
        format: bookingFormat,
        selectedSeats: selectedSeatsObj,
        subtotalInr,
        gstInr,
        convenienceFeeInr,
        totalAmountInr,
        paymentId: verifyData.paymentId,
        paymentMethod: selectedPaymentMethod,
        status: 'confirmed',
        createdAtIso: new Date().toISOString(),
      };

      // Persist in Firestore if authenticated with Firebase Auth
      if (auth.currentUser && currentUser.isFirebaseUser) {
        const bookingPath = `bookings/${confirmedBooking.bookingId}`;
        try {
          await setDoc(doc(db, 'bookings', confirmedBooking.bookingId), {
            bookingId: confirmedBooking.bookingId,
            userId: currentUser.uid,
            movieId: selectedMovie.id.slice(0, 60),
            movieTitle: selectedMovie.title.slice(0, 150),
            posterUrl: selectedMovie.posterUrl.slice(0, 490),
            theatreId: bookingTheatre.id.slice(0, 60),
            theatreName: bookingTheatre.name.slice(0, 150),
            screenName: bookingShowtime.screenName.slice(0, 75),
            city: bookingTheatre.city.slice(0, 75),
            showDate: bookingDate.slice(0, 19),
            showTime: bookingShowtime.time.slice(0, 19),
            language: bookingLanguage.slice(0, 38),
            format: bookingFormat.slice(0, 38),
            seats: selectedSeatIds.slice(0, 10),
            seatCategory: (selectedSeatsObj[0]?.category || 'Standard').slice(0, 55),
            subtotal: subtotalInr,
            gstAmount: gstInr,
            convenienceFee: convenienceFeeInr,
            totalAmount: totalAmountInr,
            paymentId: (verifyData.paymentId || 'pay_rzp').slice(0, 95),
            paymentMethod: selectedPaymentMethod,
            status: 'confirmed',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, bookingPath);
        }
      }

      const updatedBookings = [confirmedBooking, ...bookings];
      setBookings(updatedBookings);
      localStorage.setItem('cinenexus_bookings_v1', JSON.stringify(updatedBookings));
      setLockExpiresAt(null);
      setPaymentProcessing(false);
      setActiveTicketModal(confirmedBooking);
    } catch (err: any) {
      setPaymentProcessing(false);
      setPaymentFeedback({
        type: 'error',
        text: err?.message || 'Payment verification error.',
      });
    }
  };

  // Watchlist Toggle
  const handleToggleWatchlist = async (movie: Movie) => {
    const exists = watchlist.some((m) => m.id === movie.id);
    let next: Movie[];
    if (exists) {
      next = watchlist.filter((m) => m.id !== movie.id);
    } else {
      next = [movie, ...watchlist];
    }
    setWatchlist(next);
    localStorage.setItem('cinenexus_watchlist_v1', JSON.stringify(next));

    if (auth.currentUser && currentUser?.isFirebaseUser) {
      const watchId = `${currentUser.uid}_${movie.id}`.replace(/[^a-zA-Z0-9_-]/g, '');
      const path = `watchlists/${watchId}`;
      try {
        if (exists) {
          await deleteDoc(doc(db, 'watchlists', watchId));
        } else {
          await setDoc(doc(db, 'watchlists', watchId), {
            userId: currentUser.uid,
            movieId: movie.id.slice(0, 60),
            movieTitle: movie.title.slice(0, 150),
            posterUrl: movie.posterUrl.slice(0, 490),
            genre: (movie.genres[0] || 'Action').slice(0, 90),
            language: (movie.languages[0] || 'Telugu').slice(0, 55),
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    const updated = bookings.map((b) =>
      b.bookingId === bookingId ? { ...b, status: 'cancelled' as const } : b
    );
    setBookings(updated);
    localStorage.setItem('cinenexus_bookings_v1', JSON.stringify(updated));

    if (auth.currentUser && currentUser?.isFirebaseUser) {
      const path = `bookings/${bookingId}`;
      try {
        await updateDoc(doc(db, 'bookings', bookingId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('cinenexus_active_session');
    setCurrentUser(null);
    setSelectedMovie(null);
  };

  // Render AuthGate if not logged in
  if (!currentUser) {
    return <AuthGate onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  // Filter displayed movies by category tab & search query
  const displayedMovies = movies.filter((m) => {
    if (
      searchQuery.trim() &&
      !m.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    if (selectedCategoryTab === 'trending') return m.isTrending;
    if (selectedCategoryTab === 'recommended') return m.isRecommended;
    if (selectedCategoryTab === 'popular_city') return m.popularityScore >= 90;
    return true;
  });

  const heroMovie = movies[0] || null;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      {/* Mandatory Google Maps Platform Tier 2 Quota Warning Banner (google-maps-platform/SKILL.md Section 8 Case A) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOP BAR CONTRACT (frontend-design Section 2: 3 Zones, gap-8)         */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 bg-[#07090e]/95 border-b border-white/10 flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setSelectedMovie(null);
            setActiveTab('home');
          }}
          className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          CineNexus
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="#now-showing"
            onClick={(e) => {
              e.preventDefault();
              setSelectedMovie(null);
              setActiveTab('home');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home' && !selectedMovie ? 'text-rose-400 underline underline-offset-8' : ''
            }`}
          >
            Now Showing
          </a>
          <a
            href="#theatre-map"
            onClick={(e) => {
              e.preventDefault();
              setSelectedMovie(null);
              setActiveTab('map');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'map' ? 'text-rose-400 underline underline-offset-8' : ''
            }`}
          >
            Theatres & Map
          </a>
          <a
            href="#dsa-engine"
            onClick={(e) => {
              e.preventDefault();
              setSelectedMovie(null);
              setActiveTab('dsa');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'dsa' ? 'text-rose-400 underline underline-offset-8' : ''
            }`}
          >
            DSA Engine Room
          </a>
          <a
            href="#pbl-docs"
            onClick={(e) => {
              e.preventDefault();
              setSelectedMovie(null);
              setActiveTab('docs');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'docs' ? 'text-rose-400 underline underline-offset-8' : ''
            }`}
          >
            PBL Documentation
          </a>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              setSelectedMovie(null);
              setActiveTab('admin');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'admin' ? 'text-rose-400 underline underline-offset-8' : ''
            }`}
          >
            Admin Panel
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedMovie(null);
              setActiveTab('profile');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            My Profile & Tickets ({bookings.filter((b) => b.status === 'confirmed').length})
          </button>
        </div>
      </header>

      {/* Mobile Nav Strip */}
      <div className="md:hidden px-4 py-2 bg-[#0b0f19] border-b border-white/10 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-300">
        {[
          { id: 'home', label: 'Now Showing' },
          { id: 'map', label: 'Theatres & Map' },
          { id: 'dsa', label: 'DSA Engine' },
          { id: 'docs', label: 'PBL Docs' },
          { id: 'admin', label: 'Admin' },
          { id: 'profile', label: 'Profile' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelectedMovie(null);
              setActiveTab(item.id as NavTab);
            }}
            className={`py-1 whitespace-nowrap shrink-0 ${
              activeTab === item.id ? 'text-rose-400 font-bold' : 'text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* WORKSPACE LOCATION, PREFIX TRIE SEARCH & LIVE PROVIDER TOOLBAR       */}
      {/* ==================================================================== */}
      <div className="bg-[#0b0f19] border-b border-white/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* City Selector (Default: Hyderabad, Telangana, India) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span className="text-slate-400">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value as IndianCity);
                  setSelectedMovie(null);
                }}
                aria-label="Select Indian City"
                className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                {INDIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}, {c.state}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-600 hidden sm:inline">·</span>

            {/* Live Feed Mode Switcher (Demonstrating Rule #8, #9, #10) */}
            <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setProviderMode('verified')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  providerMode === 'verified'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Verified City Schedule
              </button>
              <button
                type="button"
                onClick={() => setProviderMode('strict_partner')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  providerMode === 'strict_partner'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Strict Partner API Check
              </button>
            </div>
          </div>

          {/* Prefix Trie Live Movie Search Box */}
          <div className="relative flex-1 max-w-md min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Prefix Trie O(L) Search in ${selectedCity} (e.g. Ped, Ram, Raj, Spi)...`}
              className="w-full pl-10 pr-16 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}

            {/* Prefix Trie Autocomplete Dropdown */}
            {searchQuery.trim() !== '' && trieSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#0f1523] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-3.5 py-2 bg-slate-950 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-amber-400">
                  <span>Prefix Trie O(L) Autocomplete</span>
                  {trieTrace && <span>{trieTrace.executionTimeUs} μs</span>}
                </div>
                <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                  {trieSuggestions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleOpenMovie(m);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-800/80 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{m.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {m.languages.join(', ')} · {m.genres.join(', ')}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-amber-400 shrink-0">
                        ₹{m.basePriceInr}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Last Updated Timestamp & Refresh Button */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono text-[11px] tabular-nums">
              Updated: {new Date(lastUpdatedIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              type="button"
              onClick={() => fetchLiveCinemaData(true)}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Refresh Live Movie & Showtime Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMovies ? 'animate-spin text-rose-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN CONTENT VIEWPORT                                                */}
      {/* ==================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* CASE 1: SELECTED MOVIE DETAILS & STEP-BY-STEP BOOKING WORKFLOW */}
        {selectedMovie ? (
          <div className="space-y-8">
            {/* Back Navigation & Step Breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  if (bookingStep === 'checkout') setBookingStep('auditorium3d');
                  else if (bookingStep === 'auditorium3d') setBookingStep('schedule');
                  else if (bookingStep === 'schedule') setBookingStep('details');
                  else setSelectedMovie(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-rose-400" />
                <span>
                  {bookingStep === 'details'
                    ? `Back to ${selectedCity} Now Showing`
                    : 'Previous Booking Step'}
                </span>
              </button>

              {/* Step Progress Indicator */}
              <div className="flex items-center gap-2 text-xs font-medium">
                {[
                  { id: 'details', label: '01. Movie Details' },
                  { id: 'schedule', label: '02. Language, Date & Theatre' },
                  { id: 'auditorium3d', label: '03. 3D Cinema Seat Selection' },
                  { id: 'checkout', label: '04. INR Summary & Razorpay' },
                ].map((st, idx) => (
                  <React.Fragment key={st.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                    <button
                      type="button"
                      onClick={() => {
                        if (st.id === 'details' || st.id === 'schedule') {
                          setBookingStep(st.id as any);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        bookingStep === st.id
                          ? 'bg-rose-600 text-white font-semibold'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Persistent Selected Booking Context Bar */}
            <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <strong className="text-white font-display text-sm">{selectedMovie.title}</strong>
                <span>·</span>
                <span className="text-amber-400 font-semibold">{bookingLanguage}</span>
                <span>·</span>
                <span>{bookingFormat}</span>
                <span>·</span>
                <span>Date: {bookingDate}</span>
                {bookingTheatre && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-400 font-medium">{bookingTheatre.name}</span>
                  </>
                )}
                {bookingShowtime && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-white">{bookingShowtime.time}</span>
                  </>
                )}
              </div>

              {lockExpiresAt && lockCountdownSec > 0 && (
                <div className="font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Seat Lock Expires in {Math.floor(lockCountdownSec / 60)}:
                    {String(lockCountdownSec % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* STEP A: MOVIE DETAILS VIEW */}
            {bookingStep === 'details' && (
              <div className="space-y-8">
                <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#0b0f19]">
                  <img
                    src={selectedMovie.backdropUrl}
                    alt={selectedMovie.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-35"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/80 to-[#0b0f19]/40" />

                  <div className="relative z-10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-4 flex justify-center">
                      <img
                        src={selectedMovie.posterUrl}
                        alt={selectedMovie.title}
                        referrerPolicy="no-referrer"
                        className="w-64 sm:w-72 aspect-[3/4] object-cover rounded-2xl border border-white/20 shadow-2xl"
                      />
                    </div>

                    <div className="lg:col-span-8 space-y-5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-medium">
                        <span>★ {selectedMovie.rating}/10 ({selectedMovie.votesCount.toLocaleString()} votes)</span>
                        <span>·</span>
                        <span>{selectedMovie.certification}</span>
                        <span>·</span>
                        <span>{selectedMovie.durationFormatted}</span>
                        <span>·</span>
                        <span>Release: {selectedMovie.releaseDate}</span>
                      </div>

                      <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight">
                        {selectedMovie.title}
                      </h1>

                      <p className="text-sm text-rose-300 font-medium">{selectedMovie.tagline}</p>

                      <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                        {selectedMovie.synopsis}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
                        <div>
                          <div className="text-slate-400">Director</div>
                          <div className="font-semibold text-white mt-0.5">
                            {selectedMovie.director}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Available Languages</div>
                          <div className="font-semibold text-white mt-0.5">
                            {selectedMovie.languages.join(' · ')}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Projection Formats</div>
                          <div className="font-semibold text-amber-400 mt-0.5">
                            {selectedMovie.formats.join(' · ')}
                          </div>
                        </div>
                      </div>

                      {/* Cast & Crew */}
                      <div className="pt-2">
                        <div className="text-xs text-slate-400 mb-2">Lead Cast & Crew</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {selectedMovie.cast.map((c) => (
                            <div
                              key={c.name}
                              className="p-3 rounded-xl bg-slate-900/90 border border-white/10 text-xs"
                            >
                              <div className="font-semibold text-white">{c.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{c.role}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setBookingStep('schedule')}
                          className="py-3.5 px-7 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>Book Tickets (From ₹{selectedMovie.basePriceInr})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowTrailerModal(true)}
                          className="py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Play className="w-4 h-4 text-amber-400" />
                          <span>Watch Trailer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleWatchlist(selectedMovie)}
                          className="py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          {watchlist.some((w) => w.id === selectedMovie.id) ? (
                            <>
                              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                              <span>In Watchlist</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="w-4 h-4 text-rose-400" />
                              <span>Add to Watchlist</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP B: STEP 1 (LANGUAGE), STEP 2 (DATE), STEP 3 (THEATRE), STEP 4 (SHOWTIME) */}
            {bookingStep === 'schedule' && (
              <div className="space-y-6">
                {/* Step 1: Language & Format Selector */}
                <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs font-semibold text-rose-400">
                      STEP 1 — SELECT LANGUAGE
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {selectedMovie.languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setBookingLanguage(lang)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            bookingLanguage === lang
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-amber-400">
                      SELECT PROJECTION FORMAT
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {selectedMovie.formats.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setBookingFormat(fmt)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            bookingFormat === fmt
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: 7-Day Date Selector (Highlights Today, Disables Dates without Confirmed Shows) */}
                <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-400">
                      STEP 2 — SELECT SHOW DATE (NEXT 7 DAYS IN {selectedCity.toUpperCase()})
                    </span>
                    <span className="text-xs text-slate-400">
                      Dates without confirmed shows are disabled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                    {datesList.map((d) => {
                      const isSelected = bookingDate === d.dateStr;
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          disabled={!d.hasConfirmedShows}
                          onClick={() => setBookingDate(d.dateStr)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            !d.hasConfirmedShows
                              ? 'bg-slate-950 border-white/5 text-slate-600 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/25'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[10px] font-mono font-bold tracking-wider">
                            {d.dayName} {d.isToday ? '· LIVE' : ''}
                          </div>
                          <div className="font-mono text-xl font-bold mt-0.5">{d.dayNum}</div>
                          <div className="text-[11px] opacity-80">{d.monthShort}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 & Step 4: Theatres & Showtimes in Selected City */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-white">
                      Step 3 & 4 — Select Theatre & Showtime in {selectedCity}
                    </h2>
                    <span className="text-xs font-mono text-emerald-400">
                      {theatres.length} Verified Theatres Indexed in AVL Tree
                    </span>
                  </div>

                  {theatres.map((theatre) => {
                    const slots = theatre.showtimesByDate?.[bookingDate] || [];
                    return (
                      <div
                        key={theatre.id}
                        className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                      >
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                            <span>{theatre.id}</span>
                            <span>·</span>
                            <span>★ {theatre.rating}</span>
                            <span>·</span>
                            <span>{theatre.distanceKm} km away</span>
                          </div>
                          <h3 className="font-display text-lg font-bold text-white">
                            {theatre.name}
                          </h3>
                          <p className="text-xs text-slate-400">{theatre.address}</p>
                          <div className="text-[11px] text-slate-400 pt-1">
                            Facilities: {theatre.facilities.join(' · ')}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {slots.length === 0 ? (
                            <span className="text-xs text-slate-500 font-mono">
                              No confirmed shows on {bookingDate}
                            </span>
                          ) : (
                            slots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => handleEnter3DAuditorium(theatre, slot)}
                                className="p-3.5 rounded-xl bg-slate-900 hover:bg-rose-600 group border border-emerald-500/40 hover:border-rose-400 text-left transition-all cursor-pointer min-w-[145px]"
                              >
                                <div className="font-mono text-sm font-bold text-white">
                                  {slot.time}
                                </div>
                                <div className="text-[11px] text-slate-400 group-hover:text-rose-100 mt-0.5">
                                  {slot.screenName}
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-mono mt-1.5 pt-1.5 border-t border-white/10">
                                  <span className="text-amber-400 group-hover:text-white">
                                    ₹{slot.standardPriceInr}
                                  </span>
                                  <span className="text-emerald-400 group-hover:text-white">
                                    {slot.availableSeats} seats
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP C: REALISTIC 3D CINEMA SEAT SELECTION */}
            {bookingStep === 'auditorium3d' && bookingTheatre && bookingShowtime && (
              <Auditorium3D
                movie={selectedMovie}
                theatre={bookingTheatre}
                selectedDate={bookingDate}
                selectedShowtime={bookingShowtime}
                selectedLanguage={bookingLanguage}
                selectedFormat={bookingFormat}
                seats={auditoriumSeats}
                selectedSeatIds={selectedSeatIds}
                onToggleSeat={handleToggleSeat}
                onProceedToCheckout={handleProceedToCheckout}
                layoutSource={layoutSource}
                lockingInProgress={lockingInProgress}
              />
            )}

            {/* STEP D: BOOKING SUMMARY & RAZORPAY INR PAYMENT GATEWAY */}
            {bookingStep === 'checkout' && bookingTheatre && bookingShowtime && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left 7 Columns: Razorpay INR Test Gateway */}
                <div className="lg:col-span-7 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-xs font-semibold text-emerald-400">
                        RAZORPAY INR CHECKOUT (TEST MODE)
                      </span>
                      <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                        Select Payment Method (₹ INR)
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Order Ref: <span className="font-mono text-amber-400">{razorpayOrder?.orderId}</span> · Zero card/CVV storage
                      </p>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  </div>

                  {paymentFeedback && (
                    <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{paymentFeedback.text}</span>
                    </div>
                  )}

                  {/* Payment Method Selector Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'UPI', label: 'UPI (GPay/PhonePe)', icon: Smartphone },
                      { id: 'Card', label: 'Debit / Credit Card', icon: CreditCard },
                      { id: 'NetBanking', label: 'Net Banking', icon: Building },
                      { id: 'Wallet', label: 'Paytm / Amazon Wallet', icon: Wallet },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(pm.id as any)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedPaymentMethod === pm.id
                              ? 'bg-rose-600/20 border-rose-500 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-rose-400 mb-1.5" />
                          <div className="text-xs font-semibold">{pm.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Method Specific Input */}
                  {selectedPaymentMethod === 'UPI' && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                      <label className="block text-xs text-slate-300 font-medium">
                        Enter Virtual Payment Address (UPI ID)
                      </label>
                      <input
                        type="text"
                        value={upiIdInput}
                        onChange={(e) => setUpiIdInput(e.target.value)}
                        placeholder="patron@okaxis"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-white"
                      />
                    </div>
                  )}

                  {selectedPaymentMethod === 'Card' && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 text-xs text-slate-300">
                      <p>
                        Razorpay Test Card Tokenization Active. Card numbers and CVV are never stored
                        on CineNexus servers.
                      </p>
                      <div className="font-mono text-amber-400">
                        Test Token: tok_rzp_visa_4111_xxxx_1111
                      </div>
                    </div>
                  )}

                  {/* Primary Pay & Simulation Controls */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={() => handleVerifyPayment('success')}
                      className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {paymentProcessing
                          ? 'Verifying HMAC-SHA256 Payment Signature...'
                          : `Authorize & Pay ₹${(razorpayOrder?.totalAmountInr || 0).toLocaleString('en-IN')} via ${selectedPaymentMethod}`}
                      </span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={paymentProcessing}
                        onClick={() => handleVerifyPayment('failed')}
                        className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-white/10 text-xs font-semibold text-rose-300 cursor-pointer"
                      >
                        Simulate Failed Payment (Test Rollback)
                      </button>
                      <button
                        type="button"
                        disabled={paymentProcessing}
                        onClick={() => handleVerifyPayment('cancelled')}
                        className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                      >
                        Cancel Payment & Release Seat Lock
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Full Booking Summary Card */}
                <div className="lg:col-span-5 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5">
                  <div className="flex items-start gap-4 border-b border-white/10 pb-4">
                    <img
                      src={selectedMovie.posterUrl}
                      alt={selectedMovie.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-28 object-cover rounded-xl border border-white/15 shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-rose-400">BOOKING SUMMARY</span>
                      <h3 className="font-display text-lg font-bold text-white mt-0.5">
                        {selectedMovie.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        {bookingLanguage} · {bookingFormat} · {selectedMovie.certification}
                      </p>
                      <p className="text-xs text-amber-400 mt-1 font-medium">
                        {bookingTheatre.name} ({bookingShowtime.screenName})
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Show Date & Time</span>
                      <span className="font-mono text-white font-semibold">
                        {bookingDate} · {bookingShowtime.time}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Selected Seat Numbers</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedSeatIds.join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Row & Column Coordinates</span>
                      <span className="font-mono text-slate-300">
                        {auditoriumSeats
                          .filter((s) => selectedSeatIds.includes(s.id))
                          .map((s) => `R:${s.row}-C:${s.col}`)
                          .join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/10">
                      <span className="text-slate-300">Tickets Subtotal</span>
                      <span className="font-mono tabular-nums">
                        ₹{(razorpayOrder?.subtotalInr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GST (18%)</span>
                      <span className="font-mono tabular-nums">
                        ₹{(razorpayOrder?.gstInr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Convenience Fee</span>
                      <span className="font-mono tabular-nums">
                        ₹{(razorpayOrder?.convenienceFeeInr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/10 text-base font-bold text-white">
                      <span>Final Amount Payable</span>
                      <span className="font-mono text-xl text-amber-400 tabular-nums">
                        ₹{(razorpayOrder?.totalAmountInr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'map' ? (
          /* CASE 2: GPS & THEATRE MAP TAB */
          <TheatreMap
            selectedCity={selectedCity}
            onSelectCity={(city) => setSelectedCity(city)}
            theatres={theatres}
            onSelectTheatreForBooking={(theatre) => {
              const firstMovie = movies[0];
              if (firstMovie) {
                setSelectedMovie(firstMovie);
                setBookingTheatre(theatre);
                setBookingStep('schedule');
              }
            }}
          />
        ) : activeTab === 'dsa' ? (
          /* CASE 3: DSA ENGINE ROOM TAB */
          <DSAEngineRoom />
        ) : activeTab === 'docs' ? (
          /* CASE 4: PBL DOCUMENTATION TAB */
          <PBLDocumentation />
        ) : activeTab === 'admin' ? (
          /* CASE 5: ADMIN DASHBOARD TAB */
          <AdminDashboard
            movies={movies}
            theatres={theatres}
            bookings={bookings}
            onRefreshData={() => fetchLiveCinemaData(true)}
          />
        ) : activeTab === 'profile' ? (
          /* CASE 6: USER PROFILE, WATCHLIST & BOOKING HISTORY TAB */
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center font-display text-xl font-bold text-rose-400">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    {currentUser.fullName}
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">
                    {currentUser.email} · {currentUser.mobile}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of CineNexus</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 4 Columns: Edit Profile & Preferences */}
              <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
                <h2 className="font-display text-lg font-bold text-white">
                  Personal Profile & Preferences
                </h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const updatedUser: CineNexusUser = {
                      ...currentUser,
                      fullName: editFullName.trim() || currentUser.fullName,
                      mobile: editMobile.trim() || currentUser.mobile,
                    };
                    setCurrentUser(updatedUser);
                    localStorage.setItem(
                      'cinenexus_active_session',
                      JSON.stringify(updatedUser)
                    );
                    if (auth.currentUser && currentUser.isFirebaseUser) {
                      try {
                        await updateDoc(doc(db, 'users', currentUser.uid), {
                          fullName: updatedUser.fullName.slice(0, 95),
                          mobile: updatedUser.mobile.slice(0, 19),
                          preferredLanguages: updatedUser.preferredLanguages,
                          favouriteGenres: updatedUser.favouriteGenres,
                          updatedAt: serverTimestamp(),
                        });
                      } catch (err) {
                        handleFirestoreError(
                          err,
                          OperationType.UPDATE,
                          `users/${currentUser.uid}`
                        );
                      }
                    }
                    setProfileSavedNotice(true);
                    setTimeout(() => setProfileSavedNotice(false), 3000);
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={editMobile}
                      onChange={(e) => setEditMobile(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Preferred Languages</label>
                    <div className="text-white font-medium">
                      {currentUser.preferredLanguages.join(' · ')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Favourite Genres</label>
                    <div className="text-amber-400 font-medium">
                      {currentUser.favouriteGenres.join(' · ')}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                  >
                    {profileSavedNotice ? 'Profile Saved ✓' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>

              {/* Right 8 Columns: Bookings & Watchlist */}
              <div className="lg:col-span-8 space-y-6">
                {/* Bookings List */}
                <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
                  <h2 className="font-display text-lg font-bold text-white">
                    My Digital QR Tickets & Booking History ({bookings.length})
                  </h2>

                  {bookings.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">
                      You have no bookings yet. Select any movie in Now Showing to reserve seats in
                      our 3D auditorium.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((b) => (
                        <div
                          key={b.bookingId}
                          className="p-4 rounded-xl bg-slate-900 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-amber-400 font-bold">{b.bookingId}</span>
                              <span>·</span>
                              <span
                                className={
                                  b.status === 'confirmed'
                                    ? 'text-emerald-400 font-semibold uppercase'
                                    : 'text-rose-400 font-semibold uppercase'
                                }
                              >
                                {b.status}
                              </span>
                            </div>
                            <div className="font-display text-base font-bold text-white">
                              {b.movie.title}
                            </div>
                            <div className="text-slate-400">
                              {b.theatre.name} ({b.screenName}) · {b.showDate} at {b.showTime}
                            </div>
                            <div className="font-mono text-white">
                              Seats: {b.selectedSeats.map((s) => s.id).join(', ')} · Total Paid: ₹
                              {b.totalAmountInr.toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTicketModal(b)}
                              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                            >
                              View QR Ticket & PDF
                            </button>
                            {b.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleCancelBooking(b.bookingId)}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watchlist */}
                <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
                  <h2 className="font-display text-lg font-bold text-white">
                    Saved Watchlist ({watchlist.length})
                  </h2>
                  {watchlist.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Your watchlist is empty. Click &quot;Add to Watchlist&quot; on any movie.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {watchlist.map((m) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{m.title}</div>
                            <div className="text-slate-400 mt-0.5">
                              {m.languages.join(', ')} · ₹{m.basePriceInr}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenMovie(m)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                            >
                              Book
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleWatchlist(m)}
                              className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================== */
          /* CASE 7: DEFAULT HOMEPAGE — STRICTLY LIVE RUNNING MOVIES            */
          /* ================================================================== */
          <div className="space-y-10">
            {/* Honest API Partner Credential Notice when Strict Partner Mode is tested */}
            {providerMeta?.providerStatus === 'PARTNER_CREDENTIALS_REQUIRED' ? (
              <div className="p-8 rounded-3xl bg-[#0b0f19] border border-amber-500/40 text-center max-w-3xl mx-auto space-y-4">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h2 className="font-display text-2xl font-bold text-white">
                  Authorized Cinema Partner Credentials Required for Direct Aggregator Booking
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {providerMeta.message}
                </p>
                <div className="p-4 rounded-xl bg-slate-900 border border-white/10 text-left font-mono text-xs text-slate-300 space-y-1">
                  <div>Required Environment Secrets for Direct Partner Feed:</div>
                  <div className="text-amber-400">
                    • TMDB_API_KEY (Live Movie Metadata & Posters)
                  </div>
                  <div className="text-amber-400">
                    • CINEMA_PROVIDER_API_KEY (Authorized Multiplex Showtime & Seat Manifest Partner)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProviderMode('verified')}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Switch to Verified City Schedule Mode ({selectedCity})
                </button>
              </div>
            ) : (
              <>
                {/* Hero Featured Now Showing Spotlight */}
                {heroMovie && (
                  <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#0b0f19]">
                    <img
                      src={heroMovie.backdropUrl}
                      alt={heroMovie.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/85 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-transparent" />

                    <div className="relative z-10 p-6 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      <div className="lg:col-span-8 space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-semibold">
                          <span>NOW SHOWING IN {selectedCity.toUpperCase()} THEATRES</span>
                          <span>·</span>
                          <span>{heroMovie.verifiedShowCount} Verified Shows Today</span>
                          <span>·</span>
                          <span>★ {heroMovie.rating}/10</span>
                        </div>

                        <h1
                          className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight"
                          style={{ textWrap: 'balance' }}
                        >
                          {heroMovie.title}
                        </h1>

                        <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                          {heroMovie.synopsis}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                          <span>{heroMovie.genres.join(' · ')}</span>
                          <span>·</span>
                          <span>{heroMovie.durationFormatted}</span>
                          <span>·</span>
                          <span>{heroMovie.languages.join(', ')}</span>
                          <span>·</span>
                          <span className="text-amber-400 font-mono">
                            {heroMovie.formats.join(' / ')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-3">
                          <button
                            type="button"
                            onClick={() => handleOpenMovie(heroMovie)}
                            className="py-3.5 px-7 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <Ticket className="w-4 h-4" />
                            <span>Book 3D Seats · From ₹{heroMovie.basePriceInr}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovie(heroMovie);
                              setShowTrailerModal(true);
                            }}
                            className="py-3.5 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Play className="w-4 h-4 text-amber-400" />
                            <span>Watch Official Trailer</span>
                          </button>
                        </div>
                      </div>

                      <div className="lg:col-span-4 hidden lg:flex justify-end">
                        <img
                          src={heroMovie.posterUrl}
                          alt={heroMovie.title}
                          referrerPolicy="no-referrer"
                          onClick={() => handleOpenMovie(heroMovie)}
                          className="w-60 aspect-[3/4] object-cover rounded-2xl border border-white/20 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Category Tabs, Language Filters, Genre Filters & Merge Sort Selector */}
                <section id="now-showing" className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    {/* 4 Core Homepage Sections */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-white/10 p-1 rounded-xl">
                      {[
                        { id: 'now_showing', label: `Now Showing in ${selectedCity}` },
                        { id: 'trending', label: 'Trending Now' },
                        { id: 'popular_city', label: `Popular in ${selectedCity}` },
                        { id: 'recommended', label: 'Recommended Movies' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSelectedCategoryTab(tab.id as any)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            selectedCategoryTab === tab.id
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Merge Sort O(n log n) Dropdown */}
                    <div className="flex items-center gap-2 text-xs">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400">Merge Sort O(n log n):</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        aria-label="Sort movies using Merge Sort"
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="popularity">Popularity Score</option>
                        <option value="rating">Highest Rating (★)</option>
                        <option value="price_asc">Ticket Price: Low to High (₹)</option>
                        <option value="price_desc">Ticket Price: High to Low (₹)</option>
                        <option value="duration">Duration (Minutes)</option>
                        <option value="releaseDate">Release Date</option>
                      </select>
                    </div>
                  </div>

                  {/* Language & Genre Interactive Filter Bars */}
                  <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 mr-1">Language:</span>
                      {['All', 'Telugu', 'Hindi', 'Tamil', 'English', 'Malayalam'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setSelectedLanguageFilter(lang)}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            selectedLanguageFilter === lang
                              ? 'bg-white text-slate-950 font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 mr-1">Genre:</span>
                      {['All', 'Action', 'Sci-Fi', 'Thriller', 'Drama', 'Adventure'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setSelectedGenreFilter(g)}
                          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            selectedGenreFilter === g
                              ? 'bg-rose-600 text-white font-semibold'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Movie Cards Grid (Zero-Pill Unboxed Metadata Discipline) */}
                  {displayedMovies.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-[#0b0f19] border border-white/10 text-center space-y-3">
                      <p className="text-base font-semibold text-white">
                        No currently running theatrical movies match your selected filters in{' '}
                        {selectedCity}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLanguageFilter('All');
                          setSelectedGenreFilter('All');
                          setSearchQuery('');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayedMovies.map((movie) => (
                        <article
                          key={movie.id}
                          className="group bg-[#0b0f19] border border-white/10 hover:border-rose-500/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 shadow-lg"
                        >
                          <div
                            onClick={() => handleOpenMovie(movie)}
                            className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900 cursor-pointer"
                          >
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-transparent" />

                            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono">
                              <span className="text-amber-400 font-bold">
                                ★ {movie.rating}/10
                              </span>
                              <span className="text-slate-200">{movie.durationFormatted}</span>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1.5">
                              {/* Unboxed quiet inline metadata with typographic separators */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                <span>{movie.genres.join(' / ')}</span>
                                <span aria-hidden="true">·</span>
                                <span>{movie.certification}</span>
                                <span aria-hidden="true">·</span>
                                <span>{movie.releaseDate}</span>
                              </div>

                              <h3
                                onClick={() => handleOpenMovie(movie)}
                                className="font-display text-lg font-bold text-white group-hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                {movie.title}
                              </h3>

                              <div className="text-xs text-slate-300">
                                Languages: {movie.languages.join(', ')}
                              </div>

                              <div className="text-[11px] font-mono text-emerald-400 pt-1">
                                {movie.verifiedShowCount} Verified Shows in {selectedCity} ·{' '}
                                {movie.sourceProvider === 'ADMIN_CATALOGUE'
                                  ? 'Admin Catalogue'
                                  : 'Live Schedule'}
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] text-slate-400">Tickets From</div>
                                <div className="font-mono text-base font-bold text-amber-400 tabular-nums">
                                  ₹{movie.basePriceInr}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenMovie(movie)}
                                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Book Tickets
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </main>

      {/* Trailer Lightbox Modal */}
      {showTrailerModal && selectedMovie && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#0b0f19] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <div className="font-display font-bold text-sm text-white">
                Official Theatrical Trailer — {selectedMovie.title}
              </div>
              <button
                type="button"
                onClick={() => setShowTrailerModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title={`${selectedMovie.title} Trailer`}
                src={`https://www.youtube.com/embed/${selectedMovie.trailerYoutubeId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Digital QR Ticket Modal */}
      {activeTicketModal && (
        <DigitalTicketModal
          booking={activeTicketModal}
          onClose={() => setActiveTicketModal(null)}
          onViewAllBookings={() => {
            setActiveTicketModal(null);
            setSelectedMovie(null);
            setActiveTab('profile');
          }}
        />
      )}

      {/* Quiet Editorial Footer (No Fake Telemetry Tickers) */}
      <footer className="border-t border-white/10 bg-[#05070b] px-6 py-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <strong className="text-white font-display">CineNexus</strong> — YOUR MOVIE. YOUR
            THEATRE. YOUR EXPERIENCE.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => {
                setSelectedMovie(null);
                setActiveTab('dsa');
              }}
              className="hover:text-white cursor-pointer"
            >
              DSA Engine Room
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMovie(null);
                setActiveTab('docs');
              }}
              className="hover:text-white cursor-pointer"
            >
              PBL Documentation
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedMovie(null);
                setActiveTab('map');
              }}
              className="hover:text-white cursor-pointer"
            >
              Theatre Map
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
