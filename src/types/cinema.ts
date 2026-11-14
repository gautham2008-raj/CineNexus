export type IndianCity =
  | 'Hyderabad'
  | 'Bengaluru'
  | 'Mumbai'
  | 'Chennai'
  | 'Delhi NCR'
  | 'Kochi';

export interface CastMember {
  name: string;
  role: string;
}

export interface Movie {
  id: string;
  tmdbId?: number;
  title: string;
  tagline: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number; // out of 10
  votesCount: number;
  certification: 'U' | 'U/A 13+' | 'U/A 16+' | 'A';
  genres: string[];
  durationMinutes: number;
  durationFormatted: string;
  languages: string[];
  formats: ('2D' | '3D' | 'IMAX 3D' | 'Dolby Atmos' | '4DX')[];
  releaseDate: string;
  director: string;
  cast: CastMember[];
  trailerYoutubeId: string;
  basePriceInr: number;
  popularityScore: number;
  isTrending: boolean;
  isRecommended: boolean;
  citiesRunning: IndianCity[];
  sourceProvider: 'TMDB_LIVE' | 'VERIFIED_THEATRICAL_FEED' | 'ADMIN_CATALOGUE';
  verifiedShowCount: number;
  lastUpdatedIso: string;
}

export interface ShowtimeSlot {
  id: string;
  time: string; // e.g. "10:15 AM", "01:45 PM", "06:30 PM", "10:00 PM"
  format: '2D' | '3D' | 'IMAX 3D' | 'Dolby Atmos' | '4DX';
  language: string;
  screenName: string;
  standardPriceInr: number;
  executivePriceInr: number;
  vipReclinerPriceInr: number;
  totalSeats: number;
  availableSeats: number;
  isLiveVerified: boolean;
}

export interface Theatre {
  id: string;
  name: string;
  brand: 'PVR INOX' | 'AMB Cinemas' | 'Prasads Multiplex' | 'AAA Cinemas' | 'Aparna Cinemas' | 'Cinepolis';
  city: IndianCity;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  facilities: string[];
  screensCount: number;
  formatsSupported: ('2D' | '3D' | 'IMAX 3D' | 'Dolby Atmos' | '4DX')[];
  basePriceInr: number;
  rating: number;
  showtimesByDate: Record<string, ShowtimeSlot[]>; // key: YYYY-MM-DD
}

export type SeatStatus = 'available' | 'selected' | 'booked' | 'locked' | 'vip';

export type SeatCategory = 'Standard' | 'Executive' | 'VIP Recliner';

export interface SeatInfo {
  id: string; // e.g. "A5", "J12"
  row: string; // A..J
  col: number; // 1..16
  category: SeatCategory;
  priceInr: number;
  status: 'available' | 'booked' | 'locked';
  lockedByUserId?: string;
  lockExpiresAt?: number;
}

export interface BookingSummaryData {
  bookingId: string;
  userId: string;
  userEmail: string;
  movie: Movie;
  theatre: Theatre;
  screenName: string;
  showDate: string;
  showTime: string;
  language: string;
  format: string;
  selectedSeats: SeatInfo[];
  subtotalInr: number;
  gstInr: number;
  convenienceFeeInr: number;
  totalAmountInr: number;
  paymentId?: string;
  paymentMethod?: 'UPI' | 'Card' | 'NetBanking' | 'Wallet';
  status: 'confirmed' | 'cancelled';
  createdAtIso: string;
}

export interface BookingQueueRequest {
  requestId: string;
  userId: string;
  userEmail: string;
  movieTitle: string;
  theatreName: string;
  showKey: string;
  seats: string[];
  amountInr: number;
  timestamp: string;
  status: 'QUEUED' | 'LOCKED' | 'CONFIRMED' | 'EXPIRED';
}
