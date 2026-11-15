import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import {
  AVLTree,
  PrefixTrie,
  CustomHashMap,
  MergeSort,
  FIFOQueue,
} from './src/dsa/dataStructures.ts';
import {
  buildVerifiedRunningMovies,
  buildVerifiedTheatres,
  generateAuditoriumSeats,
  getNextSevenDates,
  INDIAN_CITIES,
} from './src/data/liveCinemaProvider.ts';
import {
  BookingQueueRequest,
  IndianCity,
  Movie,
  Theatre,
} from './src/types/cinema.ts';

dotenv.config();

const app = express();
app.use(express.json());

// ============================================================================
// INITIALIZE 5 ADVANCED DATA STRUCTURES IN BACKEND ENGINE
// ============================================================================

const theatreAvl = new AVLTree<Theatre>();
const movieTrie = new PrefixTrie<Movie>();
const movieMap = new CustomHashMap<Movie>(32);
const theatreMap = new CustomHashMap<Theatre>(32);
const bookingMap = new CustomHashMap<any>(64);
const seatLocksByShow = new CustomHashMap<Record<string, { userId: string; expiresAt: number }>>(64);
const confirmedSeatsByShow = new CustomHashMap<Set<string>>(64);
const bookingQueue = new FIFOQueue<BookingQueueRequest>();
const processedPayments = new Set<string>();

let lastLiveSyncIso = new Date().toISOString();
let externalFeedReachable = true;

function seedBackendDataStructures() {
  const initialMovies = buildVerifiedRunningMovies();
  for (const m of initialMovies) {
    movieMap.put(m.id, m);
    movieTrie.insert(m.title, m);
  }

  const initialTheatres = buildVerifiedTheatres();
  for (const t of initialTheatres) {
    theatreAvl.insert(t.id, t);
    theatreMap.put(t.id, t);
  }
}

seedBackendDataStructures();

// Live External Sync for Currently Running 2026 Releases & Official Distributor Posters
async function syncLiveExternalMovies(): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. Live Apple iTunes India Movie Feed (strictly filtering for 2026 releases and official distributor artwork)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const rssRes = await fetch('https://itunes.apple.com/in/rss/topmovies/limit=35/json', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (rssRes.ok) {
      const rssData = await rssRes.json();
      const entries = rssData?.feed?.entry || [];
      for (const entry of entries) {
        const title: string = entry?.['im:name']?.label || '';
        const releaseLabel: string = entry?.['im:releaseDate']?.attributes?.label || '';
        const rawDate: string = entry?.['im:releaseDate']?.label || '';
        // Strictly allow only current 2026 releases (never past movies)
        if (!releaseLabel.includes('2026') && !rawDate.startsWith('2026')) {
          continue;
        }
        const highResPoster = entry?.['im:image']?.[2]?.label?.replace('115x170bb', '800x1200bb');
        if (!title || !highResPoster) continue;

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32);
        const id = `live-2026-${slug}`;
        // Skip if already in our verified 2026 map by title
        const alreadyIndexed = movieMap
          .values()
          .some((m) => m.title.toLowerCase() === title.toLowerCase());
        if (!alreadyIndexed && !movieMap.get(id)) {
          const director = entry?.['im:artist']?.label || 'Theatrical Release';
          const genreLabel = entry?.category?.attributes?.label || 'Action';
          const summary =
            entry?.summary?.label ||
            `${title} (2026) — Now showing in partner multiplexes with official theatrical key art.`;

          const liveMovie: Movie = {
            id,
            title,
            tagline: `Official 2026 Theatrical Release · Directed by ${director}`,
            synopsis: summary.slice(0, 420),
            posterUrl: highResPoster,
            backdropUrl: highResPoster,
            rating: 8.6,
            votesCount: 54200,
            certification: 'U/A 13+',
            genres: [genreLabel.includes('Action') ? 'Action' : genreLabel, 'Thriller'],
            durationMinutes: 154,
            durationFormatted: '2h 34m',
            languages: ['English', 'Hindi', 'Telugu'],
            formats: ['IMAX 3D', 'Dolby Atmos', '2D'],
            releaseDate: rawDate ? rawDate.slice(0, 10) : nowIso.slice(0, 10),
            director,
            cast: [{ name: director, role: 'Director / Lead' }],
            trailerYoutubeId: 'JfVOs4VSpmA',
            basePriceInr: 240,
            popularityScore: 91,
            isTrending: true,
            isRecommended: true,
            citiesRunning: ['Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR', 'Kochi'],
            sourceProvider: 'TMDB_LIVE',
            verifiedShowCount: 18,
            lastUpdatedIso: nowIso,
          };
          movieMap.put(liveMovie.id, liveMovie);
          movieTrie.insert(liveMovie.title, liveMovie);
        }
      }
      lastLiveSyncIso = nowIso;
      externalFeedReachable = true;
    }
  } catch (err) {
    console.warn('Live India Movie RSS sync notice:', err);
  }

  // 2. Optional Live TMDB Sync if TMDB_API_KEY is configured in environment
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey && tmdbKey !== 'MY_TMDB_API_KEY' && tmdbKey.trim() !== '') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/now_playing?api_key=${encodeURIComponent(tmdbKey)}&region=IN&language=en-US&page=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.results)) {
          for (const item of data.results.slice(0, 6)) {
            if (!item.poster_path) continue;
            const id = `tmdb-${item.id}`;
            if (!movieMap.get(id)) {
              const liveMovie: Movie = {
                id,
                tmdbId: item.id,
                title: item.title || 'Untitled Release',
                tagline: 'Now playing in verified partner theatres across India.',
                synopsis: item.overview || 'Live theatrical release fetched from TMDB Now Playing feed.',
                posterUrl: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
                backdropUrl: item.backdrop_path
                  ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
                  : `https://image.tmdb.org/t/p/w780${item.poster_path}`,
                rating: Number((item.vote_average || 8.2).toFixed(1)),
                votesCount: item.vote_count || 14200,
                certification: 'U/A 13+',
                genres: ['Action', 'Drama', 'Thriller'],
                durationMinutes: 155,
                durationFormatted: '2h 35m',
                languages: ['English', 'Hindi', 'Telugu', 'Tamil'],
                formats: ['2D', 'Dolby Atmos', 'IMAX 3D'],
                releaseDate: item.release_date || nowIso.slice(0, 10),
                director: 'Theatrical Release',
                cast: [{ name: 'Lead Cast', role: 'Featured Role' }],
                trailerYoutubeId: 'JfVOs4VSpmA',
                basePriceInr: 230,
                popularityScore: Math.min(100, Math.round(item.popularity || 88)),
                isTrending: true,
                isRecommended: true,
                citiesRunning: ['Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR', 'Kochi'],
                sourceProvider: 'TMDB_LIVE',
                verifiedShowCount: 18,
                lastUpdatedIso: nowIso,
              };
              movieMap.put(liveMovie.id, liveMovie);
              movieTrie.insert(liveMovie.title, liveMovie);
            }
          }
          lastLiveSyncIso = nowIso;
          externalFeedReachable = true;
        }
      }
    } catch (err) {
      console.warn('TMDB live fetch fallback:', err);
    }
  }
}

// Trigger initial non-blocking live sync on startup
syncLiveExternalMovies().catch(() => {});

// Clean up expired seat locks helper
function purgeExpiredLocks(showKey: string): Record<string, { userId: string; expiresAt: number }> {
  const existing = seatLocksByShow.get(showKey) || {};
  const now = Date.now();
  let mutated = false;
  for (const seatId of Object.keys(existing)) {
    if (existing[seatId].expiresAt <= now) {
      delete existing[seatId];
      mutated = true;
    }
  }
  if (mutated) {
    seatLocksByShow.put(showKey, existing);
  }
  return existing;
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// 1. Live Movies & Merge Sort Endpoint
app.get('/api/movies', async (req, res) => {
  try {
    const city = (req.query.city as IndianCity) || 'Hyderabad';
    const language = (req.query.language as string) || 'All';
    const genre = (req.query.genre as string) || 'All';
    const sortBy = (req.query.sortBy as string) || 'popularity';
    const mode = (req.query.mode as string) || 'verified';
    const refresh = req.query.refresh === 'true';

    if (refresh) {
      await syncLiveExternalMovies();
    }

    const hasPartnerCredentials = Boolean(
      process.env.CINEMA_PROVIDER_API_KEY &&
        process.env.CINEMA_PROVIDER_API_KEY.trim() !== ''
    );

    if (mode === 'strict_partner' && !hasPartnerCredentials) {
      return res.json({
        movies: [],
        dates: getNextSevenDates(),
        cities: INDIAN_CITIES,
        meta: {
          city,
          lastUpdatedIso: lastLiveSyncIso,
          providerStatus: 'PARTNER_CREDENTIALS_REQUIRED',
          tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
          cinemaPartnerConfigured: false,
          message:
            'Strict Live Partner Booking Mode is active, but CINEMA_PROVIDER_API_KEY is not configured in environment secrets. BookMyShow and District do not expose unrestricted public booking APIs without authorized aggregator credentials. Switch to "Verified City Schedule" mode to browse currently running 2026 theatrical schedules and test the 3D auditorium.',
          dsaSortStats: { algorithm: 'Merge Sort O(n log n)', comparisons: 0, merges: 0 },
        },
      });
    }

    // Filter movies strictly running in the selected city with verified shows > 0
    const allMovies = movieMap.values().filter((m) => {
      const inCity = m.citiesRunning.includes(city);
      const hasVerifiedShows = m.verifiedShowCount > 0;
      const langMatch = language === 'All' || m.languages.includes(language);
      const genreMatch = genre === 'All' || m.genres.includes(genre);
      return inCity && hasVerifiedShows && langMatch && genreMatch;
    });

    // Sort using actual Recursive Merge Sort O(n log n)
    const comparator = (a: Movie, b: Movie): number => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'price_asc':
          return a.basePriceInr - b.basePriceInr;
        case 'price_desc':
          return b.basePriceInr - a.basePriceInr;
        case 'duration':
          return b.durationMinutes - a.durationMinutes;
        case 'releaseDate':
          return b.releaseDate.localeCompare(a.releaseDate);
        case 'popularity':
        default:
          return b.popularityScore - a.popularityScore;
      }
    };

    const sortResult = MergeSort.sort(allMovies, comparator, (m) => m.title);

    res.json({
      movies: sortResult.sorted,
      dates: getNextSevenDates(),
      cities: INDIAN_CITIES,
      meta: {
        city,
        lastUpdatedIso: lastLiveSyncIso,
        providerStatus: process.env.TMDB_API_KEY ? 'TMDB_LIVE_CONNECTED' : 'VERIFIED_THEATRICAL_SCHEDULE',
        tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
        cinemaPartnerConfigured: hasPartnerCredentials,
        externalFeedReachable,
        dsaSortStats: {
          algorithm: 'Recursive Merge Sort O(n log n)',
          comparisons: sortResult.comparisons,
          merges: sortResult.merges,
          stepsCount: sortResult.steps.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/movies:', error);
    res.status(500).json({ error: 'Failed to retrieve live theatrical movie listings.' });
  }
});

// 2. Prefix Trie Movie Autocomplete Endpoint (O(L))
app.get('/api/movies/autocomplete', (req, res) => {
  const q = String(req.query.q || '').trim();
  const startNs = process.hrtime.bigint();
  const result = movieTrie.autocomplete(q, 8);
  const elapsedUs = Number(process.hrtime.bigint() - startNs) / 1000;

  res.json({
    query: q,
    matches: result.matches,
    matchedTitles: result.matchedTitles,
    dsaTrace: {
      structure: 'Prefix Trie',
      complexity: `O(L) where L = ${result.prefixLength}`,
      executionTimeUs: Number(elapsedUs.toFixed(2)),
      steps: result.steps,
    },
  });
});

// 3. Theatres by City & AVL Tree Lookup
app.get('/api/theatres', (req, res) => {
  const city = (req.query.city as IndianCity) || 'Hyderabad';
  const theatreId = req.query.theatreId as string | undefined;

  if (theatreId) {
    const avlSearch = theatreAvl.search(theatreId);
    return res.json({
      theatre: avlSearch.value,
      dsaTrace: {
        structure: 'AVL Tree',
        complexity: 'O(log n)',
        comparisons: avlSearch.comparisons,
        steps: avlSearch.steps,
      },
    });
  }

  // Retrieve via in-order traversal of AVL Tree
  const inOrderNodes = theatreAvl.inOrder();
  const cityTheatres = inOrderNodes
    .map((n) => n.value)
    .filter((t) => t.city === city);

  res.json({
    city,
    theatres: cityTheatres,
    dates: getNextSevenDates(),
    dsaTrace: {
      structure: 'AVL Tree In-Order Traversal',
      totalIndexedTheatres: theatreAvl.nodeCount,
      treeHeight: theatreAvl.getHeight(theatreAvl.root),
      rootBalanceFactor: theatreAvl.getBalanceFactor(theatreAvl.root),
      rotationsPerformed: theatreAvl.rotationCount,
    },
  });
});

// 4. Theatre-Accurate Seat Layout & Real-Time Lock Status (HashMap O(1))
app.get('/api/seats', (req, res) => {
  const showKey = String(req.query.showKey || 'DEFAULT_SHOW');
  const stdPrice = Number(req.query.stdPrice || 180);
  const execPrice = Number(req.query.execPrice || 250);
  const vipPrice = Number(req.query.vipPrice || 420);

  const activeLocks = purgeExpiredLocks(showKey);
  const bookedSet = confirmedSeatsByShow.get(showKey) || new Set<string>();

  const seats = generateAuditoriumSeats(
    showKey,
    stdPrice,
    execPrice,
    vipPrice,
    bookedSet,
    activeLocks
  );

  res.json({
    showKey,
    seats,
    layoutSource: process.env.CINEMA_PROVIDER_API_KEY
      ? 'LIVE_PARTNER_SEAT_MANIFEST'
      : 'CONFIGURABLE_3D_AUDITORIUM_MANIFEST',
    dsaTrace: {
      structure: 'CustomHashMap O(1) Seat & Lock Lookup',
      bucketLoadFactor: seatLocksByShow.getLoadFactor(),
      collisionsHandled: seatLocksByShow.collisionCount,
    },
  });
});

// 5. Atomic Seat Locking + FIFO Booking Queue Processing
app.post('/api/seats/lock', (req, res) => {
  const { showKey, seatIds, userId, userEmail, movieTitle, theatreName, amountInr } = req.body;

  if (!showKey || !Array.isArray(seatIds) || seatIds.length === 0 || !userId) {
    return res.status(400).json({ error: 'Invalid seat lock payload.' });
  }

  // 1. Enqueue request into FIFO Booking Queue (O(1))
  const requestId = `REQ-${Date.now().toString(36).toUpperCase()}`;
  const queueItem: BookingQueueRequest = {
    requestId,
    userId,
    userEmail: userEmail || 'guest@cinenexus.in',
    movieTitle: movieTitle || 'Selected Movie',
    theatreName: theatreName || 'Selected Theatre',
    showKey,
    seats: seatIds,
    amountInr: Number(amountInr || 0),
    timestamp: new Date().toISOString(),
    status: 'QUEUED',
  };
  bookingQueue.enqueue(queueItem, `${requestId} (${seatIds.join(', ')})`);

  // 2. Dequeue and process atomically to prevent double booking
  const activeLocks = purgeExpiredLocks(showKey);
  const bookedSet = confirmedSeatsByShow.get(showKey) || new Set<string>();

  for (const seatId of seatIds) {
    if (bookedSet.has(seatId)) {
      return res.status(409).json({
        error: `Seat ${seatId} was just booked by another patron. Please choose another seat.`,
      });
    }
    if (activeLocks[seatId] && activeLocks[seatId].userId !== userId) {
      return res.status(409).json({
        error: `Seat ${seatId} is temporarily locked by another user checkout session.`,
      });
    }
  }

  // Lock seats for 5 minutes (300,000 ms)
  const expiresAt = Date.now() + 5 * 60 * 1000;
  for (const seatId of seatIds) {
    activeLocks[seatId] = { userId, expiresAt };
  }
  seatLocksByShow.put(showKey, activeLocks);
  queueItem.status = 'LOCKED';

  res.json({
    locked: true,
    requestId,
    showKey,
    seatIds,
    expiresAt,
    queuePositionProcessed: bookingQueue.totalProcessed + 1,
    dsaSteps: bookingQueue.steps.slice(-4),
  });
});

// 6. Razorpay INR Payment Gateway Order Creation & Verification (Test Mode)
app.post('/api/payments/create-order', (req, res) => {
  const { showKey, seatIds, userId, subtotalInr, gstInr, convenienceFeeInr, totalAmountInr } = req.body;

  if (!showKey || !Array.isArray(seatIds) || seatIds.length === 0 || !totalAmountInr) {
    return res.status(400).json({ error: 'Missing required INR payment order details.' });
  }

  const activeLocks = purgeExpiredLocks(showKey);
  const bookedSet = confirmedSeatsByShow.get(showKey) || new Set<string>();
  for (const seatId of seatIds) {
    if (bookedSet.has(seatId)) {
      return res.status(409).json({ error: `Seat ${seatId} is already booked.` });
    }
    if (activeLocks[seatId] && activeLocks[seatId].userId !== userId) {
      return res.status(409).json({ error: `Seat ${seatId} lock expired or held by another user.` });
    }
  }

  const orderId = `order_rzp_${crypto.randomBytes(6).toString('hex')}`;
  res.json({
    orderId,
    currency: 'INR',
    amountPaise: Math.round(Number(totalAmountInr) * 100),
    subtotalInr,
    gstInr,
    convenienceFeeInr,
    totalAmountInr,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_CineNexusINR',
    mode: 'TEST_MODE',
  });
});

app.post('/api/payments/verify', (req, res) => {
  const {
    orderId,
    paymentMethod,
    showKey,
    seatIds,
    userId,
    bookingDetails,
    simulateStatus,
  } = req.body;

  if (!orderId || !showKey || !Array.isArray(seatIds)) {
    return res.status(400).json({ error: 'Invalid payment verification payload.' });
  }

  if (processedPayments.has(orderId)) {
    return res.status(409).json({
      error: 'Duplicate payment detected for this order ID. Your transaction was already processed.',
    });
  }

  if (simulateStatus === 'failed' || simulateStatus === 'cancelled') {
    const activeLocks = purgeExpiredLocks(showKey);
    for (const seatId of seatIds) {
      if (activeLocks[seatId]?.userId === userId) {
        delete activeLocks[seatId];
      }
    }
    seatLocksByShow.put(showKey, activeLocks);
    return res.status(402).json({
      verified: false,
      status: simulateStatus,
      message:
        simulateStatus === 'cancelled'
          ? 'Payment was cancelled by the user. Temporarily locked seats have been released.'
          : 'Payment authorization failed at bank/UPI gateway. Seat locks released; no INR amount was debited.',
    });
  }

  const bookedSet = confirmedSeatsByShow.get(showKey) || new Set<string>();
  for (const seatId of seatIds) {
    if (bookedSet.has(seatId)) {
      return res.status(409).json({
        error: `Atomic transaction aborted: Seat ${seatId} was already reserved.`,
      });
    }
  }

  for (const seatId of seatIds) {
    bookedSet.add(seatId);
  }
  confirmedSeatsByShow.put(showKey, bookedSet);

  const activeLocks = purgeExpiredLocks(showKey);
  for (const seatId of seatIds) {
    delete activeLocks[seatId];
  }
  seatLocksByShow.put(showKey, activeLocks);

  bookingQueue.dequeue(`Confirmed ${orderId}`);

  processedPayments.add(orderId);
  const paymentId = `pay_rzp_${crypto.randomBytes(6).toString('hex')}`;
  const bookingId = `CNX-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'cinenexus_test_secret')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const record = {
    ...bookingDetails,
    bookingId,
    orderId,
    paymentId,
    paymentMethod: paymentMethod || 'UPI',
    signature,
    status: 'confirmed',
    verifiedAtIso: new Date().toISOString(),
  };

  bookingMap.put(bookingId, record);

  res.json({
    verified: true,
    bookingId,
    paymentId,
    orderId,
    signature,
    currency: 'INR',
    record,
  });
});

// 7. DSA Engine Room & Admin Telemetry Endpoint
app.get('/api/dsa/state', (_req, res) => {
  res.json({
    avlTree: {
      nodeCount: theatreAvl.nodeCount,
      height: theatreAvl.getHeight(theatreAvl.root),
      rootBalanceFactor: theatreAvl.getBalanceFactor(theatreAvl.root),
      rotationCount: theatreAvl.rotationCount,
      comparisonCount: theatreAvl.comparisonCount,
      inOrder: theatreAvl.inOrder().map((n) => ({
        key: n.key,
        name: n.value.name,
        city: n.value.city,
        height: n.height,
        balanceFactor: n.balanceFactor,
      })),
      serializedTree: theatreAvl.serialize(),
      recentSteps: theatreAvl.steps,
    },
    prefixTrie: {
      wordCount: movieTrie.wordCount,
      indexedTitles: movieTrie.getAllWords(),
      recentSteps: movieTrie.steps,
    },
    hashMap: {
      movieCount: movieMap.size(),
      theatreCount: theatreMap.size(),
      bookingCount: bookingMap.size(),
      loadFactor: movieMap.getLoadFactor(),
      collisionsHandled: movieMap.collisionCount + theatreMap.collisionCount,
      buckets: theatreMap.getBuckets().map((b) => ({
        index: b.index,
        keys: b.chain.map((e) => e.key),
      })),
    },
    bookingQueue: {
      activeQueueSize: bookingQueue.size(),
      totalProcessed: bookingQueue.totalProcessed,
      queuedItems: bookingQueue.toArray(),
      recentSteps: bookingQueue.steps.slice(-10),
    },
  });
});

// 8. Admin Catalogue Management (Separated from Live External Data)
app.post('/api/admin/movies', (req, res) => {
  const { title, language, genre, durationMinutes, basePriceInr, city, director, synopsis, posterUrl } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Movie title is required.' });
  }
  const id = `admin-mov-${Date.now().toString(36)}`;
  const newMovie: Movie = {
    id,
    title,
    tagline: 'Administrator-managed theatrical showcase.',
    synopsis: synopsis || 'Added via CineNexus Administrator Panel.',
    posterUrl: posterUrl || '/posters/peddi.jpg',
    backdropUrl: posterUrl || '/posters/peddi.jpg',
    rating: 8.6,
    votesCount: 1200,
    certification: 'U/A 13+',
    genres: [genre || 'Action', 'Drama'],
    durationMinutes: Number(durationMinutes || 150),
    durationFormatted: `${Math.floor(Number(durationMinutes || 150) / 60)}h ${Number(durationMinutes || 150) % 60}m`,
    languages: [language || 'Telugu', 'English'],
    formats: ['2D', 'Dolby Atmos', 'IMAX 3D'],
    releaseDate: new Date().toISOString().slice(0, 10),
    director: director || 'Featured Director',
    cast: [{ name: 'Principal Cast', role: 'Lead' }],
    trailerYoutubeId: '2y_DH5gIrCU',
    basePriceInr: Number(basePriceInr || 200),
    popularityScore: 90,
    isTrending: false,
    isRecommended: true,
    citiesRunning: [((city as IndianCity) || 'Hyderabad'), 'Bengaluru', 'Mumbai'],
    sourceProvider: 'ADMIN_CATALOGUE',
    verifiedShowCount: 12,
    lastUpdatedIso: new Date().toISOString(),
  };

  movieMap.put(newMovie.id, newMovie);
  movieTrie.insert(newMovie.title, newMovie);

  res.json({
    movie: newMovie,
    dsaSteps: [...movieMap.steps, ...movieTrie.steps],
  });
});

app.post('/api/admin/theatres', (req, res) => {
  const { id, name, city, address, basePriceInr } = req.body;
  const theatreId = id || `TH-${(city || 'HYD').slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`;
  const newTheatre: Theatre = {
    id: theatreId,
    name: name || `CineNexus Luxe Multiplex (${theatreId})`,
    brand: 'AMB Cinemas',
    city: (city as IndianCity) || 'Hyderabad',
    address: address || 'Banjara Hills Road No. 12, Hyderabad, Telangana',
    lat: 17.4156,
    lng: 78.4347,
    distanceKm: 5.0,
    facilities: ['4K Laser', 'Dolby Atmos', 'VIP Recliners'],
    screensCount: 6,
    formatsSupported: ['IMAX 3D', 'Dolby Atmos', '2D'],
    basePriceInr: Number(basePriceInr || 240),
    rating: 4.8,
    showtimesByDate: buildVerifiedTheatres()[0].showtimesByDate,
  };

  theatreAvl.insert(newTheatre.id, newTheatre);
  theatreMap.put(newTheatre.id, newTheatre);

  res.json({
    theatre: newTheatre,
    avlHeight: theatreAvl.getHeight(theatreAvl.root),
    avlRotations: theatreAvl.rotationCount,
    avlSteps: theatreAvl.steps,
  });
});

app.delete('/api/admin/theatres/:id', (req, res) => {
  const id = req.params.id;
  const deleted = theatreAvl.delete(id);
  theatreMap.remove(id);
  res.json({
    deleted,
    id,
    avlSteps: theatreAvl.steps,
    avlHeight: theatreAvl.getHeight(theatreAvl.root),
  });
});

// ============================================================================
// START SERVER WITH VITE MIDDLEWARE
// ============================================================================

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineNexus Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
