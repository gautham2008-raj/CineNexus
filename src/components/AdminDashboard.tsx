import React, { useEffect, useState } from 'react';
import {
  Building2,
  Film,
  ListOrdered,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  IndianRupee,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { BookingSummaryData, IndianCity, Movie, Theatre } from '../types/cinema.ts';

interface AdminDashboardProps {
  movies: Movie[];
  theatres: Theatre[];
  bookings: BookingSummaryData[];
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  movies,
  theatres,
  bookings,
  onRefreshData,
}) => {
  const [dsaState, setDsaState] = useState<any>(null);
  const [movieTitle, setMovieTitle] = useState('');
  const [movieLanguage, setMovieLanguage] = useState('Telugu');
  const [movieGenre, setMovieGenre] = useState('Action');
  const [movieDuration, setMovieDuration] = useState('160');
  const [moviePrice, setMoviePrice] = useState('220');
  const [movieDirector, setMovieDirector] = useState('');

  const [theatreId, setTheatreId] = useState('TH-HYD-08');
  const [theatreName, setTheatreName] = useState('Asian MCube Mall: Attapur');
  const [theatreCity, setTheatreCity] = useState<IndianCity>('Hyderabad');
  const [theatreAddress, setTheatreAddress] = useState('Attapur Main Rd, Hyderabad, Telangana');
  const [theatrePrice, setTheatrePrice] = useState('210');

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchBackendDsaTelemetry = async () => {
    try {
      const res = await fetch('/api/dsa/state');
      if (res.ok) {
        const data = await res.json();
        setDsaState(data);
      }
    } catch (e) {
      console.error('Failed to fetch DSA state:', e);
    }
  };

  useEffect(() => {
    fetchBackendDsaTelemetry();
  }, []);

  const handleAddCatalogueMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieTitle.trim()) return;
    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: movieTitle.trim(),
          language: movieLanguage,
          genre: movieGenre,
          durationMinutes: Number(movieDuration),
          basePriceInr: Number(moviePrice),
          city: 'Hyderabad',
          director: movieDirector.trim() || 'Catalogue Director',
        }),
      });
      if (res.ok) {
        setMovieTitle('');
        setActionNotice(
          `Added "${movieTitle}" to Admin Catalogue (Tagged as ADMIN_CATALOGUE, indexed into Prefix Trie & HashMap).`
        );
        onRefreshData();
        fetchBackendDsaTelemetry();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAvlTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theatreName.trim()) return;
    try {
      const res = await fetch('/api/admin/theatres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: theatreId.trim().toUpperCase(),
          name: theatreName.trim(),
          city: theatreCity,
          address: theatreAddress.trim(),
          basePriceInr: Number(theatrePrice),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice(
          `Inserted Theatre "${data.theatre.name}" (${data.theatre.id}) into Backend AVL Tree (Tree Height=${data.avlHeight}, Total Rotations=${data.avlRotations}).`
        );
        const nextNum = theatres.length + 3;
        setTheatreId(`TH-${theatreCity.slice(0, 3).toUpperCase()}-${String(nextNum).padStart(2, '0')}`);
        setTheatreName(`CineNexus Luxe Multiplex #${nextNum}`);
        onRefreshData();
        fetchBackendDsaTelemetry();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTheatre = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/theatres/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionNotice(`Deleted Theatre ${id} and rebalanced Backend AVL Tree.`);
        onRefreshData();
        fetchBackendDsaTelemetry();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalRevenueInr = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.totalAmountInr, 0);

  const liveMovies = movies.filter((m) => m.sourceProvider !== 'ADMIN_CATALOGUE');
  const adminCatalogueMovies = movies.filter((m) => m.sourceProvider === 'ADMIN_CATALOGUE');

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 tracking-wider">
            ADMINISTRATOR CONTROL CONSOLE
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            CineNexus Operations, Catalogue & DSA Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administrator-managed catalogue records are strictly separated from external live
            theatrical provider feeds.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onRefreshData();
            fetchBackendDsaTelemetry();
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-rose-400" />
          <span>Sync Backend Telemetry</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs text-emerald-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Verified Live vs Admin Movies</span>
            <Film className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums">
            {liveMovies.length} Live / {adminCatalogueMovies.length} Admin
          </div>
          <div className="text-[11px] text-slate-500">Prefix Trie Indexed: {dsaState?.prefixTrie?.wordCount ?? movies.length}</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>AVL Tree Indexed Theatres</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums">
            {dsaState?.avlTree?.nodeCount ?? theatres.length} Theatres
          </div>
          <div className="text-[11px] text-slate-500">
            Tree Height: {dsaState?.avlTree?.height ?? 4} · Rotations: {dsaState?.avlTree?.rotationCount ?? 6}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Verified INR Gross Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
            ₹{totalRevenueInr.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500">
            {bookings.length} Total Bookings in HashMap
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>FIFO Booking Queue Processed</span>
            <ListOrdered className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white tabular-nums">
            {dsaState?.bookingQueue?.totalProcessed ?? bookings.length} Requests
          </div>
          <div className="text-[11px] text-slate-500">
            Active Queue Length: {dsaState?.bookingQueue?.activeQueueSize ?? 0}
          </div>
        </div>
      </div>

      {/* Two-Column Admin Forms: Add Catalogue Movie & Manage AVL Theatres */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Add Administrator Catalogue Movie */}
        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
          <div>
            <span className="text-xs font-semibold text-amber-400">
              ADMIN CATALOGUE (SEPARATED FROM LIVE FEED)
            </span>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">
              Add Movie to Application Catalogue
            </h2>
          </div>

          <form onSubmit={handleAddCatalogueMovie} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="e.g. Salaar: Part 2 – Shouryaanga Parvam"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Director</label>
                <input
                  type="text"
                  value={movieDirector}
                  onChange={(e) => setMovieDirector(e.target.value)}
                  placeholder="e.g. Prashanth Neel"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Language</label>
                <select
                  value={movieLanguage}
                  onChange={(e) => setMovieLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                >
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Duration (mins)</label>
                <input
                  type="number"
                  value={movieDuration}
                  onChange={(e) => setMovieDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Base Price (₹ INR)</label>
                <input
                  type="number"
                  value={moviePrice}
                  onChange={(e) => setMoviePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insert into Prefix Trie & Admin Catalogue</span>
            </button>
          </form>
        </div>

        {/* Form 2: Insert Theatre into Backend AVL Tree */}
        <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400">
              AVL TREE THEATRE INDEXING (O(log n))
            </span>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">
              Insert New Multiplex into AVL Index
            </h2>
          </div>

          <form onSubmit={handleAddAvlTheatre} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Theatre AVL Key ID</label>
                <input
                  type="text"
                  required
                  value={theatreId}
                  onChange={(e) => setTheatreId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">City</label>
                <select
                  value={theatreCity}
                  onChange={(e) => setTheatreCity(e.target.value as IndianCity)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                >
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Kochi">Kochi</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Multiplex Name</label>
                <input
                  type="text"
                  required
                  value={theatreName}
                  onChange={(e) => setTheatreName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Base Ticket (₹ INR)</label>
                <input
                  type="number"
                  value={theatrePrice}
                  onChange={(e) => setTheatrePrice(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Theatre & Rebalance AVL Tree</span>
            </button>
          </form>
        </div>
      </div>

      {/* Indexed Theatres Table (AVL In-Order Traversal) */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-4">
        <h3 className="font-display text-lg font-bold text-white">
          AVL Tree In-Order Theatre Directory ({theatres.length} Indexed Multiplexes)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-3">AVL Key</th>
                <th className="py-2.5 px-3">Theatre Name</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Screens & Formats</th>
                <th className="py-2.5 px-3">Base Price (₹)</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {theatres.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-mono font-semibold text-amber-400">{t.id}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{t.name}</td>
                  <td className="py-2.5 px-3 text-slate-300">{t.city}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {t.screensCount} Screens · {t.formatsSupported.join(', ')}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-emerald-400 tabular-nums">
                    ₹{t.basePriceInr}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTheatre(t.id)}
                      className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      Delete Node
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
