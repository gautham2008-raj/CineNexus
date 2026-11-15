import React, { useState, useMemo, useEffect } from 'react';
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
  Layers,
  CheckCircle2,
  ArrowRight,
  Building2,
  Sparkles,
} from 'lucide-react';
import { buildVerifiedRunningMovies, buildVerifiedTheatres } from '../data/liveCinemaProvider.ts';
import { IndianCity, Movie, Theatre } from '../types/cinema.ts';

interface DSAEngineRoomProps {
  theatres?: Theatre[];
  movies?: Movie[];
  onRefreshData?: () => void;
}

const PRESET_NEW_THEATRES: {
  id: string;
  name: string;
  city: IndianCity;
  price: number;
}[] = [
  { id: 'TH-HYD-09', name: 'Prasads IMAX Laser Dome', city: 'Hyderabad', price: 290 },
  { id: 'TH-HYD-10', name: 'Asian M-Cube Mall: Attapur', city: 'Hyderabad', price: 210 },
  { id: 'TH-HYD-11', name: 'INOX: GSM Mall, Madeenaguda', city: 'Hyderabad', price: 230 },
  { id: 'TH-HYD-12', name: 'PVR: Atrium Mall, Gachibowli', city: 'Hyderabad', price: 260 },
  { id: 'TH-BLR-05', name: 'PVR: Orion Mall, Rajajinagar', city: 'Bengaluru', price: 310 },
  { id: 'TH-MUM-04', name: 'Maison INOX: Jio World Drive', city: 'Mumbai', price: 380 },
];

export const DSAEngineRoom: React.FC<DSAEngineRoomProps> = ({
  theatres: externalTheatres,
  movies: externalMovies,
  onRefreshData,
}) => {
  const [activeModule, setActiveModule] = useState<
    'overview' | 'avl' | 'trie' | 'hashmap' | 'mergesort' | 'queue'
  >('avl');

  // ==========================================================================
  // 1. AVL TREE INTERACTIVE STATE (SYNCED WITH LIVE BACKEND THEATRES)
  // ==========================================================================
  const [avlInstance] = useState(() => {
    const tree = new AVLTree<{ name: string; city: IndianCity; priceInr: number }>();
    const initialTheatres = buildVerifiedTheatres().slice(0, 7);
    for (const t of initialTheatres) {
      tree.insert(t.id, { name: t.name, city: t.city, priceInr: t.basePriceInr });
    }
    return tree;
  });

  const [avlVersion, setAvlVersion] = useState(0);
  const [avlKeyInput, setAvlKeyInput] = useState('TH-HYD-09');
  const [avlNameInput, setAvlNameInput] = useState('Prasads IMAX Laser Dome');
  const [avlCityInput, setAvlCityInput] = useState<IndianCity>('Hyderabad');
  const [avlPriceInput, setAvlPriceInput] = useState('290');
  const [avlHighlightKey, setAvlHighlightKey] = useState<string | null>('TH-HYD-02');
  const [avlStepsLog, setAvlStepsLog] = useState<string[]>(avlInstance.steps);
  const [avlFeedback, setAvlFeedback] = useState<{
    type: 'success' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);

  // Sync any externally added theatres from backend into the AVL instance on mount / prop update
  useEffect(() => {
    if (!externalTheatres || externalTheatres.length === 0) return;
    let addedAny = false;
    for (const t of externalTheatres) {
      // If user added a theatre via Admin Panel or custom ID not yet in tree, sync it
      if (!avlInstance.search(t.id).found && t.id.startsWith('TH-HYD-')) {
        avlInstance.insert(t.id, {
          name: t.name,
          city: t.city,
          priceInr: t.basePriceInr,
        });
        addedAny = true;
      }
    }
    if (addedAny) {
      setAvlStepsLog([...avlInstance.steps]);
      setAvlVersion((v) => v + 1);
    }
  }, [externalTheatres, avlInstance]);

  const serializedAvl = useMemo(() => {
    void avlVersion;
    return avlInstance.serialize();
  }, [avlInstance, avlVersion]);

  const inOrderAvlTheatres = useMemo(() => {
    void avlVersion;
    return avlInstance.inOrder();
  }, [avlInstance, avlVersion]);

  // Helper to suggest the next unused TH-HYD-XX key after an insertion
  const computeNextUnusedKey = (currentTree: AVLTree<{ name: string; city: IndianCity; priceInr: number }>) => {
    for (const preset of PRESET_NEW_THEATRES) {
      if (!currentTree.search(preset.id).found) {
        return preset;
      }
    }
    let num = 13;
    while (currentTree.search(`TH-HYD-${String(num).padStart(2, '0')}`).found) {
      num++;
    }
    return {
      id: `TH-HYD-${String(num).padStart(2, '0')}`,
      name: `CineNexus Luxe Multiplex #${num}`,
      city: 'Hyderabad' as IndianCity,
      price: 250,
    };
  };

  const executeAvlTheatreInsert = async (
    rawKey: string,
    rawName: string,
    city: IndianCity,
    priceInr: number
  ) => {
    const cleanKey = rawKey.trim().toUpperCase();
    const cleanName = rawName.trim() || `CineNexus Multiplex (${cleanKey})`;
    if (!cleanKey) {
      setAvlFeedback({
        type: 'warning',
        message: 'Please enter a valid Theatre AVL Key ID (for example: TH-HYD-09).',
      });
      return;
    }

    const alreadyExisted = avlInstance.search(cleanKey).found;
    const prevRotations = avlInstance.rotationCount;

    // 1. Insert into client AVL Tree instance and capture step-by-step rotation trace
    avlInstance.insert(cleanKey, {
      name: cleanName,
      city,
      priceInr: Number(priceInr) || 240,
    });

    const rotationsTriggered = avlInstance.rotationCount - prevRotations;
    const newHeight = avlInstance.getHeight(avlInstance.root);

    setAvlHighlightKey(cleanKey);
    setAvlStepsLog([...avlInstance.steps]);
    setAvlVersion((v) => v + 1);

    // 2. Persist into Backend Server AVL Tree & Live City Theatre Schedule
    setIsSyncingBackend(true);
    try {
      await fetch('/api/admin/theatres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanKey,
          name: cleanName,
          city,
          address: `${cleanName}, ${city}`,
          basePriceInr: Number(priceInr) || 240,
        }),
      });
      onRefreshData?.();
    } catch (err) {
      console.error('Failed to sync theatre with backend AVL tree:', err);
    } finally {
      setIsSyncingBackend(false);
    }

    // 3. Show clear feedback banner & advance input fields to next unused theatre so repeated clicks keep adding new nodes
    setAvlFeedback({
      type: 'success',
      message: alreadyExisted
        ? `Updated existing AVL node "${cleanKey}" (${cleanName} · ${city}). Next available ID pre-filled below.`
        : `Inserted "${cleanName}" [${cleanKey}] (${city}, ₹${priceInr}) into AVL Tree & Live Booking Schedule! Tree Height = ${newHeight}, Rotations Triggered = ${rotationsTriggered}.`,
    });

    const nextSuggestion = computeNextUnusedKey(avlInstance);
    setAvlKeyInput(nextSuggestion.id);
    setAvlNameInput(nextSuggestion.name);
    setAvlCityInput(nextSuggestion.city);
    setAvlPriceInput(String(nextSuggestion.price));
  };

  const handleAvlInsertForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAvlTheatreInsert(
      avlKeyInput,
      avlNameInput,
      avlCityInput,
      Number(avlPriceInput) || 250
    );
  };

  const handleAvlSearch = () => {
    const cleanKey = avlKeyInput.trim().toUpperCase();
    if (!cleanKey) return;
    const res = avlInstance.search(cleanKey);
    setAvlHighlightKey(res.found ? cleanKey : null);
    setAvlStepsLog([...res.steps]);
    setAvlFeedback({
      type: res.found ? 'info' : 'warning',
      message: res.found
        ? `AVL O(log n) Search FOUND "${cleanKey}" → ${res.value?.name} (${res.value?.city}) in ${res.comparisons} comparisons.`
        : `Key "${cleanKey}" not found in AVL Tree after ${res.comparisons} comparisons. Click "Insert Theatre" to add it!`,
    });
    setAvlVersion((v) => v + 1);
  };

  const handleAvlDelete = async (targetKey?: string) => {
    const cleanKey = (targetKey || avlKeyInput).trim().toUpperCase();
    if (!cleanKey) return;
    const deleted = avlInstance.delete(cleanKey);
    setAvlHighlightKey(null);
    setAvlStepsLog([...avlInstance.steps]);
    setAvlVersion((v) => v + 1);

    if (deleted) {
      try {
        await fetch(`/api/admin/theatres/${encodeURIComponent(cleanKey)}`, {
          method: 'DELETE',
        });
        onRefreshData?.();
      } catch (e) {
        console.error(e);
      }
      setAvlFeedback({
        type: 'info',
        message: `Deleted node "${cleanKey}" and rebalanced AVL Tree (New Height = ${avlInstance.getHeight(avlInstance.root)}).`,
      });
    } else {
      setAvlFeedback({
        type: 'warning',
        message: `Cannot delete "${cleanKey}" because it is not currently in the AVL Tree.`,
      });
    }
  };

  const handleAvlResetDefault = () => {
    const existing = avlInstance.inOrder();
    for (const item of existing) {
      avlInstance.delete(item.key);
    }
    const defaults = buildVerifiedTheatres().slice(0, 7);
    for (const t of defaults) {
      avlInstance.insert(t.id, { name: t.name, city: t.city, priceInr: t.basePriceInr });
    }
    setAvlHighlightKey('TH-HYD-02');
    setAvlStepsLog([...avlInstance.steps]);
    setAvlVersion((v) => v + 1);
    setAvlFeedback({
      type: 'info',
      message: 'Reset AVL Tree to default 7 balanced Hyderabad & pan-India multiplex nodes.',
    });
  };

  // ==========================================================================
  // 2. PREFIX TRIE INTERACTIVE STATE (1-CLICK INSERT, PREFIX FILTER & DELETE)
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
  const [trieNotice, setTrieNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!externalMovies) return;
    let updated = false;
    for (const m of externalMovies) {
      if (!trieInstance.search(m.title).found) {
        trieInstance.insert(m.title, m.genres.join(', '));
        updated = true;
      }
    }
    if (updated) setTrieVersion((v) => v + 1);
  }, [externalMovies, trieInstance]);

  const trieAutocompleteResult = useMemo(() => {
    void trieVersion;
    return trieInstance.autocomplete(triePrefix, 12);
  }, [trieInstance, triePrefix, trieVersion]);

  const allTrieWordsResult = useMemo(() => {
    void trieVersion;
    return trieInstance.autocomplete('', 30);
  }, [trieInstance, trieVersion]);

  const executeTrieQuickInsert = async (titleToInsert: string, genreLabel: string = 'Action, IMAX 3D') => {
    const cleanTitle = titleToInsert.trim();
    if (!cleanTitle) return;
    trieInstance.insert(cleanTitle, genreLabel);
    setTriePrefix(cleanTitle.slice(0, 2));
    setTrieVersion((v) => v + 1);
    setTrieNotice(
      `Inserted "${cleanTitle}" into Prefix Trie in O(L=${cleanTitle.length}) character hops & synced with Live Search!`
    );
    try {
      await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          language: 'Telugu',
          genre: 'Action',
          durationMinutes: 162,
          basePriceInr: 250,
          city: 'Hyderabad',
        }),
      });
      onRefreshData?.();
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================================================
  // 3. HASHMAP INTERACTIVE STATE (1-CLICK PUT, GET, REMOVE & COLLISION DEMO)
  // ==========================================================================
  const [hashInstance] = useState(() => {
    const map = new CustomHashMap<string>(12);
    map.put('CNX-901A', 'Seat E5, E6 · Peddi · ₹590');
    map.put('CNX-902B', 'Seat H4, H5 · Ramayana: Part 1 · ₹990');
    map.put('CNX-903C', 'Seat C7 · The RajaSaab · ₹240');
    map.put('A5', 'Standard Row A Seat 5 · ₹180');
    map.put('J8', 'Executive Prime Row J Seat 8 · ₹260');
    map.put('P9', 'VIP Recliner Row P Seat 9 · ₹420');
    return map;
  });
  const [hashKey, setHashKey] = useState('CNX-904D');
  const [hashValue, setHashValue] = useState('Seat M7, M8 · Spider-Man: Brand New Day · ₹840');
  const [hashLookupOutput, setHashLookupOutput] = useState<string | null>(null);
  const [hashSteps, setHashSteps] = useState<string[]>(hashInstance.steps);
  const [hashVersion, setHashVersion] = useState(0);
  const [hashAutoCounter, setHashAutoCounter] = useState(905);

  const hashBuckets = useMemo(() => {
    void hashVersion;
    return hashInstance.getBuckets();
  }, [hashInstance, hashVersion]);

  const liveHashBreakdown = useMemo(() => {
    const cleanKey = hashKey.trim() || 'CNX-904D';
    const prime = 31;
    let runningHash = 0;
    const charSteps: { char: string; code: number; runningHash: number }[] = [];
    for (let i = 0; i < cleanKey.length; i++) {
      const code = cleanKey.charCodeAt(i);
      runningHash = (runningHash * prime + code) >>> 0;
      charSteps.push({ char: cleanKey[i], code, runningHash });
    }
    const bucketIdx = runningHash % 12;
    return { cleanKey, runningHash, bucketIdx, charSteps };
  }, [hashKey]);

  const handleHashQuickInsert = () => {
    const nextKey = `CNX-${hashAutoCounter}X`;
    const sampleMovies = ['Peddi', 'Ramayana: Part 1', 'The RajaSaab', 'Dacoit', 'Toxic'];
    const pickMovie = sampleMovies[hashAutoCounter % sampleMovies.length];
    const sampleSeat = `${String.fromCharCode(65 + (hashAutoCounter % 16))}${(hashAutoCounter % 18) + 1}`;
    const payload = `Seat ${sampleSeat} · ${pickMovie} · ₹${240 + (hashAutoCounter % 5) * 60}`;
    hashInstance.put(nextKey, payload);
    setHashKey(nextKey);
    setHashValue(payload);
    setHashLookupOutput(`INSERTED O(1): ${nextKey} → ${payload}`);
    setHashSteps([...hashInstance.steps]);
    setHashAutoCounter((c) => c + 1);
    setHashVersion((v) => v + 1);
  };

  // ==========================================================================
  // 4. MERGE SORT INTERACTIVE STATE (MULTI-CRITERIA + ASC/DESC + CUSTOM ITEMS)
  // ==========================================================================
  const [sortCriterion, setSortCriterion] = useState<'rating' | 'price' | 'duration' | 'popularity'>('rating');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [customSortItems, setCustomSortItems] = useState<Movie[]>([]);
  const [customMovieTitle, setCustomMovieTitle] = useState('SSMB29: Globetrotter');
  const [customMovieRating, setCustomMovieRating] = useState('9.6');
  const [customMoviePrice, setCustomMoviePrice] = useState('350');

  const mergeSortResult = useMemo(() => {
    const baseMovies =
      externalMovies && externalMovies.length > 0 ? externalMovies : buildVerifiedRunningMovies();
    const combined = [...customSortItems, ...baseMovies];
    const dirMultiplier = sortDirection === 'desc' ? 1 : -1;
    const comparator = (a: Movie, b: Movie) => {
      if (sortCriterion === 'rating') return (b.rating - a.rating) * dirMultiplier;
      if (sortCriterion === 'price') return (a.basePriceInr - b.basePriceInr) * -dirMultiplier;
      if (sortCriterion === 'duration') return (b.durationMinutes - a.durationMinutes) * dirMultiplier;
      return (b.popularityScore - a.popularityScore) * dirMultiplier;
    };
    return MergeSort.sort(
      combined,
      comparator,
      (m) =>
        `${m.title.split(':')[0]} (${
          sortCriterion === 'rating'
            ? `★${m.rating}`
            : sortCriterion === 'price'
            ? `₹${m.basePriceInr}`
            : `${m.durationMinutes}m`
        })`
    );
  }, [sortCriterion, sortDirection, externalMovies, customSortItems]);

  // ==========================================================================
  // 5. FIFO QUEUE INTERACTIVE STATE (1-CLICK ENQUEUE, DEQUEUE, BURST & REMOVE)
  // ==========================================================================
  const [queueInstance] = useState(() => {
    const q = new FIFOQueue<{ id: string; patron: string; seats: string; price: string }>();
    q.enqueue({ id: 'REQ-101', patron: 'Ananya Rao', seats: 'M7, M8 (VIP Recliner)', price: '₹840' }, 'REQ-101');
    q.enqueue({ id: 'REQ-102', patron: 'Vikram Aditya', seats: 'H8, H9, H10 (Prime)', price: '₹780' }, 'REQ-102');
    q.enqueue({ id: 'REQ-103', patron: 'Sneha Reddy', seats: 'C9, C10 (Standard)', price: '₹360' }, 'REQ-103');
    return q;
  });
  const [queuePatron, setQueuePatron] = useState('Karthikeya V.');
  const [queueSeats, setQueueSeats] = useState('P8, P9 (VIP Recliner)');
  const [queueVersion, setQueueVersion] = useState(0);
  const [queueLastDeq, setQueueLastDeq] = useState<string | null>(null);
  const [queueReqSeq, setQueueReqSeq] = useState(104);

  const queueItems = useMemo(() => {
    void queueVersion;
    return queueInstance.toArray();
  }, [queueInstance, queueVersion]);

  const handleQueueQuickEnqueue = () => {
    const samplePatrons = ['Rohan Kulkarni', 'Divya Nair', 'Siddharth Verma', 'Meenakshi Iyer', 'Arjun Goud'];
    const sampleSeats = [
      'P5, P6 (VIP Recliner)',
      'J10, J11 (Executive Prime)',
      'G7, G8, G9 (Executive Prime)',
      'M11, M12 (VIP Recliner)',
      'D8, D9 (Standard)',
    ];
    const samplePrices = ['₹840', '₹520', '₹780', '₹900', '₹360'];
    const idx = queueReqSeq % samplePatrons.length;
    const id = `REQ-${queueReqSeq}`;
    queueInstance.enqueue(
      {
        id,
        patron: samplePatrons[idx],
        seats: sampleSeats[idx],
        price: samplePrices[idx],
      },
      id
    );
    setQueueReqSeq((s) => s + 1);
    setQueueLastDeq(`Enqueued ${id} (${samplePatrons[idx]} · ${sampleSeats[idx]}) at TAIL in O(1) time.`);
    setQueueVersion((v) => v + 1);
  };

  const handleQueueSimulateBurst = () => {
    const burst = [
      { patron: 'Pranav Reddy', seats: 'N8, N9 (VIP Recliner)', price: '₹840' },
      { patron: 'Kavya Sharma', seats: 'K6, K7 (Executive)', price: '₹520' },
      { patron: 'Harsha Vardhan', seats: 'F10, F11, F12 (Prime)', price: '₹780' },
    ];
    let seq = queueReqSeq;
    for (const item of burst) {
      const id = `REQ-${seq++}`;
      queueInstance.enqueue({ id, ...item }, id);
    }
    setQueueReqSeq(seq);
    setQueueLastDeq('Simulated 3 concurrent seat-lock requests arriving simultaneously — serialized at Queue TAIL in O(1).');
    setQueueVersion((v) => v + 1);
  };

  // ==========================================================================
  // 6. INTERACTIVE BENCHMARK SUITE
  // ==========================================================================
  const [benchmarkSize, setBenchmarkSize] = useState<number>(500);
  const benchmarkMetrics = useMemo(() => {
    const N = benchmarkSize;

    const t0 = performance.now();
    const benchAvl = new AVLTree<number>();
    for (let i = 0; i < N; i++) {
      benchAvl.insert(`TH-${String(i).padStart(5, '0')}`, i);
    }
    benchAvl.search(`TH-${String(Math.floor(N / 2)).padStart(5, '0')}`);
    const avlMs = Number((performance.now() - t0).toFixed(2));

    const t1 = performance.now();
    const benchTrie = new PrefixTrie<number>();
    for (let i = 0; i < N; i++) {
      benchTrie.insert(`Movie_Release_${i}`, i);
    }
    benchTrie.autocomplete('Movie_Release_1', 10);
    const trieMs = Number((performance.now() - t1).toFixed(2));

    const t2 = performance.now();
    const benchHash = new CustomHashMap<number>(Math.max(32, Math.floor(N / 2)));
    for (let i = 0; i < N; i++) {
      benchHash.put(`SEAT-${i}`, i);
    }
    benchHash.get(`SEAT-${Math.floor(N / 2)}`);
    const hashMs = Number((performance.now() - t2).toFixed(2));

    const t3 = performance.now();
    const sampleArr = Array.from({ length: N }, (_, idx) => (idx * 73) % 997);
    const msRes = MergeSort.sort(sampleArr, (a, b) => a - b);
    const mergeMs = Number((performance.now() - t3).toFixed(2));

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

  // Helper to render AVL Tree SVG nodes recursively with Theatre ID + Name + BF
  const currentAvlHeight = avlInstance.getHeight(avlInstance.root);
  const svgCanvasHeight = Math.max(330, currentAvlHeight * 86 + 40);

  const renderAvlSvgNodes = (
    node: AVLNodeSerialized<{ name: string; city: IndianCity; priceInr: number }> | null,
    x: number,
    y: number,
    spread: number
  ): React.ReactNode[] => {
    if (!node) return [];
    const elements: React.ReactNode[] = [];

    if (node.left) {
      const childX = x - spread;
      const childY = y + 80;
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
      elements.push(...renderAvlSvgNodes(node.left, childX, childY, Math.max(46, spread * 0.51)));
    }

    if (node.right) {
      const childX = x + spread;
      const childY = y + 80;
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
      elements.push(...renderAvlSvgNodes(node.right, childX, childY, Math.max(46, spread * 0.51)));
    }

    const isHighlighted = avlHighlightKey === node.key;
    const shortName =
      node.value?.name && node.value.name.length > 15
        ? `${node.value.name.slice(0, 14)}…`
        : node.value?.name || 'Multiplex';

    elements.push(
      <g
        key={`node-${node.key}`}
        transform={`translate(${x}, ${y})`}
        onClick={() => {
          setAvlHighlightKey(node.key);
          setAvlKeyInput(node.key);
          if (node.value?.name) setAvlNameInput(node.value.name);
        }}
        className="cursor-pointer"
      >
        <rect
          x={-54}
          y={-26}
          width={108}
          height={52}
          rx={10}
          fill={isHighlighted ? '#e11d48' : '#0f172a'}
          stroke={isHighlighted ? '#fbbf24' : '#38bdf8'}
          strokeWidth={isHighlighted ? 2.5 : 1.5}
        />
        <text
          x={0}
          y={-9}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10.5"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="bold"
        >
          {node.key}
        </text>
        <text
          x={0}
          y={5}
          textAnchor="middle"
          fill={isHighlighted ? '#fef08a' : '#cbd5e1'}
          fontSize="8.5"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {shortName}
        </text>
        <text
          x={0}
          y={18}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="8.5"
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
      <div className="p-6 rounded-2xl cinema-surface border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 tracking-wider">
            ADVANCED DATA STRUCTURES PBL WORKBENCH & ARCHITECTURAL DIAGRAMS
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            DSA Engine Room — 1-Click Interactive Operations & Live Visualizers
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Every insertion, deletion, search, sort, or queue operation can be triggered in a single
            click or by clicking directly on any node/bucket in the diagrams below.
          </p>
        </div>

        {/* Module Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-white/10 p-1.5 rounded-xl">
          {[
            { id: 'overview', label: '0. Full DSA Pipeline', icon: Layers },
            { id: 'avl', label: '1. AVL Tree (Theatres)', icon: GitBranch },
            { id: 'trie', label: '2. Prefix Trie (Movies)', icon: Search },
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
          <div className="p-6 rounded-2xl cinema-surface border border-white/10 space-y-5">
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
                5 Core Data Structures · Live Backend Synchronized
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
                <g transform="translate(20, 45)" onClick={() => setActiveModule('trie')} className="cursor-pointer">
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
                <g transform="translate(230, 45)" onClick={() => setActiveModule('mergesort')} className="cursor-pointer">
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
                <g transform="translate(440, 45)" onClick={() => setActiveModule('avl')} className="cursor-pointer">
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
                <g transform="translate(650, 45)" onClick={() => setActiveModule('queue')} className="cursor-pointer">
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
                    on 326-Seat 3D Click
                  </text>
                </g>

                <line x1="825" y1="140" x2="855" y2="140" stroke="#fbbf24" strokeWidth="2.5" markerEnd="url(#arrow-amber)" />

                {/* Stage 5: HashMap */}
                <g transform="translate(860, 45)" onClick={() => setActiveModule('hashmap')} className="cursor-pointer">
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

                <text x="525" y="275" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Plus Jakarta Sans">
                  Click any stage box above or tab to inspect its internal diagrams and run 1-click live operations.
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
                  why: 'When 326 3D chairs render or a user locks Seat M8, checking availability or retrieving a booking QR code by ID must happen in constant O(1) time via polynomial hashing.',
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
      {/* MODULE 1: AVL TREE + LIVE THEATRE INSERTION & ROTATION DIAGRAMS      */}
      {/* ==================================================================== */}
      {activeModule === 'avl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 cinema-surface border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">
                    1. Self-Balancing AVL Tree — Live Theatre ID Index & Multiplex Directory
                  </h2>
                  <p className="text-xs text-slate-400">
                    Maintains |Balance Factor| ≤ 1 via LL, RR, LR, and RL Rotations · Synced with Live Booking Theatres
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

              {/* 1-Click Instant AVL Control Strip */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Compatible Operations:</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = computeNextUnusedKey(avlInstance);
                      executeAvlTheatreInsert(next.id, next.name, next.city, next.price);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Auto-Insert Next Theatre
                  </button>
                  <button
                    type="button"
                    onClick={handleAvlSearch}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Search &quot;{avlKeyInput}&quot;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAvlDelete(avlHighlightKey || avlKeyInput)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Delete &quot;{avlHighlightKey || avlKeyInput}&quot;
                  </button>
                  <button
                    type="button"
                    onClick={handleAvlResetDefault}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Reset 7 Theatres
                  </button>
                </div>
              </div>

              {/* Interactive Form to Add Custom Theatre to AVL Tree & Live App */}
              <form
                onSubmit={handleAvlInsertForm}
                className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custom Theatre Input (Or click any preset / SVG node below)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Auto-advances Theatre ID after each insert
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">Theatre Key ID</label>
                    <input
                      type="text"
                      required
                      value={avlKeyInput}
                      onChange={(e) => setAvlKeyInput(e.target.value)}
                      placeholder="e.g. TH-HYD-09"
                      className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-slate-400 mb-1">Multiplex Name</label>
                    <input
                      type="text"
                      required
                      value={avlNameInput}
                      onChange={(e) => setAvlNameInput(e.target.value)}
                      placeholder="e.g. Prasads IMAX Laser Dome"
                      className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">City</label>
                    <select
                      value={avlCityInput}
                      onChange={(e) => setAvlCityInput(e.target.value as IndianCity)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="Kochi">Kochi</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Base ₹</label>
                    <input
                      type="number"
                      value={avlPriceInput}
                      onChange={(e) => setAvlPriceInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* 1-Click Quick Preset Theatre Insert Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">1-Click Presets:</span>
                    {PRESET_NEW_THEATRES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          executeAvlTheatreInsert(preset.id, preset.name, preset.city, preset.price)
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 border border-white/10 text-[11px] text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + {preset.id} ({preset.name.split(':')[0]})
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSyncingBackend}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {isSyncingBackend ? 'Adding Theatre...' : 'Insert Theatre O(log n)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAvlSearch}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Key</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAvlDelete()}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Key</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Confirmation / Status Banner */}
              {avlFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    avlFeedback.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : avlFeedback.type === 'warning'
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-blue-950/60 border-blue-500/50 text-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{avlFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvlFeedback(null)}
                    className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Interactive SVG Tree Diagram */}
              <div className="w-full overflow-x-auto bg-[#070a12] border border-white/10 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 mb-2">
                  <span>
                    Interactive Height-Balanced AVL Tree Visualization (Click any node to select, search, or delete):
                  </span>
                  {avlHighlightKey && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400">
                        Selected Node: {avlHighlightKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAvlDelete(avlHighlightKey)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                      >
                        Delete {avlHighlightKey}
                      </button>
                    </div>
                  )}
                </div>
                <svg
                  viewBox={`0 0 880 ${svgCanvasHeight}`}
                  className="w-full h-auto min-w-[680px]"
                  style={{ maxHeight: '420px' }}
                >
                  {serializedAvl && renderAvlSvgNodes(serializedAvl, 440, 42, 205)}
                </svg>
              </div>

              {/* Live In-Order Traversal Theatre Directory Table */}
              <div className="space-y-2.5 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-white">
                    Live AVL Tree In-Order Traversal Directory ({inOrderAvlTheatres.length} Indexed Theatres)
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Sorted Lexicographically in O(n) via Left → Root → Right
                  </span>
                </div>
                <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#070a12]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 bg-slate-950/80 sticky top-0">
                        <th className="py-2.5 px-3">AVL Key</th>
                        <th className="py-2.5 px-3">Multiplex Name</th>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Node Height</th>
                        <th className="py-2.5 px-3">Balance Factor</th>
                        <th className="py-2.5 px-3 text-right">1-Click Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {inOrderAvlTheatres.map((item) => {
                        const isSelected = avlHighlightKey === item.key;
                        return (
                          <tr
                            key={item.key}
                            onClick={() => {
                              setAvlHighlightKey(item.key);
                              setAvlKeyInput(item.key);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-rose-950/40' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-amber-400">
                              {item.key}
                            </td>
                            <td className="py-2 px-3 font-medium text-white">
                              {item.value?.name}
                            </td>
                            <td className="py-2 px-3 text-slate-300">{item.value?.city}</td>
                            <td className="py-2 px-3 font-mono text-slate-300 tabular-nums">
                              h = {item.height}
                            </td>
                            <td className="py-2 px-3 font-mono text-emerald-400 tabular-nums">
                              BF = {item.balanceFactor}
                            </td>
                            <td className="py-2 px-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAvlKeyInput(item.key);
                                  const res = avlInstance.search(item.key);
                                  setAvlHighlightKey(item.key);
                                  setAvlStepsLog([...res.steps]);
                                }}
                                className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                              >
                                Trace
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAvlDelete(item.key);
                                }}
                                className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 cinema-surface border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white">
                Step-by-Step Execution & Rotation Trace
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs space-y-1.5 max-h-[320px] overflow-y-auto">
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
          <div className="p-6 rounded-2xl cinema-surface border border-white/10 space-y-5">
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
                  <line x1="65" y1="25" x2="40" y2="60" stroke="#f43f5e" strokeWidth="2" />
                  <line x1="40" y1="60" x2="20" y2="95" stroke="#f43f5e" strokeWidth="2" />
                  <circle cx="65" cy="25" r="14" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="65" y="29" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Z(+2)</text>
                  <circle cx="40" cy="60" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="40" y="64" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">Y(+1)</text>
                  <circle cx="20" cy="95" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="20" y="99" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="JetBrains Mono">X(0)</text>

                  <text x="112" y="65" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">⇒</text>

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
            <div className="lg:col-span-8 cinema-surface border border-white/10 rounded-2xl p-6 space-y-5">
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

              {/* 1-Click Prefix Filter & 1-Click Quick Insert Toolbar */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-400">
                    1-Click Prefix Traversal Chips:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Ra', 'Pe', 'Sp', 'Dr', 'To', 'Bo', 'Pa', ''].map((p) => (
                      <button
                        key={p || 'all'}
                        type="button"
                        onClick={() => setTriePrefix(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                          triePrefix === p
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-900 border border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        {p ? `"${p}"` : 'Show All'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-semibold text-emerald-400">
                    1-Click Insert Movie into Trie:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      'Spirit: Cop Action Drama',
                      'Salaar: Shouryaanga Parvam',
                      'Kalki 2898 AD: Part 2',
                      'Devara: Part 2',
                    ].map((presetMovie) => (
                      <button
                        key={presetMovie}
                        type="button"
                        onClick={() => executeTrieQuickInsert(presetMovie)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 border border-white/10 text-[11px] text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + {presetMovie.split(':')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Live Prefix Search Input (Type or click a chip above)
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
                    Insert Custom 2026 Movie Title into Prefix Trie &amp; Live Catalogue
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
                        executeTrieQuickInsert(trieNewTitle);
                        setTrieNewTitle('');
                      }}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      Insert Title
                    </button>
                  </div>
                </div>
              </div>

              {trieNotice && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                  <span>{trieNotice}</span>
                  <button
                    type="button"
                    onClick={() => setTrieNotice(null)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

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
                  <rect x="325" y="10" width="90" height="30" rx="8" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
                  <text x="370" y="29" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono">ROOT</text>

                  <line x1="345" y1="40" x2="140" y2="75" stroke="#38bdf8" strokeWidth="2" />
                  <line x1="370" y1="40" x2="370" y2="75" stroke="#f43f5e" strokeWidth="2" />
                  <line x1="395" y1="40" x2="600" y2="75" stroke="#10b981" strokeWidth="2" />

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

              {/* Matched Suggestions with 1-Click Inspect & Delete */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Matched Autocomplete Titles ({trieAutocompleteResult.matchedTitles.length} of {allTrieWordsResult.matchedTitles.length} total):
                  </span>
                  {triePrefix && (
                    <button
                      type="button"
                      onClick={() => setTriePrefix('')}
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Show All {allTrieWordsResult.matchedTitles.length} Indexed Movies
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {trieAutocompleteResult.matchedTitles.map((title, idx) => (
                    <div
                      key={title}
                      onClick={() => setTriePrefix(title.slice(0, 3))}
                      className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-white/10 flex items-center justify-between text-xs cursor-pointer transition-colors"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          trieInstance.delete(title);
                          setTrieNotice(`Deleted "${title}" from Prefix Trie in O(L) time.`);
                          setTrieVersion((v) => v + 1);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 cinema-surface border border-white/10 rounded-2xl p-6 space-y-4">
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
            <div className="lg:col-span-8 cinema-surface border border-white/10 rounded-2xl p-6 space-y-5">
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

              {/* 1-Click HashMap Preset Operations Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  1-Click HashMap Operations (Or click any key chip inside Buckets below):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleHashQuickInsert}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Auto-Insert New Booking O(1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = hashInstance.get(hashKey.trim());
                      setHashLookupOutput(val ? `FOUND O(1): ${val}` : 'NOT FOUND (undefined)');
                      setHashSteps([...hashInstance.steps]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Get &quot;{hashKey}&quot; O(1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const removed = hashInstance.remove(hashKey.trim());
                      setHashLookupOutput(
                        removed
                          ? `REMOVED "${hashKey.trim()}" from Bucket[${liveHashBreakdown.bucketIdx}] in O(1) time.`
                          : `Key "${hashKey.trim()}" not present in Bucket[${liveHashBreakdown.bucketIdx}].`
                      );
                      setHashSteps([...hashInstance.steps]);
                      setHashVersion((v) => v + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Remove &quot;{hashKey}&quot; O(1)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  value={hashKey}
                  onChange={(e) => setHashKey(e.target.value)}
                  placeholder="Key (e.g. CNX-904D or Seat M8)"
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
                    setHashLookupOutput(`PUT O(1): Stored "${hashKey.trim()}" → ${hashValue.trim()}`);
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
                    setHashLookupOutput(`Removed key "${hashKey.trim()}" in O(1) time.`);
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
                <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/40 text-xs font-mono text-blue-200 flex items-center justify-between">
                  <span>{hashLookupOutput}</span>
                  <button
                    type="button"
                    onClick={() => setHashLookupOutput(null)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Bucket Array & Separate Chaining Visualization (Click any key to inspect or × to delete) */}
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
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-emerald-500/40 font-mono text-emerald-300">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setHashKey(entry.key);
                                    setHashValue(entry.value);
                                    const val = hashInstance.get(entry.key);
                                    setHashLookupOutput(`GET("${entry.key}") ⇒ ${val}`);
                                    setHashSteps([...hashInstance.steps]);
                                  }}
                                  title={`Click to inspect: ${entry.value}`}
                                  className="hover:text-white cursor-pointer"
                                >
                                  {entry.key}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    hashInstance.remove(entry.key);
                                    setHashLookupOutput(`Removed "${entry.key}" from Bucket[${b.index}] in O(1).`);
                                    setHashSteps([...hashInstance.steps]);
                                    setHashVersion((v) => v + 1);
                                  }}
                                  title={`Delete ${entry.key}`}
                                  className="text-rose-400 hover:text-rose-200 font-bold cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            </React.Fragment>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 cinema-surface border border-white/10 rounded-2xl p-6 space-y-4">
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
                  When two distinct keys (e.g., `CNX-901A` and `P9`) produce the same modulo index
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
            <div className="lg:col-span-7 cinema-surface border border-white/10 rounded-2xl p-6 space-y-5">
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

              {/* Comparator & Order Direction Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">Comparator Key:</span>
                  {[
                    { id: 'rating', label: 'Rating (★)' },
                    { id: 'price', label: 'INR Price (₹)' },
                    { id: 'duration', label: 'Runtime (Mins)' },
                    { id: 'popularity', label: 'Popularity' },
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

                <button
                  type="button"
                  onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold cursor-pointer"
                >
                  Order: {sortDirection === 'desc' ? 'Descending ↓' : 'Ascending ↑'}
                </button>
              </div>

              {/* 1-Click Add Custom Movie to Merge Sort Array */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  value={customMovieTitle}
                  onChange={(e) => setCustomMovieTitle(e.target.value)}
                  placeholder="Movie Title"
                  className="px-3 py-1.5 bg-slate-950 border border-white/15 rounded-lg text-white flex-1 min-w-[140px]"
                />
                <input
                  type="number"
                  step="0.1"
                  value={customMovieRating}
                  onChange={(e) => setCustomMovieRating(e.target.value)}
                  placeholder="★ Rating"
                  className="w-20 px-2.5 py-1.5 bg-slate-950 border border-white/15 rounded-lg font-mono text-amber-400"
                />
                <input
                  type="number"
                  value={customMoviePrice}
                  onChange={(e) => setCustomMoviePrice(e.target.value)}
                  placeholder="₹ Price"
                  className="w-20 px-2.5 py-1.5 bg-slate-950 border border-white/15 rounded-lg font-mono text-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customMovieTitle.trim()) return;
                    const baseTemplate = buildVerifiedRunningMovies()[0];
                    const newItem: Movie = {
                      ...baseTemplate,
                      id: `MOV-SORT-${Date.now()}`,
                      title: customMovieTitle.trim(),
                      rating: Number(customMovieRating) || 9.1,
                      basePriceInr: Number(customMoviePrice) || 280,
                      durationMinutes: 168,
                      popularityScore: 99,
                    };
                    setCustomSortItems((prev) => [newItem, ...prev]);
                    setCustomMovieTitle(`Varanasi: Chapter ${customSortItems.length + 2}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  + Insert &amp; Re-Sort O(n log n)
                </button>
                {customSortItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomSortItems([])}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Reset Custom ({customSortItems.length})
                  </button>
                )}
              </div>

              {/* Divide & Conquer Recursion Schematic SVG */}
              <div className="p-4 rounded-xl bg-[#070a12] border border-white/10 space-y-2 overflow-x-auto">
                <div className="text-xs font-semibold text-slate-300">
                  Recursive Divide-and-Conquer Split &amp; Two-Pointer Stable Merge Diagram:
                </div>
                <svg viewBox="0 0 680 185" className="w-full h-44 min-w-[560px]">
                  <rect x="170" y="8" width="340" height="28" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="340" y="26" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="JetBrains Mono">
                    Unsorted [0..N-1] → mid = ⌊N / 2⌋ (Divide Phase)
                  </text>

                  <line x1="260" y1="36" x2="165" y2="62" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="420" y1="36" x2="515" y2="62" stroke="#f59e0b" strokeWidth="1.5" />

                  <rect x="55" y="62" width="220" height="26" rx="6" fill="#0f172a" stroke="#38bdf8" />
                  <text x="165" y="79" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">
                    Left Subarray [0 .. mid-1]
                  </text>

                  <rect x="405" y="62" width="220" height="26" rx="6" fill="#0f172a" stroke="#38bdf8" />
                  <text x="515" y="79" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="JetBrains Mono">
                    Right Subarray [mid .. N-1]
                  </text>

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
                {mergeSortResult.sorted.map((m, idx) => {
                  const isCustom = m.id.startsWith('MOV-SORT-');
                  return (
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
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() =>
                              setCustomSortItems((prev) => prev.filter((item) => item.id !== m.id))
                            }
                            className="text-rose-400 hover:text-rose-300 font-sans font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 cinema-surface border border-white/10 rounded-2xl p-6 space-y-4">
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
            <div className="lg:col-span-8 cinema-surface border border-white/10 rounded-2xl p-6 space-y-5">
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

              {/* 1-Click FIFO Queue Operations Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-purple-300">
                  1-Click FIFO Queue Controls:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQueueQuickEnqueue}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Enqueue Random Patron O(1)
                  </button>
                  <button
                    type="button"
                    onClick={handleQueueSimulateBurst}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    + Burst Enqueue (3 Concurrent Requests)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = queueInstance.dequeue('Front Request');
                      setQueueLastDeq(
                        item
                          ? `Dequeued HEAD ${item.id} (${item.patron} · ${item.seats}) & Locked in O(1)`
                          : 'Queue is currently empty!'
                      );
                      setQueueVersion((v) => v + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Dequeue Head O(1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      while (!queueInstance.isEmpty()) {
                        queueInstance.dequeue('Clear');
                      }
                      setQueueLastDeq('Cleared all pending seat lock requests from FIFO Queue.');
                      setQueueVersion((v) => v + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Drain All
                  </button>
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
                  placeholder="Requested Seats (e.g. P8, P9)"
                  className="px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const id = `REQ-${queueReqSeq}`;
                    queueInstance.enqueue(
                      { id, patron: queuePatron || 'Patron', seats: queueSeats || 'E5', price: '₹500' },
                      id
                    );
                    setQueueReqSeq((s) => s + 1);
                    setQueueLastDeq(`Enqueued custom request ${id} (${queuePatron}) at TAIL in O(1).`);
                    setQueueVersion((v) => v + 1);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Enqueue Custom at Tail O(1)
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
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center justify-between">
                  <span>{queueLastDeq}</span>
                  <button
                    type="button"
                    onClick={() => setQueueLastDeq(null)}
                    className="text-[11px] underline cursor-pointer"
                  >
                    Dismiss
                  </button>
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
                        <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 min-w-[165px] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-amber-400">{item.id}</span>
                            {idx === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const deq = queueInstance.dequeue(item.id);
                                  if (deq) {
                                    setQueueLastDeq(`Dequeued HEAD ${deq.id} (${deq.patron}) in O(1)`);
                                    setQueueVersion((v) => v + 1);
                                  }
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600 text-white font-semibold cursor-pointer"
                              >
                                Pop Head
                              </button>
                            )}
                          </div>
                          <div className="text-white font-medium">{item.patron}</div>
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
                  <text x="90" y="36" textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="JetBrains Mono">Patron A clicks M8</text>
                  <text x="90" y="50" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="JetBrains Mono">t = 10:00:00.002</text>

                  <rect x="15" y="75" width="150" height="40" rx="8" fill="#1e293b" stroke="#f43f5e" />
                  <text x="90" y="93" textAnchor="middle" fill="#fff" fontSize="9.5" fontFamily="JetBrains Mono">Patron B clicks M8</text>
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

            <div className="lg:col-span-4 cinema-surface border border-white/10 rounded-2xl p-6 space-y-4">
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
                  `head` and `tail` node references so both `enqueue()` and `dequeue()` execute in strict
                  $O(1)$ constant time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LIVE PERFORMANCE BENCHMARK & ASYMPTOTIC COMPLEXITY SUITE             */}
      {/* ==================================================================== */}
      <div className="p-6 rounded-2xl cinema-surface border border-white/10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-semibold text-amber-400">
              EMPIRICAL RUNTIME BENCHMARKING & COMPLEXITY VERIFICATION
            </span>
            <h2 className="font-display text-xl font-bold text-white mt-0.5">
              Live Data Structure Stress-Test Suite (N = {benchmarkSize.toLocaleString()} Operations)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Dataset Scale (N):</span>
            {[100, 500, 1500, 3000].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBenchmarkSize(sz)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold cursor-pointer ${
                  benchmarkSize === sz
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                N={sz}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmark Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">1. AVL Tree ({benchmarkSize} Inserts)</div>
            <div className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
              {benchmarkMetrics.avlMs} ms
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Height: {benchmarkMetrics.avlHeight} · Rotations: {benchmarkMetrics.avlRotations}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">2. Prefix Trie ({benchmarkSize} Titles)</div>
            <div className="font-mono text-xl font-bold text-rose-400 tabular-nums">
              {benchmarkMetrics.trieMs} ms
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Autocomplete Lookup: O(L)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">3. HashMap ({benchmarkSize} Keys)</div>
            <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
              {benchmarkMetrics.hashMs} ms
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Chained Collisions: {benchmarkMetrics.hashCollisions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">4. Merge Sort ({benchmarkSize} Items)</div>
            <div className="font-mono text-xl font-bold text-blue-400 tabular-nums">
              {benchmarkMetrics.mergeMs} ms
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Comparisons: {benchmarkMetrics.mergeComparisons.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
            <div className="text-xs text-slate-400">5. FIFO Queue ({benchmarkSize} Ops)</div>
            <div className="font-mono text-xl font-bold text-purple-400 tabular-nums">
              {benchmarkMetrics.queueMs} ms
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              O(1) Pointer Enqueue/Dequeue
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
