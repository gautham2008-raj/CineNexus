/**
 * CineNexus Core Data Structures & Algorithms Engine
 * Implements:
 * 1. AVL Tree (Height-Balanced BST for O(log n) Theatre Indexing)
 * 2. Prefix Trie (O(L) Movie Autocomplete & Prefix Search)
 * 3. Custom HashMap (O(1) Average Lookup with Polynomial Hash & Chaining Collision Handling)
 * 4. Recursive Merge Sort (O(n log n) Stable Movie & Theatre Sorting)
 * 5. FIFO Queue (O(1) Enqueue/Dequeue Booking Request & Waitlist Processor)
 */

// ============================================================================
// 1. AVL TREE – THEATRE INDEXING (O(log n) Search, Insert, Delete)
// ============================================================================

export interface AVLNodeSerialized<T> {
  key: string;
  value: T;
  height: number;
  balanceFactor: number;
  left: AVLNodeSerialized<T> | null;
  right: AVLNodeSerialized<T> | null;
}

export class AVLNode<T> {
  key: string;
  value: T;
  height: number = 1;
  left: AVLNode<T> | null = null;
  right: AVLNode<T> | null = null;

  constructor(key: string, value: T) {
    this.key = key;
    this.value = value;
  }
}

export class AVLTree<T> {
  root: AVLNode<T> | null = null;
  steps: string[] = [];
  rotationCount: number = 0;
  comparisonCount: number = 0;
  nodeCount: number = 0;

  clearSteps() {
    this.steps = [];
  }

  getHeight(node: AVLNode<T> | null): number {
    return node ? node.height : 0;
  }

  getBalanceFactor(node: AVLNode<T> | null): number {
    if (!node) return 0;
    return this.getHeight(node.left) - this.getHeight(node.right);
  }

  private updateHeight(node: AVLNode<T>): void {
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
  }

  // Right Rotation (LL Case)
  private rotateRight(y: AVLNode<T>): AVLNode<T> {
    this.rotationCount++;
    this.steps.push(`LL Rotation (Right Rotate) around pivot key "${y.key}"`);
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    this.updateHeight(y);
    this.updateHeight(x);

    return x;
  }

  // Left Rotation (RR Case)
  private rotateLeft(x: AVLNode<T>): AVLNode<T> {
    this.rotationCount++;
    this.steps.push(`RR Rotation (Left Rotate) around pivot key "${x.key}"`);
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    this.updateHeight(x);
    this.updateHeight(y);

    return y;
  }

  insert(key: string, value: T): void {
    this.clearSteps();
    this.steps.push(`Starting AVL insert for key "${key}"`);
    this.root = this._insert(this.root, key, value);
  }

  private _insert(node: AVLNode<T> | null, key: string, value: T): AVLNode<T> {
    if (!node) {
      this.nodeCount++;
      this.steps.push(`Inserted leaf node "${key}" (height = 1)`);
      return new AVLNode(key, value);
    }

    this.comparisonCount++;
    if (key.localeCompare(node.key) < 0) {
      this.steps.push(`Key "${key}" < "${node.key}" → traverse Left`);
      node.left = this._insert(node.left, key, value);
    } else if (key.localeCompare(node.key) > 0) {
      this.steps.push(`Key "${key}" > "${node.key}" → traverse Right`);
      node.right = this._insert(node.right, key, value);
    } else {
      this.steps.push(`Key "${key}" already exists → updating value in place`);
      node.value = value;
      return node;
    }

    this.updateHeight(node);
    const balance = this.getBalanceFactor(node);
    this.steps.push(`Node "${node.key}" height=${node.height}, balanceFactor=${balance}`);

    // 1. Left-Left (LL) Case
    if (balance > 1 && node.left && key.localeCompare(node.left.key) < 0) {
      this.steps.push(`Imbalance detected at "${node.key}" (BF=${balance}): Left-Left (LL) Case`);
      return this.rotateRight(node);
    }

    // 2. Right-Right (RR) Case
    if (balance < -1 && node.right && key.localeCompare(node.right.key) > 0) {
      this.steps.push(`Imbalance detected at "${node.key}" (BF=${balance}): Right-Right (RR) Case`);
      return this.rotateLeft(node);
    }

    // 3. Left-Right (LR) Case
    if (balance > 1 && node.left && key.localeCompare(node.left.key) > 0) {
      this.steps.push(`Imbalance detected at "${node.key}" (BF=${balance}): Left-Right (LR) Case`);
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    // 4. Right-Left (RL) Case
    if (balance < -1 && node.right && key.localeCompare(node.right.key) < 0) {
      this.steps.push(`Imbalance detected at "${node.key}" (BF=${balance}): Right-Left (RL) Case`);
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  search(key: string): { found: boolean; value: T | null; steps: string[]; comparisons: number } {
    this.clearSteps();
    let current = this.root;
    let localComparisons = 0;

    while (current) {
      localComparisons++;
      this.comparisonCount++;
      const cmp = key.localeCompare(current.key);
      if (cmp === 0) {
        this.steps.push(`Match found at node "${current.key}" (height=${current.height}, BF=${this.getBalanceFactor(current)})`);
        return { found: true, value: current.value, steps: [...this.steps], comparisons: localComparisons };
      } else if (cmp < 0) {
        this.steps.push(`"${key}" < "${current.key}" → move to Left child`);
        current = current.left;
      } else {
        this.steps.push(`"${key}" > "${current.key}" → move to Right child`);
        current = current.right;
      }
    }

    this.steps.push(`Reached null leaf — key "${key}" not found in AVL Tree`);
    return { found: false, value: null, steps: [...this.steps], comparisons: localComparisons };
  }

  delete(key: string): boolean {
    this.clearSteps();
    const beforeCount = this.nodeCount;
    this.steps.push(`Starting AVL delete for key "${key}"`);
    this.root = this._delete(this.root, key);
    return this.nodeCount < beforeCount;
  }

  private getMinValueNode(node: AVLNode<T>): AVLNode<T> {
    let current = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  private _delete(root: AVLNode<T> | null, key: string): AVLNode<T> | null {
    if (!root) {
      this.steps.push(`Key "${key}" not found for deletion`);
      return null;
    }

    this.comparisonCount++;
    const cmp = key.localeCompare(root.key);
    if (cmp < 0) {
      this.steps.push(`"${key}" < "${root.key}" → search Left subtree`);
      root.left = this._delete(root.left, key);
    } else if (cmp > 0) {
      this.steps.push(`"${key}" > "${root.key}" → search Right subtree`);
      root.right = this._delete(root.right, key);
    } else {
      this.steps.push(`Located target node "${root.key}" for removal`);
      if (!root.left || !root.right) {
        const temp = root.left ? root.left : root.right;
        this.nodeCount--;
        if (!temp) {
          return null;
        } else {
          return temp;
        }
      } else {
        const temp = this.getMinValueNode(root.right);
        this.steps.push(`Replacing "${root.key}" with in-order successor "${temp.key}"`);
        root.key = temp.key;
        root.value = temp.value;
        root.right = this._delete(root.right, temp.key);
      }
    }

    this.updateHeight(root);
    const balance = this.getBalanceFactor(root);

    // Rebalance if needed
    if (balance > 1 && this.getBalanceFactor(root.left) >= 0) {
      return this.rotateRight(root);
    }
    if (balance > 1 && this.getBalanceFactor(root.left) < 0) {
      root.left = this.rotateLeft(root.left!);
      return this.rotateRight(root);
    }
    if (balance < -1 && this.getBalanceFactor(root.right) <= 0) {
      return this.rotateLeft(root);
    }
    if (balance < -1 && this.getBalanceFactor(root.right) > 0) {
      root.right = this.rotateRight(root.right!);
      return this.rotateLeft(root);
    }

    return root;
  }

  inOrder(): { key: string; value: T; height: number; balanceFactor: number }[] {
    const result: { key: string; value: T; height: number; balanceFactor: number }[] = [];
    const traverse = (node: AVLNode<T> | null) => {
      if (!node) return;
      traverse(node.left);
      result.push({
        key: node.key,
        value: node.value,
        height: node.height,
        balanceFactor: this.getBalanceFactor(node),
      });
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  serialize(): AVLNodeSerialized<T> | null {
    const build = (node: AVLNode<T> | null): AVLNodeSerialized<T> | null => {
      if (!node) return null;
      return {
        key: node.key,
        value: node.value,
        height: node.height,
        balanceFactor: this.getBalanceFactor(node),
        left: build(node.left),
        right: build(node.right),
      };
    };
    return build(this.root);
  }
}

// ============================================================================
// 2. PREFIX TRIE – MOVIE AUTOCOMPLETE (O(L) Prefix Traversal)
// ============================================================================

export class TrieNode<T> {
  children: Record<string, TrieNode<T>> = {};
  isEndOfWord: boolean = false;
  words: string[] = [];
  payloads: T[] = [];
}

export class PrefixTrie<T> {
  root: TrieNode<T> = new TrieNode<T>();
  wordCount: number = 0;
  steps: string[] = [];

  insert(word: string, payload: T): void {
    this.steps = [];
    const normalized = word.trim().toLowerCase();
    if (!normalized) return;

    let current = this.root;
    for (const ch of normalized) {
      if (!current.children[ch]) {
        current.children[ch] = new TrieNode<T>();
        this.steps.push(`Created Trie edge '${ch}'`);
      } else {
        this.steps.push(`Traversed existing Trie edge '${ch}'`);
      }
      current = current.children[ch];
    }

    if (!current.isEndOfWord) {
      current.isEndOfWord = true;
      this.wordCount++;
    }
    if (!current.words.includes(word)) {
      current.words.push(word);
      current.payloads.push(payload);
    }
    this.steps.push(`Marked terminal node for "${word}"`);
  }

  search(word: string): { found: boolean; payloads: T[]; steps: string[] } {
    this.steps = [];
    const normalized = word.trim().toLowerCase();
    let current = this.root;

    for (const ch of normalized) {
      if (!current.children[ch]) {
        this.steps.push(`Character '${ch}' missing — exact title "${word}" not in Trie`);
        return { found: false, payloads: [], steps: [...this.steps] };
      }
      this.steps.push(`Matched character '${ch}'`);
      current = current.children[ch];
    }

    const found = current.isEndOfWord;
    this.steps.push(found ? `Exact word match confirmed for "${word}"` : `Prefix exists, but "${word}" is not a complete title`);
    return { found, payloads: found ? current.payloads : [], steps: [...this.steps] };
  }

  autocomplete(prefix: string, limit: number = 8): { matches: T[]; matchedTitles: string[]; steps: string[]; prefixLength: number } {
    this.steps = [];
    const normalized = prefix.trim().toLowerCase();
    if (!normalized) {
      return { matches: [], matchedTitles: [], steps: ['Empty prefix'], prefixLength: 0 };
    }

    let current = this.root;
    for (const ch of normalized) {
      if (!current.children[ch]) {
        this.steps.push(`Edge '${ch}' not found after O(${normalized.length}) check → 0 suggestions`);
        return { matches: [], matchedTitles: [], steps: [...this.steps], prefixLength: normalized.length };
      }
      this.steps.push(`O(L) step: traversed '${ch}'`);
      current = current.children[ch];
    }

    const matches: T[] = [];
    const matchedTitles: string[] = [];

    const collect = (node: TrieNode<T>, path: string) => {
      if (matches.length >= limit) return;
      if (node.isEndOfWord) {
        for (let i = 0; i < node.payloads.length; i++) {
          if (matches.length < limit) {
            matches.push(node.payloads[i]);
            matchedTitles.push(node.words[i]);
            this.steps.push(`Collected suggestion: "${node.words[i]}"`);
          }
        }
      }
      const keys = Object.keys(node.children).sort();
      for (const ch of keys) {
        collect(node.children[ch], path + ch);
      }
    };

    collect(current, normalized);
    return { matches, matchedTitles, steps: [...this.steps], prefixLength: normalized.length };
  }

  delete(word: string): boolean {
    this.steps = [];
    const normalized = word.trim().toLowerCase();
    let deleted = false;

    const _delete = (node: TrieNode<T>, idx: number): boolean => {
      if (idx === normalized.length) {
        if (!node.isEndOfWord) return false;
        node.isEndOfWord = false;
        node.words = [];
        node.payloads = [];
        this.wordCount--;
        deleted = true;
        this.steps.push(`Unmarked terminal flag for "${word}"`);
        return Object.keys(node.children).length === 0;
      }
      const ch = normalized[idx];
      const child = node.children[ch];
      if (!child) return false;

      const shouldDeleteChild = _delete(child, idx + 1);
      if (shouldDeleteChild) {
        delete node.children[ch];
        this.steps.push(`Pruned unused Trie edge '${ch}'`);
        return !node.isEndOfWord && Object.keys(node.children).length === 0;
      }
      return false;
    };

    _delete(this.root, 0);
    return deleted;
  }

  getAllWords(): string[] {
    const words: string[] = [];
    const dfs = (node: TrieNode<T>) => {
      if (node.isEndOfWord) {
        words.push(...node.words);
      }
      for (const k of Object.keys(node.children).sort()) {
        dfs(node.children[k]);
      }
    };
    dfs(this.root);
    return words;
  }
}

// ============================================================================
// 3. CUSTOM HASHMAP – BOOKING, SEAT & ENTITY LOOKUP (O(1) Average)
// ============================================================================

export interface HashEntry<V> {
  key: string;
  value: V;
  hashValue: number;
}

export class CustomHashMap<V> {
  private buckets: HashEntry<V>[][];
  private capacity: number;
  private count: number = 0;
  public collisionCount: number = 0;
  public steps: string[] = [];

  constructor(capacity: number = 16) {
    this.capacity = capacity;
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  // Deterministic Polynomial Rolling Hash Function
  public hash(key: string): number {
    let h = 0;
    const prime = 31;
    for (let i = 0; i < key.length; i++) {
      h = (h * prime + key.charCodeAt(i)) >>> 0;
    }
    return h % this.capacity;
  }

  public put(key: string, value: V): void {
    this.steps = [];
    const index = this.hash(key);
    this.steps.push(`hash("${key}") = ${index} (capacity=${this.capacity})`);
    const bucket = this.buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket[i].value = value;
        this.steps.push(`Updated existing key "${key}" in bucket[${index}] at chain pos ${i}`);
        return;
      }
    }

    if (bucket.length > 0) {
      this.collisionCount++;
      this.steps.push(`Collision detected in bucket[${index}]! Appending "${key}" via Separate Chaining (chain length=${bucket.length + 1})`);
    } else {
      this.steps.push(`Inserted "${key}" directly into empty bucket[${index}] in O(1)`);
    }

    bucket.push({ key, value, hashValue: index });
    this.count++;
  }

  public get(key: string): V | undefined {
    this.steps = [];
    const index = this.hash(key);
    this.steps.push(`hash("${key}") → bucket[${index}]`);
    const bucket = this.buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      this.steps.push(`Checking chain node ${i}: key="${bucket[i].key}"`);
      if (bucket[i].key === key) {
        this.steps.push(`O(1) Lookup hit for "${key}"`);
        return bucket[i].value;
      }
    }
    this.steps.push(`Key "${key}" not found in bucket[${index}]`);
    return undefined;
  }

  public remove(key: string): boolean {
    this.steps = [];
    const index = this.hash(key);
    const bucket = this.buckets[index];

    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].key === key) {
        bucket.splice(i, 1);
        this.count--;
        this.steps.push(`Removed key "${key}" from bucket[${index}]`);
        return true;
      }
    }
    this.steps.push(`Key "${key}" not found for removal`);
    return false;
  }

  public values(): V[] {
    const all: V[] = [];
    for (const bucket of this.buckets) {
      for (const entry of bucket) {
        all.push(entry.value);
      }
    }
    return all;
  }

  public entries(): HashEntry<V>[] {
    const all: HashEntry<V>[] = [];
    for (const bucket of this.buckets) {
      for (const entry of bucket) {
        all.push(entry);
      }
    }
    return all;
  }

  public getBuckets(): { index: number; chain: HashEntry<V>[] }[] {
    return this.buckets.map((chain, index) => ({
      index,
      chain: [...chain],
    }));
  }

  public size(): number {
    return this.count;
  }

  public getLoadFactor(): number {
    return Number((this.count / this.capacity).toFixed(2));
  }
}

// ============================================================================
// 4. RECURSIVE MERGE SORT – MOVIE & THEATRE SORTING (O(n log n) Stable)
// ============================================================================

export interface MergeSortStep {
  depth: number;
  action: 'split' | 'merge';
  leftLabels: string[];
  rightLabels: string[];
  mergedLabels?: string[];
}

export class MergeSort {
  static sort<T>(
    items: T[],
    comparator: (a: T, b: T) => number,
    labelFn: (item: T) => string = (item) => String(item)
  ): {
    sorted: T[];
    comparisons: number;
    merges: number;
    steps: MergeSortStep[];
  } {
    let comparisons = 0;
    let merges = 0;
    const steps: MergeSortStep[] = [];

    const merge = (left: T[], right: T[], depth: number): T[] => {
      const result: T[] = [];
      let i = 0;
      let j = 0;

      while (i < left.length && j < right.length) {
        comparisons++;
        // <= ensures stability for equal keys
        if (comparator(left[i], right[j]) <= 0) {
          result.push(left[i]);
          i++;
        } else {
          result.push(right[j]);
          j++;
        }
        merges++;
      }

      while (i < left.length) {
        result.push(left[i]);
        i++;
        merges++;
      }

      while (j < right.length) {
        result.push(right[j]);
        j++;
        merges++;
      }

      steps.push({
        depth,
        action: 'merge',
        leftLabels: left.map(labelFn),
        rightLabels: right.map(labelFn),
        mergedLabels: result.map(labelFn),
      });

      return result;
    };

    const recursiveSort = (arr: T[], depth: number): T[] => {
      if (arr.length <= 1) return arr;

      const mid = Math.floor(arr.length / 2);
      const left = arr.slice(0, mid);
      const right = arr.slice(mid);

      steps.push({
        depth,
        action: 'split',
        leftLabels: left.map(labelFn),
        rightLabels: right.map(labelFn),
      });

      const sortedLeft = recursiveSort(left, depth + 1);
      const sortedRight = recursiveSort(right, depth + 1);

      return merge(sortedLeft, sortedRight, depth);
    };

    const sorted = recursiveSort([...items], 0);
    return { sorted, comparisons, merges, steps };
  }
}

// ============================================================================
// 5. FIFO QUEUE – BOOKING REQUEST & WAITLIST MANAGEMENT (O(1) Operations)
// ============================================================================

export class FIFOQueue<T> {
  private items: Record<number, T> = {};
  private head: number = 0;
  private tail: number = 0;
  public steps: string[] = [];
  public totalProcessed: number = 0;

  enqueue(item: T, label: string = 'Request'): void {
    this.items[this.tail] = item;
    this.steps.push(`ENQUEUE [${label}] at tail=${this.tail} (size=${this.size() + 1}) — O(1)`);
    this.tail++;
  }

  dequeue(label: string = 'Request'): T | undefined {
    if (this.isEmpty()) {
      this.steps.push(`DEQUEUE attempted on empty queue`);
      return undefined;
    }
    const item = this.items[this.head];
    delete this.items[this.head];
    this.steps.push(`DEQUEUE [${label}] from head=${this.head} (remaining=${this.size() - 1}) — O(1)`);
    this.head++;
    this.totalProcessed++;
    return item;
  }

  peek(): T | undefined {
    if (this.isEmpty()) return undefined;
    return this.items[this.head];
  }

  isEmpty(): boolean {
    return this.tail === this.head;
  }

  size(): number {
    return this.tail - this.head;
  }

  toArray(): T[] {
    const arr: T[] = [];
    for (let i = this.head; i < this.tail; i++) {
      arr.push(this.items[i]);
    }
    return arr;
  }
}
