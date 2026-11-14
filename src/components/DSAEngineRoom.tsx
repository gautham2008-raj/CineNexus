import React, { useState, useMemo } from 'react';
import {
  AVLTree,
  AVLNodeSerialized,
  PrefixTrie,
  CustomHashMap,
  MergeSort,
  FIFOQueue,
} from '../dsa/dataStructures.ts';
import {
  GitBranch,
  Search,
  Hash,
  ArrowUpDown,
  ListOrdered,
  Plus,
  Trash2,
  Activity,
  BookOpen,
  Layers,
  Cpu,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { buildVerifiedRunningMovies, buildVerifiedTheatres } from '../data/liveCinemaProvider.ts';

export const DSAEngineRoom: React.FC = () => {
  const [activeModule, setActiveModule] = useState<
    'overview' | 'avl' | 'trie' | 'hashmap' | 'mergesort' | 'queue'
  >('avl');

  // ==========================================================================
  // 1. AVL TREE INTERACTIVE STATE
  // ==========================================================================
  const [avlInstance] = useState(() => {
    const tree = new AVLTree<{ name: string; city: string }>();
    const sampleTheatres = buildVerifiedTheatres().slice(0, 7);
    for (const t of sampleTheatres) {
      tree.insert(t.id, { name: t.name, city: t.city });
    }
    return tree;
  });
  const [avlVersion, setAvlVersion] = useState(0);
  const [avlKeyInput, setAvlKeyInput] = useState('TH-HYD-09');
  const [avlNameInput, setAvlNameInput] = useState('Prasads IMAX Laser Dome');
  const [avlHighlightKey, setAvlHighlightKey] = useState<string | null>(null);
  const [avlStepsLog, setAvlStepsLog] = useState<string[]>(avlInstance.steps);

  const serializedAvl = useMemo(() => {
    void avlVersion;
    return avlInstance.serialize();
  }, [avlInstance, avlVersion]);

  const handleAvlInsert = () => {
    if (!avlKeyInput.trim()) return;
    avlInstance.insert(avlKeyInput.trim().toUpperCase(), {
      name: avlNameInput.trim() || 'CineNexus Multiplex',
      city: 'Hyderabad',
    });
    setAvlHighlightKey(avlKeyInput.trim().toUpperCase());
    setAvlStepsLog([...avlInstance.steps]);
    setAvlVersion((v) => v + 1);
  };

  const handleAvlSearch = () => {
    if (!avlKeyInput.trim()) return;
    const res = avlInstance.search(avlKeyInput.trim().toUpperCase());
    setAvlHighlightKey(res.found ? avlKeyInput.trim().toUpperCase() : null);
    setAvlStepsLog([...res.steps]);
    setAvlVersion((v) => v + 1);
  };

  const handleAvlDelete = () => {
    if (!avlKeyInput.trim()) return;
    avlInstance.delete(avlKeyInput.trim().toUpperCase());
    setAvlHighlightKey(null);
    setAvlStepsLog([...avlInstance.steps]);
    setAvlVersion((v) => v + 1);
  };

  // ==========================================================================
  // 2. PREFIX TRIE INTERACTIVE STATE
  // ==========================================================================
  const [trieInstance] = useState(() => {
    const t = new PrefixTrie<string>();
    const movies = buildVerifiedRunningMovies();
    for (const m of movies) {
      t.insert(m.title, m.genres.join(', '));
    }
    return t;
  });
  const [triePrefix, setTriePrefix] = useState('Ra');
  const [trieNewTitle, setTrieNewTitle] = useState('Spirit: Cop Action Drama');
  const [trieVersion, setTrieVersion] = useState(0);

  const trieAutocompleteResult = useMemo(() => {
    void trieVersion;
    return trieInstance.autocomplete(triePrefix, 8);
  }, [trieInstance, triePrefix, trieVersion]);

  // ==========================================================================
  // 3. HASHMAP INTERACTIVE STATE
  // ==========================================================================
  const [hashInstance] = useState(() => {
    const map = new CustomHashMap<string>(12);
    map.put('CNX-901A', 'Seat E5, E6 · Peddi · ₹590');
    map.put('CNX-902B', 'Seat H4, H5 · Ramayana: Part 1 · ₹990');
    map.put('CNX-903C', 'Seat C7 · The RajaSaab · ₹240');
    map.put('A5', 'Standard Row A Seat 5 · ₹180');
    map.put('J8', 'VIP Recliner Row J Seat 8 · ₹420');
    map.put('E6', 'Executive Row E Seat 6 · ₹250');
    return map;
  });
  const [hashKey, setHashKey] = useState('CNX-904D');
  const [hashValue, setHashValue] = useState('Seat I5, I6 · Spider-Man: Brand New Day · ₹840');
  const [hashLookupOutput, setHashLookupOutput] = useState<string | null>(null);
  const [hashSteps, setHashSteps] = useState<string[]>(hashInstance.steps);
  const [hashVersion, setHashVersion] = useState(0);

  const hashBuckets = useMemo(() => {
    void hashVersion;
    return hashInstance.getBuckets();
  }, [hashInstance, hashVersion]);

  // Compute live step-by-step polynomial rolling hash breakdown for the typed hashKey
  const liveHashBreakdown = useMemo(() => {
    const cleanKey = hashKey.trim() || 'CNX-904D';
    const prime = 31;
    let runningHash = 0;
    const charSteps: { char: string; code: number;runningHash: number }[] = [];
    for (let i = 0; i < cleanKey.length; i++) {
      const code = cleanKey.charCodeAt(i);
      runningHash = (runningHash * prime + code) >>> 0;
      charSteps.push({ char: cleanKey[i], code, runningHash });
    }
    const bucketIdx = runningHash % 12;
    return { cleanKey, runningHash, bucketIdx, charSteps };
  }, [hashKey]);

  // ==========================================================================
  // 4. MERGE SORT INTERACTIVE STATE
  // ==========================================================================
  const [sortCriterion, setSortCriterion] = useState<'rating' | 'price' | 'duration' | 'popularity'>('rating');
  const mergeSortResult = useMemo(() => {
    const movies = buildVerifiedRunningMovies();
    const comparator = (a: (typeof movies)[0], b: (typeof movies)[0]) => {
      if (sortCriterion === 'rating') return b.rating - a.rating;
      if (sortCriterion === 'price') return a.basePriceInr - b.basePriceInr;
      if (sortCriterion === 'duration') return b.durationMinutes - a.durationMinutes;
      return b.popularityScore - a.popularityScore;
    };
    return MergeSort.sort(
      movies,
      comparator,
      (m) => `${m.title.split(':')[0]} (${sortCriterion === 'rating' ? `★${m.rating}` : sortCriterion === 'price' ? `₹${m.basePriceInr}` : `${m.durationMinutes}m`})`
    );
  }, [sortCriterion]);

  // ==========================================================================
  // 5. FIFO QUEUE INTERACTIVE STATE
  // ==========================================================================
  const [queueInstance] = useState(() => {
    const q = new FIFOQueue<{ id: string; patron: string; seats: string; price: string }>();
    q.enqueue({ id: 'REQ-101', patron: 'Ananya Rao', seats: 'H5, H6 (VIP)', price: '₹840' }, 'REQ-101');
    q.enqueue({ id: 'REQ-102', patron: 'Vikram Aditya', seats: 'E6, E7, E8', price: '₹750' }, 'REQ-102');
    q.enqueue({ id: 'REQ-103', patron: 'Sneha Reddy', seats: 'A4, A5', price: '₹360' }, 'REQ-103');
    return q;
  });
  const [queuePatron, setQueuePatron] = useState('Karthikeya V.');
  const [queueSeats, setQueueSeats] = useState('J4, J5 (Recliner)');
  const [queueVersion, setQueueVersion] = useState(0);
  const [queueLastDeq, setQueueLastDeq] = useState<string | null>(null);

  const queueItems = useMemo(() => {
    void queueVersion;
    return queueInstance.toArray();
  }, [queueInstance, queueVersion]);

  // ==========================================================================
  // 6. INTERACTIVE BENCHMARK SUITE
  // ==========================================================================
  const [benchmarkSize, setBenchmarkSize] = useState<number>(500);
  const benchmarkMetrics = useMemo(() => {
    const N = benchmarkSize;

    // 1. AVL Benchmark
    const t0 = performance.now();
    const benchAvl = new AVLTree<number>();
    for (let i = 0; i < N; i++) {
      benchAvl.insert(`TH-${String(i).padStart(5, '0')}`, i);
    }
    benchAvl.search(`TH-${String(Math.floor(N / 2)).padStart(5, '0')}`);
    const avlMs = Number((performance.now() - t0).toFixed(2));

    // 2. Prefix Trie Benchmark
    const t1 = performance.now();
    const benchTrie = new PrefixTrie<number>();
    for (let i = 0; i < N; i++) {
      benchTrie.insert(`Movie_Release_${i}`, i);
    }
    benchTrie.autocomplete('Movie_Release_1', 10);
    const trieMs = Number((performance.now() - t1).toFixed(2));

    // 3. HashMap Benchmark
    const t2 = performance.now();
    const benchHash = new CustomHashMap<number>(Math.max(32, Math.floor(N / 2)));
    for (let i = 0; i < N; i++) {
      benchHash.put(`SEAT-${i}`, i);
    }
    benchHash.get(`SEAT-${Math.floor(N / 2)}`);
    const hashMs = Number((performance.now() - t2).toFixed(2));

    // 4. Merge Sort Benchmark
    const t3 = performance.now();
    const sampleArr = Array.from({ length: N }, (_, idx) => (idx * 73) % 997);
    const msRes = MergeSort.sort(sampleArr, (a, b) => a - b);
    const mergeMs = Number((performance.now() - t3).toFixed(2));

    // 5. FIFO Queue Benchmark
    const t4 = performance.now();
    const benchQ = new FIFOQueue<number>();
    for (let i = 0; i < N; i++) benchQ.enqueue(i);
    for (let i = 0; i < Math.floor(N / 2); i++) benchQ.dequeue();
    const queueMs = Number((performance.now() - t4).toFixed(2));

    return {
      avlMs,
      avlRotations: benchAvl.rotationCount,
      avlHeight: benchAvl.getHeight(benchAvl.root),
      trieMs,
      hashMs,
      hashCollisions: benchHash.collisionCount,
      mergeMs,
      mergeComparisons: msRes.comparisons,
      queueMs,
    };
  }, [benchmarkSize]);

  // Helper to render AVL Tree SVG nodes recursively
  const renderAvlSvgNodes = (
    node: AVLNodeSerialized<{ name: string; city: string }> | null,
    x: number,
    y: number,
    spread: number
  ): React.ReactNode[] => {
    if (!node) return [];
    const elements: React.ReactNode[] = [];

    if (node.left) {
      const childX = x - spread;
      const childY = y + 74;
      elements.push(
        <line
          key={`line-l-${node.key}`}
          x1={x}
          y1={y}
          x2={childX}
          y2={childY}
          stroke="#475569"
          strokeWidth={2}
        />
      );
      elements.push(...renderAvlSvgNodes(node.left, childX, childY, spread * 0.52));
    }

    if (node.right) {
      const childX = x + spread;
      const childY = y + 74;
      elements.push(
        <line
          key={`line-r-${node.key}`}
          x1={x}
          y1={y}
          x2={childX}
          y2={childY}
          stroke="#475569"
          strokeWidth={2}
        />
      );
      elements.push(...renderAvlSvgNodes(node.right, childX, childY, spread * 0.52));
    }

    const isHighlighted = avlHighlightKey === node.key;
    elements.push(
      <g key={`node-${node.key}`} transform={`translate(${x}, ${y})`}>
        <rect
          x={-48}
          y={-22}
          width={96}
          height={44}
          rx={10}
          fill={isHighlighted ? '#e11d48' : '#0f172a'}
          stroke={isHighlighted ? '#fbbf24' : '#38bdf8'}
          strokeWidth={isHighlighted ? 2.5 : 1.5}
        />
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          {node.key}
        </text>
        <text
          x={0}
          y={12}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
        >
          h={node.height} · BF={node.balanceFactor}
        </text>
      </g>
    );

    return elements;
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 tracking-wider">
            ADVANCED DATA STRUCTURES PBL WORKBENCH & ARCHITECTURAL DIAGRAMS
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            DSA Engine Room — Deep Explanations, SVG Diagrams & Live Visualizers
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Detailed theoretical architecture, structural SVG schematics, mathematical invariants,
            and interactive execution sandboxes for the 5 core data structures powering CineNexus.
          </p>
        </div>

        {/* Module Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-white/10 p-1.5 rounded-xl">
          {[
            { id: 'overview', label: '0. Full DSA Pipeline Diagram', icon: Layers },
            { id: 'avl', label: '1. AVL Tree', icon: GitBranch },
            { id: 'trie', label: '2. Prefix Trie', icon: Search },
            { id: 'hashmap', label: '3. HashMap', icon: Hash },
            { id: 'mergesort', label: '4. Merge Sort', icon: ArrowUpDown },
            { id: 'queue', label: '5. FIFO Queue', icon: ListOrdered },
          ].map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeModule === mod.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODULE 0: END-TO-END CINENEXUS DSA PIPELINE ARCHITECTURE DIAGRAM     */}
      {/* ==================================================================== */}
      {activeModule === 'overview' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  End-to-End CineNexus Booking Lifecycle & Data Structure Dataflow Diagram
                </h2>
                <p className="text-xs text-slate-400">
                  How all 5 Data Structures collaborate in real time from user search to QR ticket generation
                </p>
              </div>
              <span className="font-mono text-xs text-amber-400">
                5 Core Data Structures · Zero Mock Shortcuts
              </span>
            </div>

            {/* Master System Architecture SVG Diagram */}
            <div className="w-full overflow-x-auto bg-[#070a12] border border-white/10 rounded-xl p-5">
              <svg viewBox="0 0 1050 310" className="w-full h-auto min-w-[860px]">
                <defs>
                  <marker
                    id="arrow-rose"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                  </marker>
                  <marker
                    id="arrow-amber"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                  </marker>
                </defs>

                {/* Stage 1: Prefix Trie */}
                <g transform="translate(20, 45)">
                  <rect width="175" height="190" rx="14" fill="#0f172a" stroke="#f43f5e" strokeWidth="2" />
                  <rect x="12" y="12" width="151" height="26" rx="6" fill="#e11d48" />
                  <text x="87" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    1. PREFIX TRIE
                  </text>
                  <text x="87" y="58" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                    Movie Search Bar
                  </text>
                  <text x="87" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="JetBrains Mono">
                    Time: O(L) | Space: O(Σ·L)
                  </text>
                  <text x="87" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Traverses character nodes
                  </text>
                  <text x="87" y="120" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                    ROOT → &apos;r&apos; → &apos;a&apos; → &apos;m&apos;
                  </text>
                  <text x="87" y="144" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    DFS subtree harvests
                  </text>
                  <text x="87" y="160" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono">
                    &quot;Ramayana: Part 1&quot;
                  </text>
                </g>

                <line x1="195" y1="140" x2="225" y2="140" stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrow-rose)" />

                {/* Stage 2: Merge Sort */}
                <g transform="translate(230, 45)">
                  <rect width="175" height="190" rx="14" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
                  <rect x="12" y="12" width="151" height="26" rx="6" fill="#d97706" />
                  <text x="87" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    2. MERGE SORT
                  </text>
                  <text x="87" y="58" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                    Catalogue Sorter
                  </text>
                  <text x="87" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="JetBrains Mono">
                    Time: O(n log n) Stable
                  </text>
                  <text x="87" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Recursive Divide &amp; Conquer
                  </text>
                  <text x="87" y="120" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                    Split(L, R) → Merge()
                  </text>
                  <text x="87" y="144" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Orders by Rating, ₹ Price,
                  </text>
                  <text x="87" y="160" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono">
                    Duration, or Popularity
                  </text>
                </g>

                <line x1="405" y1="140" x2="435" y2="140" stroke="#fbbf24" strokeWidth="2.5" markerEnd="url(#arrow-amber)" />

                {/* Stage 3: AVL Tree */}
                <g transform="translate(440, 45)">
                  <rect width="175" height="190" rx="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="12" y="12" width="151" height="26" rx="6" fill="#0284c7" />
                  <text x="87" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    3. AVL TREE
                  </text>
                  <text x="87" y="58" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                    Theatre ID Index
                  </text>
                  <text x="87" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="JetBrains Mono">
                    Time: O(log n) Balanced
                  </text>
                  <text x="87" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Enforces |BF| ≤ 1 via
                  </text>
                  <text x="87" y="120" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                    LL / RR / LR / RL Rotations
                  </text>
                  <text x="87" y="144" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Finds Multiplex &amp; Shows:
                  </text>
                  <text x="87" y="160" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono">
                    Key: &quot;TH-HYD-01&quot;
                  </text>
                </g>

                <line x1="615" y1="140" x2="645" y2="140" stroke="#f43f5e" strokeWidth="2.5" markerEnd="url(#arrow-rose)" />

                {/* Stage 4: FIFO Queue */}
                <g transform="translate(650, 45)">
                  <rect width="175" height="190" rx="14" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                  <rect x="12" y="12" width="151" height="26" rx="6" fill="#9333ea" />
                  <text x="87" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    4. FIFO QUEUE
                  </text>
                  <text x="87" y="58" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                    Seat Lock Serializer
                  </text>
                  <text x="87" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="JetBrains Mono">
                    Enqueue/Dequeue: O(1)
                  </text>
                  <text x="87" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Linked-List Head &amp; Tail
                  </text>
                  <text x="87" y="120" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                    HEAD → [REQ-1] → TAIL
                  </text>
                  <text x="87" y="144" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Eliminates race conditions
                  </text>
                  <text x="87" y="160" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono">
                    on 3D Seat Click
                  </text>
                </g>

                <line x1="825" y1="140" x2="855" y2="140" stroke="#fbbf24" strokeWidth="2.5" markerEnd="url(#arrow-amber)" />

                {/* Stage 5: HashMap */}
                <g transform="translate(860, 45)">
                  <rect width="175" height="190" rx="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <rect x="12" y="12" width="151" height="26" rx="6" fill="#059669" />
                  <text x="87" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">
                    5. HASHMAP
                  </text>
                  <text x="87" y="58" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="Plus Jakarta Sans">
                    Seat &amp; Ticket Store
                  </text>
                  <text x="87" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="JetBrains Mono">
                    Lookup/Put: O(1) Avg
                  </text>
                  <text x="87" y="104" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Polynomial Hash (p = 31)
                  </text>
                  <text x="87" y="120" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
                    h(k) = Σ s[i]·31^i mod M
                  </text>
                  <text x="87" y="144" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Separate Chaining Buckets
                  </text>
                  <text x="87" y="160" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono">
                    Issues QR Pass O(1)
                  </text>
                </g>

                {/* Bottom Pipeline Summary Caption */}
                <text x="525" y="275" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Plus Jakarta Sans">
                  Click any tab above (1. AVL Tree, 2. Prefix Trie, 3. HashMap, 4. Merge Sort, 5. FIFO Queue) to inspect its internal diagrams and run live operations.
                </text>
              </svg>
            </div>

            {/* Detailed Comparative Architecture Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                {
                  num: '01',
                  title: 'AVL Tree',
                  role: 'Theatre ID & Multiplex Indexing',
                  why: 'Unlike an unbalanced BST which degrades to O(n) when theatre IDs (TH-HYD-01, TH-HYD-02...) are inserted in sorted order, AVL rotations keep height strictly ≤ 1.44 log₂(n+2).',
                  time: 'O(log n)',
                  space: 'O(n)',
                  tab: 'avl',
                },
                {
                  num: '02',
                  title: 'Prefix Trie',
                  role: 'Instant Movie Title Autocomplete',
                  why: 'Scanning N movies with substring matching takes O(N × L). A Trie walks character edges in O(L) time independent of how many thousands of movies exist in the catalogue.',
                  time: 'O(L)',
                  space: 'O(Σ · L · N)',
                  tab: 'trie',
                },
                {
                  num: '03',
                  title: 'Custom HashMap',
                  role: 'O(1) Seat State & Booking Lookup',
                  why: 'When 120 3D chairs render or a user locks Seat H6, checking availability or retrieving a booking QR code by ID must happen in constant O(1) time via polynomial hashing.',
                  time: 'O(1) Avg',
                  space: 'O(N + M)',
                  tab: 'hashmap',
                },
                {
                  num: '04',
                  title: 'Merge Sort',
                  role: 'Stable Multi-Criteria Movie Sorter',
                  why: 'Guarantees worst-case O(n log n) performance and preserves relative order (stability) when sorting movies by Rating, INR Ticket Price, Duration, or Popularity.',
                  time: 'O(n log n)',
                  space: 'O(n)',
                  tab: 'mergesort',
                },
                {
                  num: '05',
                  title: 'FIFO Queue',
                  role: 'Concurrent Seat Lock Serializer',
                  why: 'During blockbuster ticket drops, hundreds of patrons click seats simultaneously. A linked-list FIFO Queue processes lock requests strictly in arrival order in O(1) time.',
                  time: 'O(1)',
                  space: 'O(K)',
                  tab: 'queue',
                },
              ].map((card) => (
                <div
                  key={card.num}
                  onClick={() => setActiveModule(card.tab as any)}
                  className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-rose-400 font-bold">DSA #{card.num}</span>
                      <span className="text-amber-400">{card.time}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-white">{card.title}</h3>
                    <div className="text-[11px] font-semibold text-emerald-400">{card.role}</div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-1">{card.why}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span>Space: {card.space}</span>
                    <span className="text-rose-400 flex items-center gap-1">
                      Inspect <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODULE 1: AVL TREE + DETAILED ROTATION DIAGRAMS & EXPLANATION        */}
      {/* ==================================================================== */}
      {activeModule === 'avl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    1. Self-Balancing AVL Tree — Theatre ID Index
                  </h2>
                  <p className="text-xs text-slate-400">
                    Maintains |Balance Factor| ≤ 1 via LL, RR, LR, and RL Rotations · Time: O(log n) · Space: O(n)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400">Nodes: {avlInstance.nodeCount}</span>
                  <span className="text-amber-400">
                    Height: {avlInstance.getHeight(avlInstance.root)}
                  </span>
                  <span className="text-rose-400">Rotations: {avlInstance.rotationCount}</span>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  value={avlKeyInput}
                  onChange={(e) => setAvlKeyInput(e.target.value)}
                  placeholder="Theatre ID (e.g. TH-HYD-09)"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-white"
                />
                <input
                  type="text"
                  value={avlNameInput}
                  onChange={(e) => setAvlNameInput(e.target.value)}
                  placeholder="Theatre Name"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white flex-1 min-w-[160px]"
                />
                <button
                  type="button"
                  onClick={handleAvlInsert}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert O(log n)</span>
                </button>
                <button
                  type="button"
                  onClick={handleAvlSearch}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search O(log n)</span>
                </button>
                <button
                  type="button"
                  onClick={handleAvlDelete}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete O(log n)</span>
                </button>
              </div>

              {/* Interactive SVG Tree Diagram */}
              <div className="w-full overflow-x-auto bg-[#070a12] border border-white/10 rounded-xl p-4">
                <svg viewBox="0 0 760 320" className="w-full h-[300px] min-w-[620px]">
                  {serializedAvl && renderAvlSvgNodes(serializedAvl, 380, 38, 175)}
                </svg>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Step-by-Step Execution & Rotation Trace
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs space-y-1.5 max-h-[260px] overflow-y-auto">
                {avlStepsLog.map((step, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="text-rose-400 mr-2">[{i + 1}]</span>
                    {step}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white">Mathematical Balance Invariant:</div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10 font-mono text-[11px] text-amber-400">
                  BF(N) = height(N.left) - height(N.right) ∈ &#123;-1, 0, +1&#125;
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Because Theatre IDs (`TH-HYD-01`, `TH-HYD-02`, `TH-HYD-03`) arrive in ascending
                  lexicographical order, a naive Binary Search Tree degenerates into a skewed linked
                  list with $O(n)$ lookup. The AVL Tree automatically triggers rotations whenever
                  $|BF(N)| &gt; 1$, bounding tree height to $O(\log_2 n)$.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed 4-Case AVL Rotation Diagrams & Algorithmic Deep Dive */}
          <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-5">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display text-lg font-bold text-white">
                AVL Tree 4-Case Rotation Reference Diagrams & Structural Mechanics
              </h3>
              <p className="text-xs text-slate-400">
                Visual schematics of how our `AVLTree` class in `src/dsa/dataStructures.ts` restores balance in O(1) pointer updates after insertion or deletion
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Case 1: LL Rotation */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold">1. LL Case (BF &gt; +1)</span>
                  <span className="text-emerald-400">Single Right Rotate</span>
                </div>
                <svg viewBox="0 0 240 130" className="w-full h-28">
                  {/* Unbalanced */}
                  <line x1="65" y1="25" x2="40" y2="60" stroke="#f43f5e" strokeWidth="2" />
                  <line x1="40" y1="60" x2="20" y2="95" stroke="#f43f5e" strokeWidth="2" />
                  <circle cx="65" cy="25" r="14" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="65" y="29" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(+2)</text>
                  <circle cx="40" cy="60" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="40" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(+1)</text>
                  <circle cx="20" cy="95" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="20" y="99" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>

                  {/* Arrow */}
                  <text x="112" y="65" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">⇒</text>

                  {/* Balanced */}
                  <line x1="175" y1="35" x2="145" y2="80" stroke="#10b981" strokeWidth="2" />
                  <line x1="175" y1="35" x2="205" y2="80" stroke="#10b981" strokeWidth="2" />
                  <circle cx="175" cy="35" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="175" y="39" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(0)</text>
                  <circle cx="145" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="145" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>
                  <circle cx="205" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="205" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(0)</text>
                </svg>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Triggered when a node is inserted into the <strong>left subtree of the left child</strong> (`BF(Z) = +2, BF(Y) ≥ 0`). Pivots `Y` up as the new subtree root via `rotateRight(Z)`.
                </p>
              </div>

              {/* Case 2: RR Rotation */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold">2. RR Case (BF &lt; -1)</span>
                  <span className="text-emerald-400">Single Left Rotate</span>
                </div>
                <svg viewBox="0 0 240 130" className="w-full h-28">
                  <line x1="25" y1="25" x2="50" y2="60" stroke="#f43f5e" strokeWidth="2" />
                  <line x1="50" y1="60" x2="75" y2="95" stroke="#f43f5e" strokeWidth="2" />
                  <circle cx="25" cy="25" r="14" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="25" y="29" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(-2)</text>
                  <circle cx="50" cy="60" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="50" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(-1)</text>
                  <circle cx="75" cy="95" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="75" y="99" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>

                  <text x="112" y="65" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">⇒</text>

                  <line x1="175" y1="35" x2="145" y2="80" stroke="#10b981" strokeWidth="2" />
                  <line x1="175" y1="35" x2="205" y2="80" stroke="#10b981" strokeWidth="2" />
                  <circle cx="175" cy="35" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="175" y="39" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(0)</text>
                  <circle cx="145" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="145" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(0)</text>
                  <circle cx="205" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="205" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>
                </svg>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Triggered when sequential Theatre IDs (`TH-HYD-01` → `02` → `03`) insert into the <strong>right subtree of the right child</strong> (`BF(Z) = -2`). Restored via `rotateLeft(Z)`.
                </p>
              </div>

              {/* Case 3: LR Rotation */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold">3. LR Case (+2, -1)</span>
                  <span className="text-emerald-400">Left-Right Rotate</span>
                </div>
                <svg viewBox="0 0 240 130" className="w-full h-28">
                  <line x1="65" y1="25" x2="30" y2="60" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="30" y1="60" x2="55" y2="95" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="65" cy="25" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="65" y="29" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(+2)</text>
                  <circle cx="30" cy="60" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="30" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(-1)</text>
                  <circle cx="55" cy="95" r="14" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                  <text x="55" y="99" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>

                  <text x="112" y="65" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">⇒</text>

                  <line x1="175" y1="35" x2="145" y2="80" stroke="#10b981" strokeWidth="2" />
                  <line x1="175" y1="35" x2="205" y2="80" stroke="#10b981" strokeWidth="2" />
                  <circle cx="175" cy="35" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="175" y="39" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>
                  <circle cx="145" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="145" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(0)</text>
                  <circle cx="205" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="205" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(0)</text>
                </svg>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Zig-zag imbalance on the left-right path (`BF(Z) = +2, BF(Y) = -1`). First performs `Z.left = rotateLeft(Y)` to straighten the spine, then `rotateRight(Z)` to promote `X`.
                </p>
              </div>

              {/* Case 4: RL Rotation */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold">4. RL Case (-2, +1)</span>
                  <span className="text-emerald-400">Right-Left Rotate</span>
                </div>
                <svg viewBox="0 0 240 130" className="w-full h-28">
                  <line x1="30" y1="25" x2="65" y2="60" stroke="#f59e0b" strokeWidth="2" />
                  <line x1="65" y1="60" x2="40" y2="95" stroke="#f59e0b" strokeWidth="2" />
                  <circle cx="30" cy="25" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="30" y="29" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(-2)</text>
                  <circle cx="65" cy="60" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="65" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(+1)</text>
                  <circle cx="40" cy="95" r="14" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
                  <text x="40" y="99" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>

                  <text x="112" y="65" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">⇒</text>

                  <line x1="175" y1="35" x2="145" y2="80" stroke="#10b981" strokeWidth="2" />
                  <line x1="175" y1="35" x2="205" y2="80" stroke="#10b981" strokeWidth="2" />
                  <circle cx="175" cy="35" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="175" y="39" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>
                  <circle cx="145" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="145" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(0)</text>
                  <circle cx="205" cy="80" r="14" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="205" y="84" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(0)</text>
                </svg>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Zig-zag imbalance on the right-left path (`BF(Z) = -2, BF(Y) = +1`). First performs `Z.right = rotateRight(Y)`, followed by `rotateLeft(Z)` so `X` becomes balanced root.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODULE 2: PREFIX TRIE + MULTI-BRANCH TREE DIAGRAM & EXPLANATION      */}
      {/* ==================================================================== */}
      {activeModule === 'trie' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    2. Prefix Trie — Real-Time Movie Title Autocomplete
                  </h2>
                  <p className="text-xs text-slate-400">
                    Prefix traversal complexity: O(L) where L is prefix length · Space: O(Alphabet × L × N)
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400">
                  Indexed 2026 Titles: {trieInstance.wordCount}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Live Prefix Search Input (Try &quot;Ra&quot;, &quot;Pe&quot;, &quot;Sp&quot;, &quot;Dr&quot;, &quot;To&quot;)
                  </label>
                  <input
                    type="text"
                    value={triePrefix}
                    onChange={(e) => setTriePrefix(e.target.value)}
                    placeholder="Type movie prefix..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-rose-500/50 rounded-xl text-sm font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Insert New Movie Title into Prefix Trie
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trieNewTitle}
                      onChange={(e) => setTrieNewTitle(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!trieNewTitle.trim()) return;
                        trieInstance.insert(trieNewTitle.trim(), 'Action, Drama');
                        setTriePrefix(trieNewTitle.trim().slice(0, 3));
                        setTrieVersion((v) => v + 1);
                      }}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      Insert Title
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Character Node Traversal Strip */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="text-xs text-slate-400">
                  Active O(L) Pointer Walk from `root` (L = {triePrefix.trim().length} character hops):
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-mono text-slate-300 border border-white/10">
                    ROOT
                  </span>
                  {triePrefix
                    .trim()
                    .toLowerCase()
                    .split('')
                    .map((ch, idx) => (
                      <React.Fragment key={idx}>
                        <span className="text-rose-400 font-mono">→</span>
                        <span className="w-9 h-9 rounded-xl bg-rose-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-md">
                          &apos;{ch}&apos;
                        </span>
                      </React.Fragment>
                    ))}
                  <span className="text-emerald-400 font-mono text-xs ml-2">
                    ⇒ DFS Subtree Collect ({trieAutocompleteResult.matchedTitles.length} matches)
                  </span>
                </div>
              </div>

              {/* Multi-Branch Trie Structural SVG Diagram */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-2 overflow-x-auto">
                <div className="text-xs font-semibold text-slate-300">
                  Prefix Trie Multi-Branch Character Tree Schematic (Shared Prefix Compression):
                </div>
                <svg viewBox="0 0 740 230" className="w-full h-52 min-w-[600px]">
                  {/* Root */}
                  <rect x="325" y="10" width="90" height="30" rx="8" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
                  <text x="370" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">ROOT</text>

                  {/* Level 1 edges */}
                  <line x1="345" y1="40" x2="140" y2="75" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="370" y1="40" x2="370" y2="75" stroke="#f43f5e" strokeWidth="2" />
                  <line x1="395" y1="40" x2="600" y2="75" stroke="#10b981" strokeWidth="2" />

                  {/* Branch 1: 'p' -> Peddi / Project Hail Mary / Patriot */}
                  <circle cx="140" cy="85" r="15" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <text x="140" y="89" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="JetBrains Mono">&apos;p&apos;</text>

                  <line x1="130" y1="98" x2="65" y2="135" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="140" y1="100" x2="140" y2="135" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="150" y1="98" x2="215" y2="135" stroke="#38bdf8" strokeWidth="1.5" />

                  <circle cx="65" cy="145" r="14" fill="#0f172a" stroke="#38bdf8" />
                  <text x="65" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">&apos;e&apos;</text>
                  <rect x="20" y="178" width="90" height="26" rx="6" fill="#064e3b" stroke="#10b981" />
                  <text x="65" y="195" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="JetBrains Mono">Peddi [END]</text>
                  <line x1="65" y1="159" x2="65" y2="178" stroke="#10b981" strokeDasharray="3 2" />

                  <circle cx="140" cy="145" r="14" fill="#0f172a" stroke="#38bdf8" />
                  <text x="140" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">&apos;a&apos;</text>
                  <rect x="98" y="178" width="85" height="26" rx="6" fill="#064e3b" stroke="#10b981" />
                  <text x="140" y="195" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="JetBrains Mono">Patriot [END]</text>
                  <line x1="140" y1="159" x2="140" y2="178" stroke="#10b981" strokeDasharray="3 2" />

                  <circle cx="215" cy="145" r="14" fill="#0f172a" stroke="#38bdf8" />
                  <text x="215" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">&apos;r&apos;</text>
                  <rect x="186" y="178" width="112" height="26" rx="6" fill="#064e3b" stroke="#10b981" />
                  <text x="242" y="195" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="JetBrains Mono">Project Hail [END]</text>
                  <line x1="215" y1="159" x2="230" y2="178" stroke="#10b981" strokeDasharray="3 2" />

                  {/* Branch 2: 'r' -> 'a' -> Ramayana / RajaSaab */}
                  <circle cx="370" cy="85" r="15" fill="#e11d48" stroke="#fbbf24" strokeWidth="2" />
                  <text x="370" y="89" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="JetBrains Mono">&apos;r&apos;</text>
                  <line x1="370" y1="100" x2="370" y2="130" stroke="#f43f5e" strokeWidth="2" />
                  <circle cx="370" cy="145" r="14" fill="#e11d48" stroke="#fbbf24" strokeWidth="2" />
                  <text x="370" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">&apos;a&apos;</text>

                  <line x1="360" y1="158" x2="335" y2="178" stroke="#fbbf24" strokeWidth="1.5" />
                  <line x1="380" y1="158" x2="435" y2="178" stroke="#fbbf24" strokeWidth="1.5" />
                  <rect x="298" y="178" width="90" height="26" rx="6" fill="#881337" stroke="#fbbf24" />
                  <text x="343" y="195" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontFamily="JetBrains Mono">Ramayana [END]</text>
                  <rect x="396" y="178" width="90" height="26" rx="6" fill="#881337" stroke="#fbbf24" />
                  <text x="441" y="195" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontFamily="JetBrains Mono">RajaSaab [END]</text>

                  {/* Branch 3: 's' -> Spider-Man / Sardar 2 */}
                  <circle cx="600" cy="85" r="15" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <text x="600" y="89" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold" fontFamily="JetBrains Mono">&apos;s&apos;</text>
                  <line x1="590" y1="98" x2="550" y2="135" stroke="#10b981" strokeWidth="1.5" />
                  <line x1="610" y1="98" x2="650" y2="135" stroke="#10b981" strokeWidth="1.5" />

                  <circle cx="550" cy="145" r="14" fill="#0f172a" stroke="#10b981" />
                  <text x="550" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">&apos;p&apos;</text>
                  <rect x="500" y="178" width="102" height="26" rx="6" fill="#064e3b" stroke="#10b981" />
                  <text x="551" y="195" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="JetBrains Mono">Spider-Man [END]</text>
                  <line x1="550" y1="159" x2="550" y2="178" stroke="#10b981" strokeDasharray="3 2" />

                  <circle cx="650" cy="145" r="14" fill="#0f172a" stroke="#10b981" />
                  <text x="650" y="149" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="JetBrains Mono">&apos;a&apos;</text>
                  <rect x="612" y="178" width="90" height="26" rx="6" fill="#064e3b" stroke="#10b981" />
                  <text x="657" y="195" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontFamily="JetBrains Mono">Sardar 2 [END]</text>
                  <line x1="650" y1="159" x2="650" y2="178" stroke="#10b981" strokeDasharray="3 2" />
                </svg>
              </div>

              {/* Matched Suggestions */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Autocomplete Suggestions ({trieAutocompleteResult.matchedTitles.length}):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {trieAutocompleteResult.matchedTitles.map((title, idx) => (
                    <div
                      key={title}
                      className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-400">
                          {title.slice(0, triePrefix.trim().length)}
                        </span>
                        <span className="font-semibold text-white">
                          {title.slice(triePrefix.trim().length)}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {trieAutocompleteResult.matches[idx]}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          trieInstance.delete(title);
                          setTrieVersion((v) => v + 1);
                        }}
                        className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Trie Traversal Trace & Explanation
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs space-y-1.5 max-h-[240px] overflow-y-auto">
                {trieAutocompleteResult.steps.map((s, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="text-amber-400 mr-2">[{i + 1}]</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2.5 text-xs text-slate-300">
                <div className="font-semibold text-white">How the Prefix Trie Works:</div>
                <p className="text-slate-400 leading-relaxed">
                  1. <strong>Node Structure</strong>: Each `TrieNode` holds a `children: Map&lt;string, TrieNode&gt;`, an `isEndOfWord: boolean` flag, and a `payloads` list of `Movie` records.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  2. <strong>O(L) Prefix Walk</strong>: When a user types `&quot;Ra&quot;` in the CineNexus search bar, the engine starts at `root`, follows child edge `&apos;r&apos;`, then child edge `&apos;a&apos;` in exactly $L = 2$ steps.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  3. <strong>DFS Subtree Collection</strong>: From the reached prefix node, a bounded Depth-First Search visits child branches to collect matching titles (`Ramayana: Part 1`, `The RajaSaab`).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODULE 3: HASHMAP + POLYNOMIAL ROLLING HASH PIPELINE DIAGRAM         */}
      {/* ==================================================================== */}
      {activeModule === 'hashmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    3. Custom HashMap — O(1) Booking, Movie & Seat Lookup
                  </h2>
                  <p className="text-xs text-slate-400">
                    Polynomial Rolling Hash (prime=31) with Separate Chaining Collision Resolution · Average: O(1)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-emerald-400">Entries: {hashInstance.size()}</span>
                  <span className="text-amber-400">Load Factor α: {hashInstance.getLoadFactor()}</span>
                  <span className="text-rose-400">Collisions Chained: {hashInstance.collisionCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  value={hashKey}
                  onChange={(e) => setHashKey(e.target.value)}
                  placeholder="Key (e.g. CNX-904D or Seat E6)"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-mono text-white"
                />
                <input
                  type="text"
                  value={hashValue}
                  onChange={(e) => setHashValue(e.target.value)}
                  placeholder="Value Payload"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white flex-1 min-w-[180px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    hashInstance.put(hashKey.trim(), hashValue.trim());
                    setHashSteps([...hashInstance.steps]);
                    setHashVersion((v) => v + 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Put O(1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = hashInstance.get(hashKey.trim());
                    setHashLookupOutput(val ? `FOUND: ${val}` : 'NOT FOUND (undefined)');
                    setHashSteps([...hashInstance.steps]);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Get O(1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hashInstance.remove(hashKey.trim());
                    setHashSteps([...hashInstance.steps]);
                    setHashVersion((v) => v + 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Remove O(1)
                </button>
              </div>

              {/* Live Polynomial Rolling Hash Computation Diagram for Typed Key */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">
                    Live Polynomial Rolling Hash Formula for Key &quot;{liveHashBreakdown.cleanKey}&quot;:
                  </span>
                  <span className="font-mono text-amber-400">
                    hash = (hash × 31 + charCode) &gt;&gt;&gt; 0 ⇒ Bucket[{liveHashBreakdown.bucketIdx}]
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {liveHashBreakdown.charSteps.slice(0, 8).map((st, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 flex flex-col items-center"
                    >
                      <span className="text-rose-400 font-bold">
                        &apos;{st.char}&apos; ({st.code})
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">h={st.runningHash}</span>
                    </div>
                  ))}
                  <span className="text-emerald-400 font-bold ml-1">
                    ⇒ {liveHashBreakdown.runningHash} mod 12 = Bucket[{liveHashBreakdown.bucketIdx}]
                  </span>
                </div>
              </div>

              {hashLookupOutput && (
                <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/40 text-xs font-mono text-blue-200">
                  Lookup Result for &quot;{hashKey}&quot;: {hashLookupOutput}
                </div>
              )}

              {/* Bucket Array & Separate Chaining Visualization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {hashBuckets.map((b) => {
                  const isTargetBucket = b.index === liveHashBreakdown.bucketIdx;
                  return (
                    <div
                      key={b.index}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-xs transition-colors ${
                        isTargetBucket
                          ? 'bg-rose-950/30 border-rose-500/60'
                          : 'bg-[#070a12] border-white/10'
                      }`}
                    >
                      <span className="w-20 font-mono font-bold text-amber-400 shrink-0">
                        Bucket[{b.index}]
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {b.chain.length === 0 ? (
                          <span className="text-slate-600 font-mono">null</span>
                        ) : (
                          b.chain.map((entry, idx) => (
                            <React.Fragment key={entry.key}>
                              {idx > 0 && <span className="text-rose-400 font-mono">→</span>}
                              <span
                                title={entry.value}
                                className="px-2.5 py-1 rounded-md bg-slate-900 border border-emerald-500/40 font-mono text-emerald-300"
                              >
                                {entry.key}
                              </span>
                            </React.Fragment>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Hash Function & Separate Chaining Log
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs space-y-1.5 max-h-[220px] overflow-y-auto">
                {hashSteps.map((s, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="text-emerald-400 mr-2">[{i + 1}]</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white">Why Separate Chaining?</div>
                <p className="text-slate-400 leading-relaxed">
                  When two distinct keys (e.g., `CNX-901A` and `E6`) produce the same modulo index
                  `h(k) mod M`, our `CustomHashMap` appends the second entry to that bucket&apos;s chain
                  list rather than overwriting or probing adjacent slots. With Load Factor $\alpha = N / M &lt; 0.75$,
                  average lookup, insertion, and deletion execute in $O(1)$ constant time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODULE 4: MERGE SORT + DIVIDE-AND-CONQUER TREE DIAGRAM               */}
      {/* ==================================================================== */}
      {activeModule === 'mergesort' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    4. Recursive Merge Sort — Stable Movie Catalogue Sorter
                  </h2>
                  <p className="text-xs text-slate-400">
                    Divide-and-Conquer Recurrence: T(n) = 2T(n/2) + Θ(n) ⇒ Time: O(n log n) · Space: O(n)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-amber-400">Comparisons: {mergeSortResult.comparisons}</span>
                  <span className="text-emerald-400">Merges: {mergeSortResult.merges}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Comparator Key:</span>
                {[
                  { id: 'rating', label: 'Sort by Rating (High → Low)' },
                  { id: 'price', label: 'Sort by INR Ticket Price (Low → High)' },
                  { id: 'duration', label: 'Sort by Duration (Long → Short)' },
                  { id: 'popularity', label: 'Sort by Popularity Score' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSortCriterion(c.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      sortCriterion === c.id
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Divide & Conquer Recursion Schematic SVG */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-2 overflow-x-auto">
                <div className="text-xs font-semibold text-slate-300">
                  Recursive Divide-and-Conquer Split &amp; Two-Pointer Stable Merge Diagram:
                </div>
                <svg viewBox="0 0 680 185" className="w-full h-44 min-w-[560px]">
                  {/* Unsorted Array Top */}
                  <rect x="170" y="8" width="340" height="28" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="340" y="26" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="JetBrains Mono">
                    Unsorted [0..N-1] → mid = ⌊N / 2⌋ (Divide Phase)
                  </text>

                  <line x1="260" y1="36" x2="165" y2="62" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="420" y1="36" x2="515" y2="62" stroke="#f59e0b" strokeWidth="1.5" />

                  {/* Left & Right Subarrays */}
                  <rect x="55" y="62" width="220" height="26" rx="6" fill="#0f172a" stroke="#38bdf8" />
                  <text x="165" y="79" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">
                    Left Subarray [0 .. mid-1]
                  </text>

                  <rect x="405" y="62" width="220" height="26" rx="6" fill="#0f172a" stroke="#38bdf8" />
                  <text x="515" y="79" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">
                    Right Subarray [mid .. N-1]
                  </text>

                  {/* Merge Phase Convergence */}
                  <line x1="165" y1="88" x2="275" y2="128" stroke="#10b981" strokeWidth="2" />
                  <line x1="515" y1="88" x2="405" y2="128" stroke="#10b981" strokeWidth="2" />

                  <rect x="145" y="128" width="390" height="36" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                  <text x="340" y="145" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    Two-Pointer Stable Merge: if (comparator(L[i], R[j]) ≤ 0) take L[i++]
                  </text>
                  <text x="340" y="158" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="JetBrains Mono">
                    Guaranteed O(n log n) Worst, Average &amp; Best Case
                  </text>
                </svg>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {mergeSortResult.sorted.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-rose-600/20 text-rose-400 font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{m.title}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-slate-300 tabular-nums">
                      <span className="text-amber-400">★ {m.rating}</span>
                      <span>₹{m.basePriceInr}</span>
                      <span>{m.durationMinutes} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Recursive Split & Merge Trace ({mergeSortResult.steps.length} steps)
              </h3>
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 font-mono text-xs">
                {mergeSortResult.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`uppercase font-bold ${
                          step.action === 'split' ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {step.action} (Recursion Depth {step.depth})
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      L: [{step.leftLabels.join(', ')}] | R: [{step.rightLabels.join(', ')}]
                    </div>
                    {step.mergedLabels && (
                      <div className="text-emerald-300 text-[11px]">
                        → Merged: [{step.mergedLabels.join(', ')}]
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODULE 5: FIFO QUEUE + LINKED-LIST POINTER & CONCURRENCY DIAGRAM     */}
      {/* ==================================================================== */}
      {activeModule === 'queue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    5. FIFO Queue — Concurrent Seat Booking Request Processor
                  </h2>
                  <p className="text-xs text-slate-400">
                    Pointer-Backed Singly Linked List (`head` &amp; `tail`) · Enqueue &amp; Dequeue: O(1)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-amber-400">Active Size: {queueInstance.size()}</span>
                  <span className="text-emerald-400">Processed: {queueInstance.totalProcessed}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  value={queuePatron}
                  onChange={(e) => setQueuePatron(e.target.value)}
                  placeholder="Patron Name"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  value={queueSeats}
                  onChange={(e) => setQueueSeats(e.target.value)}
                  placeholder="Requested Seats (e.g. J4, J5)"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const id = `REQ-${Math.floor(104 + Math.random() * 890)}`;
                    queueInstance.enqueue(
                      { id, patron: queuePatron || 'Patron', seats: queueSeats || 'E5', price: '₹500' },
                      id
                    );
                    setQueueVersion((v) => v + 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Enqueue at Tail O(1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = queueInstance.dequeue('Front Request');
                    setQueueLastDeq(
                      item
                        ? `Processed ${item.id} (${item.patron} · ${item.seats})`
                        : 'Queue is empty!'
                    );
                    setQueueVersion((v) => v + 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Dequeue from Head &amp; Lock O(1)
                </button>
              </div>

              {queueLastDeq && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs font-mono text-emerald-200">
                  Dequeued Head Item: {queueLastDeq}
                </div>
              )}

              {/* Visual FIFO Pipeline */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 overflow-x-auto space-y-3">
                <div className="text-xs text-slate-400">
                  Live Linked-List Node Chain (`head` → `next` → `tail`):
                </div>
                <div className="flex items-center gap-3 min-w-[480px]">
                  <span className="px-2.5 py-1 rounded bg-rose-600/20 text-rose-400 font-mono text-xs font-bold border border-rose-500/30">
                    HEAD (Dequeue O(1))
                  </span>
                  {queueItems.length === 0 ? (
                    <span className="text-xs font-mono text-slate-500 py-4">
                      [ head === null &amp;&amp; tail === null — Queue is empty ]
                    </span>
                  ) : (
                    queueItems.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        {idx > 0 && <span className="text-amber-400 font-mono font-bold">→ next →</span>}
                        <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 min-w-[155px] text-xs">
                          <div className="font-mono font-bold text-amber-400">{item.id}</div>
                          <div className="text-white font-medium mt-0.5">{item.patron}</div>
                          <div className="text-slate-400 text-[11px]">{item.seats}</div>
                        </div>
                      </React.Fragment>
                    ))
                  )}
                  <span className="px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30 ml-auto">
                    TAIL (Enqueue O(1))
                  </span>
                </div>
              </div>

              {/* Concurrency & Atomic Seat Lock SVG Diagram */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 overflow-x-auto space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  How FIFO Queue + HashMap Prevents Double-Booking Race Conditions:
                </div>
                <svg viewBox="0 0 700 135" className="w-full h-32 min-w-[560px]">
                  <rect x="15" y="18" width="150" height="40" rx="8" fill="#1e293b" stroke="#38bdf8" />
                  <text x="90" y="36" textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="JetBrains Mono">Patron A clicks H5</text>
                  <text x="90" y="50" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">t = 10:00:00.002</text>

                  <rect x="15" y="75" width="150" height="40" rx="8" fill="#1e293b" stroke="#f43f5e" />
                  <text x="90" y="93" textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="JetBrains Mono">Patron B clicks H5</text>
                  <text x="90" y="107" textAnchor="middle" fill="#f43f5e" fontSize="8.5" fontFamily="JetBrains Mono">t = 10:00:00.005</text>

                  <line x1="165" y1="38" x2="235" y2="58" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="165" y1="95" x2="235" y2="75" stroke="#f43f5e" strokeWidth="1.5" />

                  <rect x="235" y="42" width="195" height="50" rx="10" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                  <text x="332" y="63" textAnchor="middle" fill="#e9d5ff" fontSize="10" fontWeight="bold" fontFamily="JetBrains Mono">
                    FIFO Queue Serializer
                  </text>
                  <text x="332" y="80" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="JetBrains Mono">
                    HEAD: [Patron A] → [Patron B]
                  </text>

                  <line x1="430" y1="67" x2="480" y2="67" stroke="#fbbf24" strokeWidth="2" />

                  <rect x="480" y="22" width="205" height="90" rx="10" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                  <text x="582" y="44" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="bold" fontFamily="JetBrains Mono">
                    Atomic Lock Check (HashMap)
                  </text>
                  <text x="582" y="64" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontFamily="JetBrains Mono">
                    1. Patron A → LOCKED (5m TTL)
                  </text>
                  <text x="582" y="84" textAnchor="middle" fill="#fda4af" fontSize="9" fontFamily="JetBrains Mono">
                    2. Patron B → HTTP 409 Conflict
                  </text>
                  <text x="582" y="100" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontFamily="JetBrains Mono">
                    Zero Double-Bookings Possible
                  </text>
                </svg>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0b0f19] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">FIFO Queue Execution Log</h3>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs space-y-1.5 max-h-[240px] overflow-y-auto">
                {queueInstance.steps.slice(-10).map((s, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="text-amber-400 mr-2">[{i + 1}]</span>
                    {s}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-white">Why Linked-List Instead of Array.shift()?</div>
                <p className="text-slate-400 leading-relaxed">
                  Dequeueing from a standard JavaScript array via `Array.prototype.shift()` shifts all
                  remaining elements in memory, costing $O(n)$ time. Our `FIFOQueue` maintains explicit
                  `head` and `tail` node references so both `enqueue()` and `dequeue()` execute in
                  strict $O(1)$ constant time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* INTERACTIVE PERFORMANCE BENCHMARK DASHBOARD */}
      {/* ==================================================================== */}
      <div className="p-6 rounded-2xl bg-[#0b0f19] border border-white/10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                Live Algorithmic Benchmark Dashboard
              </h3>
              <p className="text-xs text-slate-400">
                Real-time execution timings and operation counts measured on N = {benchmarkSize} sample records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[100, 500, 1500, 3000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBenchmarkSize(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                  benchmarkSize === n
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                N = {n}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">1. AVL Tree Index</div>
            <div className="font-mono text-xl font-bold text-white tabular-nums">
              {benchmarkMetrics.avlMs} ms
            </div>
            <div className="text-[11px] font-mono text-amber-400">
              Height: {benchmarkMetrics.avlHeight} · Rotations: {benchmarkMetrics.avlRotations}
            </div>
            <div className="text-[11px] text-slate-500">Time: O(log n) · Space: O(n)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">2. Prefix Trie Search</div>
            <div className="font-mono text-xl font-bold text-white tabular-nums">
              {benchmarkMetrics.trieMs} ms
            </div>
            <div className="text-[11px] font-mono text-emerald-400">
              Prefix Depth L = 15 chars
            </div>
            <div className="text-[11px] text-slate-500">Time: O(L) · Space: O(Σ·L·N)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">3. Custom HashMap</div>
            <div className="font-mono text-xl font-bold text-white tabular-nums">
              {benchmarkMetrics.hashMs} ms
            </div>
            <div className="text-[11px] font-mono text-purple-400">
              Chained Collisions: {benchmarkMetrics.hashCollisions}
            </div>
            <div className="text-[11px] text-slate-500">Avg: O(1) · Worst: O(n)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">4. Merge Sort</div>
            <div className="font-mono text-xl font-bold text-white tabular-nums">
              {benchmarkMetrics.mergeMs} ms
            </div>
            <div className="text-[11px] font-mono text-rose-400">
              Comparisons: {benchmarkMetrics.mergeComparisons}
            </div>
            <div className="text-[11px] text-slate-500">Time: O(n log n) · Space: O(n)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">5. FIFO Booking Queue</div>
            <div className="font-mono text-xl font-bold text-white tabular-nums">
              {benchmarkMetrics.queueMs} ms
            </div>
            <div className="text-[11px] font-mono text-blue-400">
              Pointer Head/Tail Ops: {benchmarkSize}
            </div>
            <div className="text-[11px] text-slate-500">Enqueue/Dequeue: O(1)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
