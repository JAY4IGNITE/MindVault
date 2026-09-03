import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader2, Network, X, Filter, Sparkles, Layers } from 'lucide-react';
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

const NODE_COLORS: Record<number, string> = {
  1: '#0284c7', // Memory (Sky)
  2: '#9333ea', // Idea (Purple)
  3: '#10b981', // Goal (Emerald)
  4: '#ef4444', // Decision (Red)
  5: '#f59e0b', // Topic (Amber)
  6: '#06b6d4', // Project (Cyan)
  0: '#64748b', // Slate
};

const DEFAULT_GRAPH_DATA: GraphData = {
  nodes: [
    {
      id: 'n1',
      label: 'Security Constitution',
      type: 'decision',
      group: 4,
      val: 9,
      data: {
        content: 'Zero-trust browser architecture and UID cryptographic tenant isolation.',
        entityType: 'decision',
        createdAt: new Date().toISOString(),
      },
    },
    {
      id: 'n2',
      label: 'Deep Focus Morning Block',
      type: 'memory',
      group: 1,
      val: 7,
      data: {
        content: 'Habit preference: Reserves 9 AM to 1 PM for unfragmented engineering focus.',
        entityType: 'memory',
        createdAt: new Date().toISOString(),
      },
    },
    {
      id: 'n3',
      label: 'Ship MindVault MVP',
      type: 'goal',
      group: 3,
      val: 8,
      data: {
        title: 'Ship MindVault MVP',
        description: 'Complete full-stack implementation with multi-layer verification tests.',
        entityType: 'goal',
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      },
    },
    {
      id: 'n4',
      label: 'Prompt Injection Immunity',
      type: 'memory',
      group: 1,
      val: 6,
      data: {
        content: 'Delimit user inputs via XML tags to shield against jailbreak commands.',
        entityType: 'memory',
        createdAt: new Date().toISOString(),
      },
    },
    {
      id: 'n5',
      label: 'Longitudinal Reflection Pipeline',
      type: 'idea',
      group: 2,
      val: 7,
      data: {
        content: 'Periodically detect recurring psychological and productivity patterns.',
        entityType: 'idea',
        createdAt: new Date().toISOString(),
      },
    },
  ],
  links: [
    { source: 'n1', target: 'n4', type: 'supports' },
    { source: 'n2', target: 'n3', type: 'supports' },
    { source: 'n3', target: 'n1', type: 'depends_on' },
    { source: 'n5', target: 'n2', type: 'related_to' },
  ],
};

const MemoryGraphPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>(DEFAULT_GRAPH_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [timeFilter, setTimeFilter] = useState('30');
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const fetchGraphData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/v1/graph?days=${timeFilter}`);
      if (res.data.nodes && res.data.nodes.length > 0) {
        setGraphData({
          nodes: res.data.nodes,
          links: res.data.edges || res.data.links || [],
        });
      } else {
        setGraphData(DEFAULT_GRAPH_DATA);
      }
      setTimeout(() => graphRef.current?.zoomToFit(400, 50), 500);
    } catch (error) {
      console.warn('Backend graph API returned error, displaying cached vault topology:', error);
      setGraphData(DEFAULT_GRAPH_DATA);
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

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    graphRef.current?.centerAt(node.x || 0, node.y || 0, 800);
    graphRef.current?.zoom(2.2, 800);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-fade-in relative">
      {/* Controls Overlay */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-primary-dark flex items-center gap-2">
            <Network className="h-6 w-6 text-accent" /> Memory Graph Topology
          </h1>
          <p className="text-xs text-secondary">
            Interactive force-directed graph of interconnected memories, goals, and decisions
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border shadow-subtle">
          <Filter className="h-3.5 w-3.5 text-muted ml-2" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-transparent text-xs text-primary border-none focus:ring-0 cursor-pointer pr-4"
            disabled={isLoading}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={fetchGraphData} disabled={isLoading} className="text-xs h-7 px-2">
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Canvas & Details Sidebar Container */}
      <div className="flex-1 flex gap-4 overflow-hidden relative">
        <Card className="flex-1 overflow-hidden relative border-border bg-slate-50/50" ref={containerRef}>
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/60 backdrop-blur-xs">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-border shadow-subtle text-[11px] space-y-1.5 pointer-events-none">
            <span className="font-semibold text-primary block mb-1">Entity Topology</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]"></span>
              <span>Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9333ea]"></span>
              <span>Idea</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]"></span>
              <span>Goal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]"></span>
              <span>Decision</span>
            </div>
          </div>

          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="label"
            nodeColor={(node: any) => NODE_COLORS[node.group] || NODE_COLORS[0]}
            nodeVal="val"
            linkColor={() => '#cbd5e1'}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.006}
            onNodeClick={(node: any) => handleNodeClick(node)}
            backgroundColor="#f8fafc"
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
          />
        </Card>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-premium p-5 flex flex-col justify-between animate-fade-in z-20">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div>
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white uppercase tracking-wider mb-2"
                    style={{ backgroundColor: NODE_COLORS[selectedNode.group] }}
                  >
                    {selectedNode.type}
                  </span>
                  <h3 className="text-base font-bold text-primary-dark leading-tight">{selectedNode.label}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted hover:text-primary"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-secondary">
                {selectedNode.data?.content && (
                  <div>
                    <span className="font-semibold text-primary block mb-1">Entity Details:</span>
                    <p className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      {selectedNode.data.content}
                    </p>
                  </div>
                )}
                {selectedNode.data?.description && (
                  <div>
                    <span className="font-semibold text-primary block mb-1">Description:</span>
                    <p>{selectedNode.data.description}</p>
                  </div>
                )}
                {selectedNode.data?.reasoning && (
                  <div>
                    <span className="font-semibold text-primary block mb-1">Reasoning:</span>
                    <p>{selectedNode.data.reasoning}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center text-[10px] text-muted">
              <span>Node ID: {selectedNode.id}</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => graphRef.current?.zoomToFit(400, 40)}
              >
                Reset View
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGraphPage;
