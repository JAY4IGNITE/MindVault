import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
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
  Layers,
  AlertCircle,
  BrainCircuit,
  MessageSquareText,
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group: number;
  val: number;
  data: any;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string | any;
  target: string | any;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

const FILTER_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '9999', label: 'All Time' },
];

const NODE_CONFIG: Record<string, { bg: string; darkBg: string; border: string; label: string }> = {
  memory: { bg: '#0284c7', darkBg: '#38bdf8', border: '#bae6fd', label: 'Memory' },
  idea: { bg: '#9333ea', darkBg: '#c084fc', border: '#e9d5ff', label: 'Idea' },
  goal: { bg: '#10b981', darkBg: '#34d399', border: '#a7f3d0', label: 'Goal' },
  decision: { bg: '#ef4444', darkBg: '#f87171', border: '#fecaca', label: 'Decision' },
  topic: { bg: '#f59e0b', darkBg: '#fbbf24', border: '#fde68a', label: 'Topic' },
  project: { bg: '#06b6d4', darkBg: '#22d3ee', border: '#a5f3fc', label: 'Project' },
};

const DEFAULT_CONFIG = { bg: '#64748b', darkBg: '#94a3b8', border: '#cbd5e1', label: 'Entity' };

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
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(['memory', 'idea', 'goal', 'decision', 'topic', 'project']));

  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const fetchGraphData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await api.get(`/api/v1/graph?days=${timeFilter}`);
      if (res.data.nodes && res.data.nodes.length > 0) {
        setGraphData({
          nodes: res.data.nodes,
          links: res.data.edges || res.data.links || [],
        });
      } else {
        setGraphData(EMPTY_GRAPH_DATA);
      }
      setTimeout(() => graphRef.current?.zoomToFit(400, 50), 400);
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

  // Connected node ids for hover highlighting
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const ids = new Set<string>([hoveredNode.id]);
    filteredData.links.forEach((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sId === hoveredNode.id) ids.add(tId);
      if (tId === hoveredNode.id) ids.add(sId);
    });
    return ids;
  }, [hoveredNode, filteredData.links]);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type); // Keep at least one active
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    graphRef.current?.centerAt(node.x || 0, node.y || 0, 700);
    graphRef.current?.zoom(2.5, 700);
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
    graphRef.current?.centerAt(0, 0, 400);
    graphRef.current?.zoomToFit(400, 40);
  };

  const hasNodes = filteredData.nodes.length > 0;
  const isSingleNode = filteredData.nodes.length === 1;

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-4">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 pb-1">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Network className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[26px] font-bold font-display text-foreground tracking-tight leading-tight">
              Memory Graph Topology
            </h1>
            <p className="text-xs sm:text-[13.5px] text-muted-foreground mt-0.5 leading-normal">
              Interactive force-directed graph of interconnected memories, goals, and decisions
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.04] border border-border/70 shadow-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-transparent text-xs sm:text-[13px] text-foreground font-medium border-none focus:ring-0 cursor-pointer pr-2 outline-none"
              disabled={isLoading}
            >
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchGraphData}
            disabled={isLoading}
            className="h-8 sm:h-9 px-3.5 rounded-full text-xs sm:text-sm gap-1.5 border-border/80 hover:bg-foreground/5 shadow-xs font-medium"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden relative">
        <div
          ref={containerRef}
          className="flex-1 min-h-[500px] h-full rounded-[22px] sm:rounded-[26px] border border-border/80 dark:border-border/60 bg-card/60 dark:bg-foreground/[0.015] backdrop-blur-xl shadow-sm overflow-hidden relative"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/70 dark:bg-background/80 backdrop-blur-xs space-y-3 animate-fade-in">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Building your memory graph topology...
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
              <Button onClick={fetchGraphData} size="sm" variant="outline" className="rounded-xl mt-2">
                Retry
              </Button>
            </div>
          )}

          {/* Empty State (CRITICAL) */}
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
                  Capture memories, goals, ideas, and decisions to begin building your personal interconnected knowledge network.
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

          {/* Single Node Prompt Badge */}
          {hasNodes && isSingleNode && (
            <div className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-background/80 dark:bg-foreground/[0.04] border border-border/80 shadow-sm backdrop-blur-md text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>1 node in your vault — Add more reflections or memories to generate connections.</span>
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
            </div>
          )}

          {/* Floating Legend Overlay (Bottom-Left) */}
          {hasNodes && (
            <div className="absolute bottom-4 left-4 z-20 bg-background/85 dark:bg-foreground/[0.04] backdrop-blur-md p-3.5 rounded-2xl border border-border/80 shadow-md text-xs space-y-2 max-w-[220px]">
              <span className="font-semibold text-foreground tracking-tight block text-[11px] uppercase tracking-wider text-muted-foreground">
                Entity Topology
              </span>
              <div className="space-y-1.5">
                {(['memory', 'idea', 'goal', 'decision'] as const).map((type) => {
                  const cfg = NODE_CONFIG[type] || DEFAULT_CONFIG;
                  const isActive = activeTypes.has(type);
                  const color = isDark ? cfg.darkBg : cfg.bg;
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      title={`Toggle ${cfg.label} visibility`}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition-colors cursor-pointer select-none",
                        isActive ? "hover:bg-foreground/5 text-foreground" : "opacity-40 hover:opacity-70 line-through text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-xs capitalize">{cfg.label}</span>
                      </div>
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
              nodeLabel={(node: any) => `
                <div style="background: rgba(15, 23, 42, 0.95); color: #fff; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-family: sans-serif; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                  <span style="font-weight: 700; text-transform: capitalize; color: ${isDark ? (NODE_CONFIG[node.type]?.darkBg || '#94a3b8') : (NODE_CONFIG[node.type]?.bg || '#64748b')};">${node.type}</span>: ${node.label}
                </div>
              `}
              nodeColor={(node: any) => {
                const cfg = NODE_CONFIG[node.type] || DEFAULT_CONFIG;
                const baseColor = isDark ? cfg.darkBg : cfg.bg;
                if (hoveredNode && !connectedNodeIds.has(node.id)) {
                  return isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.4)';
                }
                return baseColor;
              }}
              nodeVal={(node: any) => (node.val || 5) * 1.4}
              linkColor={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (hoveredNode && (sId === hoveredNode.id || tId === hoveredNode.id)) {
                  return isDark ? 'rgba(129, 140, 248, 0.9)' : 'rgba(79, 70, 229, 0.8)';
                }
                return isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.4)';
              }}
              linkWidth={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                if (hoveredNode && (sId === hoveredNode.id || tId === hoveredNode.id)) {
                  return 2.5;
                }
                return 1.2;
              }}
              linkDirectionalParticles={(link: any) => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                return hoveredNode && (sId === hoveredNode.id || tId === hoveredNode.id) ? 3 : 1;
              }}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleWidth={2}
              onNodeClick={(node: any) => handleNodeClick(node)}
              onNodeHover={(node: any) => setHoveredNode(node || null)}
              backgroundColor={isDark ? '#0b0c10' : '#f8fafc'}
              cooldownTicks={120}
              onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
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
              className="w-80 sm:w-96 bg-card border border-border/80 rounded-[22px] shadow-xl p-5 flex flex-col justify-between z-30 shrink-0"
            >
              <div className="space-y-4 overflow-y-auto pr-1">
                <div className="flex items-start justify-between pb-3 border-b border-border/70">
                  <div>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider mb-2"
                      style={{
                        backgroundColor:
                          NODE_CONFIG[selectedNode.type]?.bg || DEFAULT_CONFIG.bg,
                      }}
                    >
                      {selectedNode.type}
                    </span>
                    <h3 className="text-base font-bold text-foreground leading-tight tracking-tight">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    aria-label="Close details"
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
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
                      <p className="text-foreground/90">{selectedNode.data.description}</p>
                    </div>
                  )}
                  {selectedNode.data?.reasoning && (
                    <div>
                      <span className="font-semibold text-foreground block mb-1">Reasoning:</span>
                      <p className="text-foreground/90">{selectedNode.data.reasoning}</p>
                    </div>
                  )}
                  {selectedNode.data?.createdAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(
                          selectedNode.data.createdAt.seconds
                            ? selectedNode.data.createdAt.seconds * 1000
                            : selectedNode.data.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border/70 flex justify-between items-center text-[11px] text-muted-foreground">
                <span className="font-mono truncate max-w-[140px]">ID: {selectedNode.id}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 rounded-lg"
                  onClick={handleReset}
                >
                  Reset View
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MemoryGraphPage;
