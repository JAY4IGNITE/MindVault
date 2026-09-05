import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeProvider';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import {
  Loader2,
  Network,
  X,
  Filter,
  ArrowRight,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Sparkles,
  AlertCircle,
  BrainCircuit,
  MessageSquareText,
  Search,
  BookOpen,
  Target,
  GitMerge,
  ExternalLink,
  Activity,
  Layers,
  Tag,
  Maximize,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group: number;
  val: number;
  connectionsCount?: number;
  data: any;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string | any;
  target: string | any;
  type: string;
  label?: string;
  weight?: number;
}

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  density: number;
  topHubs: { id: string; label: string; connections: number }[];
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
  stats?: GraphStats;
}

const FILTER_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '9999', label: 'All Time' },
];

const NODE_CONFIG: Record<string, { bg: string; darkBg: string; border: string; label: string; icon: string }> = {
  memory: { bg: '#0284c7', darkBg: '#38bdf8', border: '#bae6fd', label: 'Memory', icon: '🧠' },
  idea: { bg: '#9333ea', darkBg: '#c084fc', border: '#e9d5ff', label: 'Idea', icon: '💡' },
  goal: { bg: '#10b981', darkBg: '#34d399', border: '#a7f3d0', label: 'Goal', icon: '🎯' },
  decision: { bg: '#ef4444', darkBg: '#f87171', border: '#fecaca', label: 'Decision', icon: '⚖️' },
  topic: { bg: '#f59e0b', darkBg: '#fbbf24', border: '#fde68a', label: 'Topic Hub', icon: '🏷️' },
  journal: { bg: '#6366f1', darkBg: '#818cf8', border: '#c7d2fe', label: 'Journal', icon: '📖' },
  project: { bg: '#06b6d4', darkBg: '#22d3ee', border: '#a5f3fc', label: 'Project', icon: '⚡' },
};

const DEFAULT_CONFIG = { bg: '#64748b', darkBg: '#94a3b8', border: '#cbd5e1', label: 'Entity', icon: '✦' };

const EMPTY_GRAPH_DATA: GraphData = {
  nodes: [],
  links: [],
};

const MemoryGraphPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [graphData, setGraphData] = useState<GraphData>(EMPTY_GRAPH_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [timeFilter, setTimeFilter] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    new Set(['memory', 'idea', 'goal', 'decision', 'topic', 'journal', 'project'])
  );
  const [labelMode, setLabelMode] = useState<'auto' | 'all' | 'hover'>('auto');
  const [spacingPreset, setSpacingPreset] = useState<'spacious' | 'panoramic' | 'compact'>('spacious');

  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const hasInitializedZoom = useRef(false);

  const fetchGraphData = useCallback(async (isRefresh = false) => {
    if (!currentUser) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const url = `/api/v1/graph?days=${timeFilter}${isRefresh ? '&refresh=true' : ''}`;
      const res = await api.get(url);
      if (res.data.nodes && res.data.nodes.length > 0) {
        setGraphData({
          nodes: res.data.nodes,
          links: res.data.edges || res.data.links || [],
          stats: res.data.stats,
        });
      } else {
        setGraphData(EMPTY_GRAPH_DATA);
      }
      setTimeout(() => graphRef.current?.zoomToFit(400, 60), 450);
    } catch (error) {
      console.warn('Backend graph API returned error:', error);
      setHasError(true);
      setGraphData(EMPTY_GRAPH_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, timeFilter]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Configure high-repulsion physics and anti-overlap collision forces
  useEffect(() => {
    if (!graphRef.current) return;

    const chargeStrength =
      spacingPreset === 'panoramic' ? -1800 : spacingPreset === 'compact' ? -750 : -1250;
    const linkDistance =
      spacingPreset === 'panoramic' ? 220 : spacingPreset === 'compact' ? 120 : 165;

    const chargeForce: any = graphRef.current.d3Force('charge');
    if (chargeForce) {
      chargeForce.strength(chargeStrength);
      if (chargeForce.distanceMax) chargeForce.distanceMax(1400);
      if (chargeForce.distanceMin) chargeForce.distanceMin(40);
    }

    const linkForce: any = graphRef.current.d3Force('link');
    if (linkForce) {
      linkForce.distance(linkDistance);
      linkForce.strength(0.35);
    }

    const centerForce: any = graphRef.current.d3Force('center');
    if (centerForce) {
      centerForce.strength(0.03);
    }

    // Force Collision: physically ensures nodes NEVER overlap
    graphRef.current.d3Force(
      'collide',
      forceCollide((node: any) => {
        const baseRadius = Math.max(10, Math.min(24, (node.val || 6) * 1.4));
        return baseRadius + 32;
      }).iterations(3)
    );

    graphRef.current.d3ReheatSimulation();
  }, [graphData, activeTypes, spacingPreset]);

  // Filter nodes & links based on activeTypes toggle
  const filteredData = useMemo(() => {
    const visibleNodes = graphData.nodes.filter((node) => activeTypes.has(node.type));
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const visibleLinks = graphData.links.filter((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      return visibleNodeIds.has(sId) && visibleNodeIds.has(tId);
    });
    return { nodes: visibleNodes, links: visibleLinks };
  }, [graphData, activeTypes]);

  // Connected node ids for hover / selection highlighting
  const activeFocusNode = selectedNode || hoveredNode;
  const connectedNodeIds = useMemo(() => {
    if (!activeFocusNode) return new Set<string>();
    const ids = new Set<string>([activeFocusNode.id]);
    filteredData.links.forEach((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sId === activeFocusNode.id) ids.add(tId);
      if (tId === activeFocusNode.id) ids.add(sId);
    });
    return ids;
  }, [activeFocusNode, filteredData.links]);

  // Connected edges for the currently selected node (synapse inspector)
  const selectedNodeConnections = useMemo(() => {
    if (!selectedNode) return [];
    return filteredData.links
      .filter((link) => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        return sId === selectedNode.id || tId === selectedNode.id;
      })
      .map((link) => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        const isOutgoing = sId === selectedNode.id;
        const targetId = isOutgoing ? tId : sId;
        const targetNode = filteredData.nodes.find((n) => n.id === targetId);
        return {
          id: `${sId}-${tId}`,
          direction: isOutgoing ? 'outgoing' : 'incoming',
          type: link.label || link.type || 'related to',
          targetNode,
        };
      })
      .filter((c) => c.targetNode);
  }, [selectedNode, filteredData]);

  // Handle Search Input & focus matching node
  const handleSearch = (term: string) => {
    setSearchQuery(term);
    if (!term.trim()) return;

    const matched = filteredData.nodes.find((n) =>
      (n.label || '').toLowerCase().includes(term.toLowerCase())
    );

    if (matched) {
      setSelectedNode(matched);
      graphRef.current?.centerAt(matched.x || 0, matched.y || 0, 700);
      graphRef.current?.zoom(2.2, 700);
    }
  };

  // Toggle type filter
  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    graphRef.current?.centerAt(node.x || 0, node.y || 0, 600);
    graphRef.current?.zoom(2.2, 600);
  };

  // Zoom controls
  const handleZoomIn = () => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom * 1.35, 300);
  };

  const handleZoomOut = () => {
    const currentZoom = graphRef.current?.zoom() || 1;
    graphRef.current?.zoom(currentZoom / 1.35, 300);
  };

  const handleZoomToFit = () => {
    graphRef.current?.zoomToFit(400, 40);
  };

  const handleReset = () => {
    setSelectedNode(null);
    setHoveredNode(null);
    setSearchQuery('');
    graphRef.current?.centerAt(0, 0, 400);
    graphRef.current?.zoomToFit(400, 40);
  };

  // Custom Node Canvas Renderer with Smart Level-of-Detail (LOD)
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const isFocused = isHovered || isSelected;
      const isConnected = activeFocusNode ? connectedNodeIds.has(node.id) : true;
      const isSearchMatch =
        Boolean(searchQuery.trim()) &&
        (node.label || '').toLowerCase().includes(searchQuery.toLowerCase());

      const cfg = NODE_CONFIG[node.type] || DEFAULT_CONFIG;
      const color = isDark ? cfg.darkBg : cfg.bg;
      const baseRadius = Math.max(10, Math.min(24, (node.val || 6) * 1.4));
      const radius = isFocused || isSearchMatch ? baseRadius + 3 : baseRadius;

      // Dim non-connected nodes when actively focusing on an entity
      if (activeFocusNode && !isConnected) {
        ctx.globalAlpha = isDark ? 0.16 : 0.22;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Outer Glow Aura on selection, hover, or search match
      if (isFocused || isSearchMatch) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSelected
          ? 'rgba(99, 102, 241, 0.45)'
          : isSearchMatch
          ? 'rgba(245, 158, 11, 0.45)'
          : isDark
          ? 'rgba(255, 255, 255, 0.24)'
          : 'rgba(79, 70, 229, 0.24)';
        ctx.fill();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = !isConnected
        ? isDark
          ? 'rgba(100, 116, 139, 0.3)'
          : 'rgba(203, 213, 225, 0.4)'
        : color;
      ctx.fill();

      // Sharp contrast border
      ctx.lineWidth = isSelected ? 3 : isFocused ? 2.2 : 1.6;
      ctx.strokeStyle = isSelected
        ? '#ffffff'
        : isDark
        ? 'rgba(255, 255, 255, 0.75)'
        : 'rgba(0, 0, 0, 0.22)';
      ctx.stroke();

      // Inner Symbol / Emoji Icon
      const symbol = cfg.icon || '✦';
      const iconSize = Math.max(9, radius * 0.85);
      ctx.font = `${iconSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, node.x, node.y);

      // Level-of-Detail Label Rendering (avoids clumsy overlapping text)
      const isMajorHub = (node.connectionsCount || 0) >= 3;
      let shouldDrawLabel = false;

      if (labelMode === 'all') {
        shouldDrawLabel = true;
      } else if (labelMode === 'hover') {
        shouldDrawLabel = isFocused || isSearchMatch;
      } else {
        // Smart LOD mode: Show for focused/search nodes, major hubs at standard zoom, or all nodes when zoomed in
        shouldDrawLabel =
          isFocused ||
          isSearchMatch ||
          (isMajorHub && globalScale >= 0.85) ||
          globalScale >= 1.35;
      }

      if (shouldDrawLabel) {
        const label = node.label || node.id;
        const cleanLabel = label.length > 30 ? label.substring(0, 28) + '…' : label;
        const fontSize = Math.max(8.5, Math.min(13, 11 / Math.max(globalScale, 0.75)));
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const textWidth = ctx.measureText(cleanLabel).width;
        const pillPadX = 8;
        const pillPadY = 3.5;
        const pillW = textWidth + pillPadX * 2;
        const pillH = fontSize + pillPadY * 2;
        const pillX = node.x - pillW / 2;
        const pillY = node.y + radius + 5;
        const pillR = 5;

        // Draw background pill for crystal clear text readability
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, pillR);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = isSelected
          ? '#6366f1'
          : isHovered
          ? color
          : isDark
          ? 'rgba(255, 255, 255, 0.18)'
          : 'rgba(0, 0, 0, 0.12)';
        ctx.stroke();

        // Draw label text
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cleanLabel, node.x, pillY + pillH / 2);
      }

      ctx.globalAlpha = 1.0;
    },
    [hoveredNode, selectedNode, activeFocusNode, connectedNodeIds, searchQuery, isDark, labelMode]
  );

  // Custom Link Canvas Renderer (Edge Relationship Labels)
  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const source = typeof link.source === 'object' ? link.source : null;
      const target = typeof link.target === 'object' ? link.target : null;
      if (!source || !target || source.x == null || target.x == null) return;

      const sId = source.id;
      const tId = target.id;
      const isHovered = hoveredNode && (sId === hoveredNode.id || tId === hoveredNode.id);
      const isSelected = selectedNode && (sId === selectedNode.id || tId === selectedNode.id);

      // Only draw relationship labels when zoomed in (scale > 0.85) or when link is focused
      const shouldDrawLabel = (globalScale > 0.85 || isHovered || isSelected) && link.label;

      if (shouldDrawLabel) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        const label = link.label || link.type || 'related to';
        const fontSize = Math.max(7.5, 9 / Math.max(globalScale, 0.65));
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const padX = 5;
        const padY = 2;
        const pillW = textWidth + padX * 2;
        const pillH = fontSize + padY * 2;

        // Label pill background
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 3);
        } else {
          ctx.rect(midX - pillW / 2, midY - pillH / 2, pillW, pillH);
        }
        ctx.fill();

        ctx.strokeStyle = isHovered || isSelected
          ? (isDark ? '#818cf8' : '#4f46e5')
          : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)');
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Label text
        ctx.fillStyle = isHovered || isSelected
          ? (isDark ? '#a5b4fc' : '#4338ca')
          : (isDark ? '#94a3b8' : '#64748b');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY);
      }
    },
    [hoveredNode, selectedNode, isDark]
  );

  const paintNodePointerArea = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const radius = Math.max(9, Math.min(22, (node.val || 5) * 1.4));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
    ctx.fill();
  }, []);

  const hasNodes = filteredData.nodes.length > 0;
  const isSingleNode = filteredData.nodes.length === 1;

  // Helper link to navigate to the original item in the respective page
  const getNodeDeepLink = (node: GraphNode) => {
    switch (node.type) {
      case 'journal':
        return '/journal';
      case 'memory':
      case 'idea':
        return '/memories';
      case 'goal':
        return '/goals';
      case 'decision':
        return `/decisions/${node.id}`;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-3.5 sm:space-y-4">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shrink-0 pb-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Network className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[26px] font-bold font-display text-foreground tracking-tight leading-tight">
              Memory Graph Topology
            </h1>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 leading-normal">
              High-precision associative network of interconnected thoughts, decisions, and goals
            </p>
          </div>
        </div>

        {/* Toolbar: Search + Labels Mode + Spacing + Time Filter + Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {/* Instant Search Bar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-border/70 shadow-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search graph..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 border-none outline-none w-24 sm:w-32"
            />
            {searchQuery && (
              <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Label Density Switcher */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-border/70 shadow-xs text-xs">
            <button
              onClick={() => setLabelMode('auto')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-all text-[11px]',
                labelMode === 'auto'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Smart LOD: labels on hover, hubs, and when zoomed in"
            >
              Smart Labels
            </button>
            <button
              onClick={() => setLabelMode('hover')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-all text-[11px]',
                labelMode === 'hover'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Clean: labels on hover only"
            >
              Hover Only
            </button>
            <button
              onClick={() => setLabelMode('all')}
              className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-all text-[11px]',
                labelMode === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Show all labels"
            >
              All
            </button>
          </div>

          {/* Spacing Preset Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-border/70 shadow-xs">
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={spacingPreset}
              onChange={(e: any) => setSpacingPreset(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium border-none focus:ring-0 cursor-pointer pr-1 outline-none"
              title="Control repulsive distance between nodes"
            >
              <option value="compact" className="bg-background text-foreground">Compact Spacing</option>
              <option value="spacious" className="bg-background text-foreground">Spacious (Default)</option>
              <option value="panoramic" className="bg-background text-foreground">Panoramic Wide</option>
            </select>
          </div>

          {/* Time Window Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-border/70 shadow-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground font-medium border-none focus:ring-0 cursor-pointer pr-2 outline-none"
              disabled={isLoading}
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              hasInitializedZoom.current = false;
              fetchGraphData(true);
            }}
            disabled={isLoading}
            className="h-8 sm:h-9 px-3.5 rounded-full text-xs sm:text-sm gap-1.5 border-border/80 hover:bg-foreground/5 shadow-xs font-medium"
            title="Reload latest graph topology"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Analytical Graph Stats Bar */}
      {hasNodes && graphData.stats && (
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>{graphData.stats.totalNodes} Total Entities</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 font-medium">
            <Network className="h-3.5 w-3.5" />
            <span>{graphData.stats.totalEdges} Active Relationships</span>
          </div>
          {graphData.stats.topHubs && graphData.stats.topHubs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Primary Hub: {graphData.stats.topHubs[0].label}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Canvas Container */}
      <div className="flex-1 min-h-0 flex gap-3.5 overflow-hidden relative">
        <div
          ref={containerRef}
          className="flex-1 min-h-[500px] h-full rounded-[24px] sm:rounded-[28px] border border-border/80 dark:border-border/60 bg-card/60 dark:bg-foreground/[0.015] backdrop-blur-xl shadow-sm overflow-hidden relative"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/70 dark:bg-background/80 backdrop-blur-xs space-y-3 animate-fade-in">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Synthesizing high-precision memory topology...
              </p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && hasError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Unable to load memory graph</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                We couldn't retrieve your memory relationships right now.
              </p>
              <Button onClick={() => fetchGraphData()} size="sm" variant="outline" className="rounded-xl mt-2">
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !hasError && !hasNodes && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-center text-primary shadow-xs">
                <BrainCircuit className="h-8 w-8 opacity-80" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-lg font-bold text-foreground font-display tracking-tight">
                  Your memory graph is waiting to grow
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Capture reflections, memories, goals, and decisions to construct your personal associative knowledge network.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link to="/chat">
                  <Button variant="default" size="sm" className="rounded-xl gap-1.5 shadow-sm font-medium">
                    <MessageSquareText className="h-4 w-4" /> Go to Dialogue
                  </Button>
                </Link>
                <Link to="/memories">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-medium">
                    <Plus className="h-4 w-4" /> Create Memory
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Floating Navigation Controls (Bottom-Right) */}
          {hasNodes && (
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-background/85 dark:bg-foreground/[0.04] backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-md">
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom In"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-foreground/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                aria-label="Zoom Out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-foreground/10 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomToFit}
                title="Fit to Screen"
                aria-label="Fit to Screen"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-foreground/10 transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleReset}
                title="Reset View"
                aria-label="Reset View"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-foreground/10 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setSpacingPreset((prev) => (prev === 'panoramic' ? 'spacious' : 'panoramic'));
                }}
                title={spacingPreset === 'panoramic' ? 'Reset to Standard Spacing' : 'Spread Nodes Farther Apart'}
                aria-label="Spread Nodes"
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  spacingPreset === 'panoramic'
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:bg-foreground/10'
                )}
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Floating Category Filter Legend (Bottom-Left) */}
          {hasNodes && (
            <div className="absolute bottom-4 left-4 z-20 bg-background/90 dark:bg-card/90 backdrop-blur-md p-3.5 rounded-2xl border border-border/80 shadow-md text-xs space-y-2 max-w-[240px]">
              <span className="font-semibold text-foreground tracking-tight block text-[11px] uppercase tracking-wider text-muted-foreground">
                Entity Topology Filter
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(NODE_CONFIG).map(([type, cfg]) => {
                  const isActive = activeTypes.has(type);
                  const color = isDark ? cfg.darkBg : cfg.bg;
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-left',
                        isActive
                          ? 'bg-foreground/5 dark:bg-foreground/10 text-foreground font-medium border border-border/60'
                          : 'opacity-40 hover:opacity-75 text-muted-foreground border border-transparent'
                      )}
                    >
                      <span className="text-xs">{cfg.icon}</span>
                      <span className="truncate text-[11px] font-medium">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Force Graph Visualization */}
          {hasNodes && (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={filteredData}
              nodeCanvasObject={drawNode}
              nodePointerAreaPaint={paintNodePointerArea}
              linkCanvasObjectMode={() => 'after'}
              linkCanvasObject={drawLink}
              nodeLabel={(node: any) => `
                <div style="background: rgba(15, 23, 42, 0.95); color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-family: sans-serif; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                  <span style="font-weight: 700; text-transform: capitalize; color: ${isDark ? (NODE_CONFIG[node.type]?.darkBg || '#94a3b8') : (NODE_CONFIG[node.type]?.bg || '#64748b')};">${node.type}</span>: ${node.label}
                  <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Connections: ${node.connectionsCount || 1}</div>
                </div>
              `}
              linkCurvature={0.08}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={1}
              linkDirectionalArrowColor={(link: any) =>
                isDark ? 'rgba(148, 163, 184, 0.75)' : 'rgba(100, 116, 139, 0.75)'
              }
              linkDirectionalParticles={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                return activeFocusNode && (sId === activeFocusNode.id || tId === activeFocusNode.id) ? 4 : 2;
              }}
              linkDirectionalParticleSpeed={0.006}
              linkDirectionalParticleWidth={2.5}
              linkWidth={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (activeFocusNode && (sId === activeFocusNode.id || tId === activeFocusNode.id)) {
                  return 3.2;
                }
                return 1.8;
              }}
              linkColor={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (activeFocusNode && (sId === activeFocusNode.id || tId === activeFocusNode.id)) {
                  return isDark ? '#818cf8' : '#4f46e5';
                }
                return isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.55)';
              }}
              onNodeClick={(node: any) => handleNodeClick(node)}
              onNodeHover={(node: any) => setHoveredNode(node || null)}
              backgroundColor={isDark ? '#0b0c10' : '#f8fafc'}
              d3VelocityDecay={0.35}
              d3AlphaDecay={0.02}
              warmupTicks={80}
              cooldownTicks={180}
              onEngineStop={() => {
                if (!hasInitializedZoom.current) {
                  hasInitializedZoom.current = true;
                  graphRef.current?.zoomToFit(400, 60);
                }
              }}
            />
          )}
        </div>

        {/* Selected Node Details Drawer */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-80 sm:w-[380px] bg-card/95 backdrop-blur-xl border border-border/80 rounded-[24px] shadow-xl p-5 flex flex-col justify-between z-30 shrink-0"
            >
              <div className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-border/70">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            NODE_CONFIG[selectedNode.type]?.bg || DEFAULT_CONFIG.bg,
                        }}
                      >
                        <span>{NODE_CONFIG[selectedNode.type]?.icon || '✦'}</span>
                        <span>{selectedNode.type}</span>
                      </span>
                      {selectedNode.connectionsCount && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {selectedNode.connectionsCount} Synapses
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground leading-snug tracking-tight">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    aria-label="Close details"
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="space-y-3.5 text-xs leading-relaxed text-muted-foreground">
                  {selectedNode.data?.content && (
                    <div>
                      <span className="font-semibold text-foreground block mb-1">Entity Details:</span>
                      <p className="bg-muted/40 p-3 rounded-xl border border-border/60 text-foreground">
                        {selectedNode.data.content}
                      </p>
                    </div>
                  )}

                  {selectedNode.data?.description && (
                    <div>
                      <span className="font-semibold text-foreground block mb-1">Description:</span>
                      <p className="bg-muted/30 p-2.5 rounded-xl border border-border/50 text-foreground/90">
                        {selectedNode.data.description}
                      </p>
                    </div>
                  )}

                  {selectedNode.data?.reasoning && (
                    <div>
                      <span className="font-semibold text-foreground block mb-1">Reasoning:</span>
                      <p className="bg-muted/30 p-2.5 rounded-xl border border-border/50 text-foreground/90">
                        {selectedNode.data.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Connected Synapses List */}
                  {selectedNodeConnections.length > 0 && (
                    <div>
                      <span className="font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" /> Connected Synapses ({selectedNodeConnections.length}):
                      </span>
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                        {selectedNodeConnections.map((conn) => {
                          const target = conn.targetNode;
                          const cfg = NODE_CONFIG[target?.type || ''] || DEFAULT_CONFIG;
                          return (
                            <div
                              key={conn.id}
                              onClick={() => target && handleNodeClick(target)}
                              className="p-2 rounded-xl bg-foreground/[0.02] dark:bg-foreground/[0.04] hover:bg-foreground/[0.06] border border-border/60 cursor-pointer transition-all flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 pr-1">
                                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-primary block leading-none mb-1">
                                  {conn.type}
                                </span>
                                <p className="truncate text-foreground font-medium text-xs leading-tight">
                                  {target?.label}
                                </p>
                              </div>
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
                                style={{ backgroundColor: cfg.bg }}
                              >
                                {cfg.icon}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Metadata Tags */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                    {selectedNode.data?.status && (
                      <div className="bg-foreground/[0.02] p-2 rounded-lg">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">Status</span>
                        <span className="font-semibold text-foreground capitalize">{selectedNode.data.status}</span>
                      </div>
                    )}
                    {selectedNode.data?.priority && (
                      <div className="bg-foreground/[0.02] p-2 rounded-lg">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">Priority</span>
                        <span className="font-semibold text-foreground capitalize">{selectedNode.data.priority}</span>
                      </div>
                    )}
                    {selectedNode.data?.importance && (
                      <div className="bg-foreground/[0.02] p-2 rounded-lg">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">Importance</span>
                        <span className="font-semibold text-foreground">{selectedNode.data.importance}/10</span>
                      </div>
                    )}
                    {selectedNode.data?.date && (
                      <div className="bg-foreground/[0.02] p-2 rounded-lg">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">Date</span>
                        <span className="font-semibold text-foreground">{selectedNode.data.date}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Action */}
              {getNodeDeepLink(selectedNode) && (
                <div className="pt-3 border-t border-border/70 shrink-0">
                  <Link to={getNodeDeepLink(selectedNode)!}>
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1.5 justify-center">
                      <span>View in {NODE_CONFIG[selectedNode.type]?.label || 'Vault'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MemoryGraphPage;
