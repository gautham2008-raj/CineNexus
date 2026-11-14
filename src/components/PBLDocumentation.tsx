import React from 'react';
import {
  BookOpen,
  Cpu,
  Database,
  FileCode2,
  GitBranch,
  Layers,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const PBLDocumentation: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-8 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
        <span className="text-xs font-semibold text-rose-400 tracking-wider">
          ADVANCED DATA STRUCTURES & ALGORITHMS — PBL PROJECT REPORT
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          CineNexus: Next-Generation 3D Movie Ticket Booking & Algorithmic Engine
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Complete technical specification, system architecture, database ER schema, and complexity
          analysis of the five foundational data structures (AVL Tree, Prefix Trie, HashMap, Merge
          Sort, and FIFO Queue).
        </p>
      </div>

      {/* Sections 1 to 5: Abstract, Problem Statement, Objectives, Existing vs Proposed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">01. Abstract</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            CineNexus is a next-generation theatrical ticket reservation platform that bridges
            spatial WebGL/Three.js 3D auditorium visualization with rigorous computer science data
            structures. Unlike conventional 2D grid booking platforms, CineNexus renders a
            perspective-accurate 3D cinema hall where patrons inspect sightlines from individual
            chairs while backend indexing, prefix search, sorting, and seat-lock concurrency are
            powered by deterministic AVL Trees, Prefix Tries, Polynomial HashMaps, Recursive Merge
            Sort, and FIFO Queues.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">02. Problem Statement</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Existing ticket booking portals suffer from three key limitations: (1) Flat 2D seat
            grids fail to convey screen elevation, viewing angles, or stadium riser heights; (2)
            Linear array scans degrade search and sorting latency during blockbuster release spikes;
            and (3) Unordered concurrent seat requests lead to race conditions or double bookings
            during checkout.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            03. Existing System vs. 04. Proposed System
          </h2>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li>
              <strong className="text-rose-400">Existing Systems (BookMyShow / District):</strong>{' '}
              Rely on static 2D SVG grids with no sightline preview and opaque black-box backend
              filtering.
            </li>
            <li>
              <strong className="text-emerald-400">Proposed CineNexus System:</strong> Combines
              interactive Three.js 3D stadium seating, live verified city schedules, Google Maps
              Routes API navigation, Razorpay INR checkout, QR cryptographic tickets, and an
              inspectable 5-module DSA Engine Room.
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-3">
          <h2 className="font-display text-lg font-bold text-white">05. Core Objectives</h2>
          <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
            <li>• Achieve O(log n) balanced theatre indexing via self-balancing AVL Tree rotations.</li>
            <li>• Deliver O(L) keystroke movie title autocomplete using a character Prefix Trie.</li>
            <li>• Guarantee O(1) average seat, lock, and booking lookup via Separate Chaining HashMaps.</li>
            <li>• Provide stable O(n log n) multi-criteria sorting via Recursive Merge Sort.</li>
            <li>• Enforce fair FIFO booking request processing with atomic seat-lock expiration.</li>
          </ul>
        </div>
      </div>

      {/* Section 6: Complexity Matrix */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          06. Implemented Data Structures & Complexity Analysis
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-3 px-3">Data Structure</th>
                <th className="py-3 px-3">CineNexus Application</th>
                <th className="py-3 px-3">Time Complexity</th>
                <th className="py-3 px-3">Space Complexity</th>
                <th className="py-3 px-3">Key Operations Implemented</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              <tr>
                <td className="py-3 px-3 font-semibold text-white">1. AVL Tree</td>
                <td className="py-3 px-3">Height-balanced Theatre ID Index</td>
                <td className="py-3 px-3 font-mono text-emerald-400">
                  Search/Insert/Delete: O(log n)
                </td>
                <td className="py-3 px-3 font-mono">O(n)</td>
                <td className="py-3 px-3">
                  Insert, Delete, Search, Height, Balance Factor, LL, RR, LR, RL Rotations
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">2. Prefix Trie</td>
                <td className="py-3 px-3">Homepage Movie Title Autocomplete</td>
                <td className="py-3 px-3 font-mono text-emerald-400">
                  Prefix Search: O(L)
                </td>
                <td className="py-3 px-3 font-mono">O(Σ · L · N)</td>
                <td className="py-3 px-3">
                  Insert, Exact Search, Prefix Traversal, DFS Autocomplete, Node Pruning Delete
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">3. Custom HashMap</td>
                <td className="py-3 px-3">User, Movie, Theatre, Booking & Seat Locks</td>
                <td className="py-3 px-3 font-mono text-emerald-400">
                  Put/Get/Remove: O(1) avg
                </td>
                <td className="py-3 px-3 font-mono">O(n + B)</td>
                <td className="py-3 px-3">
                  Polynomial Rolling Hash (p=31), Separate Chaining Linked Buckets
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">4. Merge Sort</td>
                <td className="py-3 px-3">Stable Sorting (Rating, Price, Duration)</td>
                <td className="py-3 px-3 font-mono text-amber-400">
                  Best/Avg/Worst: O(n log n)
                </td>
                <td className="py-3 px-3 font-mono">O(n) auxiliary</td>
                <td className="py-3 px-3">
                  Recursive Divide-and-Conquer Split, Stable Comparator Merge
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">5. FIFO Queue</td>
                <td className="py-3 px-3">Concurrent Seat Lock & Waitlist Ordering</td>
                <td className="py-3 px-3 font-mono text-emerald-400">
                  Enqueue/Dequeue/Peek: O(1)
                </td>
                <td className="py-3 px-3 font-mono">O(n)</td>
                <td className="py-3 px-3">
                  Head/Tail Pointer O(1) Enqueue, Dequeue, Peek, isEmpty + Atomic Lock Check
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 7: System Architecture & Database ER Diagram */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
        <h2 className="font-display text-xl font-bold text-white">
          07. System Architecture & Entity-Relationship (ER) Schema
        </h2>
        <pre className="p-4 rounded-xl bg-[#070a12] border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
{`┌─────────────────────────────────────────────────────────────────────────────┐
│                        CINENEXUS CLIENT (React 19 + TS)                     │
│  • Three.js 3D Auditorium (Raycasting + OrbitControls + RoomEnvironment)    │
│  • @vis.gl/react-google-maps (AdvancedMarker + Route.computeRoutes)         │
│  • DSA Engine Room Visualizers + jsPDF & QRCodeSVG Digital Ticket Generator │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ REST APIs (/api/*) + Firestore Zero-Trust SDK
┌───────────────────────────────▼─────────────────────────────────────────────┐
│                   CINENEXUS EXPRESS BACKEND + DSA ENGINE                    │
│  [AVLTree: Theatres] [PrefixTrie: Movies] [CustomHashMap: Seats & Bookings] │
│  [MergeSort: Catalogue Comparator] [FIFOQueue: Atomic Seat Lock Ordering]   │
└──────────┬────────────────────────────┬──────────────────────────┬──────────┘
           │                            │                          │
┌──────────▼──────────┐      ┌──────────▼──────────┐    ┌──────────▼──────────┐
│ Firebase Auth &     │      │ Live 2026 Movie &   │    │ Google Maps Routes  │
│ Hardened Firestore  │      │ Showtime Provider   │    │ & AdvancedMarker    │
│ (/users, /bookings, │      │ + Razorpay INR Test │    │ Geospatial Engine   │
│  /watchlists)       │      │ Signature Verifier  │    │                     │
└─────────────────────┘      └─────────────────────┘    └─────────────────────┘

ENTITY-RELATIONSHIP (ER) DIAGRAM:
[USER_PROFILE (uid PK)] 1 ──────< N [BOOKING_RECORD (bookingId PK, userId FK)]
       │ 1                                   │ N
       │                                     ▼ 1
       └──────< N [WATCHLIST_ITEM]     [THEATRE_AVL_NODE (theatreId PK)]
                                             │ 1
                                             └──────< N [SHOWTIME_SLOT & SEAT_LOCK]`}
        </pre>
      </div>

      {/* Section 8: Functional & Non-Functional Requirements, Testing, Future Scope */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-2.5">
          <h3 className="font-display text-base font-bold text-white">
            08. Functional & Non-Functional Requirements
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Functional:</strong> User authentication, city-based live 2026 movie filtering,
            4-step language/date/theatre/showtime selection, 3D seat picking, INR GST computation,
            Razorpay test verification, QR PDF ticket generation, and interactive DSA visualization.
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Non-Functional:</strong> Zero-trust ABAC security rules, atomic seat-lock
            isolation (5-min TTL), software-WebGL fallback resilience, and sub-millisecond DSA
            operations.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-2.5">
          <h3 className="font-display text-base font-bold text-white">
            09. API Architecture & Testing
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            REST endpoints (`/api/movies`, `/api/movies/autocomplete`, `/api/theatres`,
            `/api/seats`, `/api/seats/lock`, `/api/payments/create-order`, `/api/payments/verify`,
            `/api/dsa/state`) validated against concurrent double-booking
            attempts, duplicate order IDs, and Dirty Dozen Firestore security payloads.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-2.5">
          <h3 className="font-display text-base font-bold text-white">10. Future Scope</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Integration with spatial WebXR / Apple Vision Pro headsets for virtual trailer previews
            from the selected 3D seat, dynamic surge pricing using Graph shortest-path demand
            models, and group split-payment UPI checkout links.
          </p>
        </div>
      </div>
    </div>
  );
};
