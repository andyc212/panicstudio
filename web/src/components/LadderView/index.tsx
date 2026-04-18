import { useMemo } from 'react';
import { useProjectStore } from '@stores';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { parseSTtoLD, type LDElementType } from '@services/parser/stParser';

const ELEMENT_COLORS: Record<LDElementType, string> = {
  leftRail: '#e6edf3',
  rightRail: '#e6edf3',
  contactNO: '#61afef',
  contactNC: '#ef4444',
  coil: '#22c55e',
  coilSet: '#eab308',
  coilReset: '#f97316',
  timerTON: '#e5c07b',
  timerTOF: '#e5c07b',
  counterCTU: '#c678dd',
  horizontalLine: '#484f58',
  verticalLine: '#484f58',
  branch: '#484f58',
  comment: '#5c6370',
};

export function LadderView() {
  const { currentProject, selectedPouId } = useProjectStore();
  const selectedPou = currentProject?.poUs.find((p: import('@types').POU) => p.id === selectedPouId);

  const rungs = useMemo(() => {
    if (!selectedPou?.body) return [];
    return parseSTtoLD(selectedPou.body);
  }, [selectedPou?.body]);

  const maxWidth = useMemo(() => {
    if (rungs.length === 0) return 600;
    return Math.max(600, ...rungs.map((r) => r.width + 60));
  }, [rungs]);

  const totalHeight = Math.max(100, rungs.length * 70 + 20);

  return (
    <div className="shrink-0 border-t border-border bg-ld flex flex-col" style={{ height: '35%', minHeight: '160px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-base-light">
        <span className="text-xs font-medium text-text-secondary">
          Ladder Diagram {rungs.length > 0 && `(${rungs.length} networks)`}
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors">
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] text-text-muted w-8 text-center">100%</span>
          <button className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors">
            <ZoomIn size={12} />
          </button>
          <div className="w-px h-3 bg-border mx-1" />
          <button className="p-1 rounded hover:bg-sidebar-hover text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* LD Canvas */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-2">
        {rungs.length > 0 ? (
          <svg
            width={maxWidth}
            height={totalHeight}
            viewBox={`0 0 ${maxWidth} ${totalHeight}`}
            className="text-text-primary"
          >
            {rungs.map((rung, ri) => {
              const rowY = ri * 70 + 10;
              const busY = rowY + 30;

              return (
                <g key={rung.id}>
                  {/* Network title */}
                  <text x="5" y={rowY + 8} className="fill-text-muted" style={{ fontSize: '8px' }}>
                    {rung.title}
                  </text>

                  {/* Left rail */}
                  <line
                    x1="15"
                    y1={rowY + 15}
                    x2="15"
                    y2={rowY + 45}
                    stroke={ELEMENT_COLORS.leftRail}
                    strokeWidth="2"
                  />

                  {/* Horizontal bus line */}
                  <line
                    x1="15"
                    y1={busY}
                    x2={maxWidth - 15}
                    y2={busY}
                    stroke={ELEMENT_COLORS.horizontalLine}
                    strokeWidth="1"
                    opacity="0.3"
                  />

                  {/* Elements */}
                  {rung.elements.map((el, ei) =>
                    renderElement(el, ELEMENT_COLORS, ei === 0, ei === rung.elements.length - 1, busY, maxWidth - 15)
                  )}

                  {/* Right rail */}
                  <line
                    x1={maxWidth - 15}
                    y1={rowY + 15}
                    x2={maxWidth - 15}
                    y2={rowY + 45}
                    stroke={ELEMENT_COLORS.rightRail}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted">
            <div className="text-center">
              <svg width="200" height="80" viewBox="0 0 200 80" className="mx-auto mb-2 opacity-40">
                <line x1="10" y1="10" x2="10" y2="70" stroke="currentColor" strokeWidth="2" />
                <line x1="10" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="1" />
                <rect x="40" y="25" width="20" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
                <line x1="60" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="1" />
                <rect x="90" y="25" width="20" height="30" fill="none" stroke="currentColor" strokeWidth="1" rx="2" />
                <line x1="95" y1="20" x2="105" y2="30" stroke="currentColor" strokeWidth="1" />
                <line x1="110" y1="40" x2="140" y2="40" stroke="currentColor" strokeWidth="1" />
                <circle cx="155" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="1" />
                <line x1="170" y1="10" x2="170" y2="70" stroke="currentColor" strokeWidth="2" />
              </svg>
              <p className="text-xs">梯形图可视化区域</p>
              <p className="text-[10px] mt-0.5">从 ST 代码自动生成</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderElement(
  el: import('@services/parser/stParser').LDElement,
  colors: Record<string, string>,
  isFirst: boolean,
  isLast: boolean,
  busY: number,
  rightRailX: number
) {
  const cx = el.x + el.width / 2;
  const cy = busY;
  const leftX = isFirst ? 15 : el.x - 10;
  const rightX = isLast ? rightRailX : el.x + el.width + 10;

  switch (el.type) {
    case 'contactNO':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={colors.contactNO} strokeWidth="1.5" rx="2" />
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'contactNC':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={colors.contactNC} strokeWidth="1.5" rx="2" />
          <line x1={el.x + 4} y1={el.y + 4} x2={el.x + el.width - 4} y2={el.y + el.height - 4} stroke={colors.contactNC} strokeWidth="1" />
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'coil':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={el.height / 2} fill="none" stroke={colors.coil} strokeWidth="1.5" />
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'coilSet':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={el.height / 2} fill="none" stroke={colors.coilSet} strokeWidth="1.5" />
          <text x={cx} y={cy + 3} textAnchor="middle" fill={colors.coilSet} style={{ fontSize: '10px', fontWeight: 'bold' }}>S</text>
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'coilReset':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <circle cx={cx} cy={cy} r={el.height / 2} fill="none" stroke={colors.coilReset} strokeWidth="1.5" />
          <text x={cx} y={cy + 3} textAnchor="middle" fill={colors.coilReset} style={{ fontSize: '10px', fontWeight: 'bold' }}>R</text>
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'timerTON':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#1e1e2e" stroke={colors.timerTON} strokeWidth="1.5" rx="2" />
          <text x={cx} y={cy - 2} textAnchor="middle" fill={colors.timerTON} style={{ fontSize: '8px', fontWeight: 'bold' }}>TON</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#8b949e" style={{ fontSize: '6px' }}>{el.params?.PT || ''}</text>
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'counterCTU':
      return (
        <g key={el.id}>
          <line x1={leftX} y1={cy} x2={el.x} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#1e1e2e" stroke={colors.counterCTU} strokeWidth="1.5" rx="2" />
          <text x={cx} y={cy - 2} textAnchor="middle" fill={colors.counterCTU} style={{ fontSize: '8px', fontWeight: 'bold' }}>CTU</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#8b949e" style={{ fontSize: '6px' }}>PV={el.params?.PV || ''}</text>
          <line x1={el.x + el.width} y1={cy} x2={rightX} y2={cy} stroke={colors.horizontalLine} strokeWidth="1" />
          <text x={cx} y={el.y + el.height + 12} textAnchor="middle" fill="#8b949e" style={{ fontSize: '7px' }}>{el.label}</text>
        </g>
      );

    case 'verticalLine':
      return (
        <line
          key={el.id}
          x1={el.x}
          y1={el.y}
          x2={el.x}
          y2={el.y + el.height}
          stroke={colors.verticalLine}
          strokeWidth="1"
        />
      );

    default:
      return null;
  }
}
