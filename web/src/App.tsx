import { AppLayout } from '@components/Layout/AppLayout';
import { ChatPanel } from '@components/ChatPanel';
import { STEditor } from '@components/Editor';
import { LadderView } from '@components/LadderView';
import { ProjectTree } from '@components/ProjectTree';
import { VarTable } from '@components/VarTable';
import { useUIStore } from '@stores';

function App() {
  const { editorSplitRatio, setEditorSplitRatio } = useUIStore();

  return (
    <AppLayout
      leftPanel={<ChatPanel />}
      centerPanel={
        <div className="flex flex-col h-full">
          <div style={{ height: `${editorSplitRatio * 100}%`, minHeight: '160px' }} className="min-h-[160px]">
            <STEditor />
          </div>
          {/* Resizer */}
          <div
            className="h-1 bg-border hover:bg-accent cursor-row-resize transition-colors shrink-0"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startRatio = editorSplitRatio;
              const containerHeight = (e.target as HTMLElement).parentElement!.getBoundingClientRect().height;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = moveEvent.clientY - startY;
                const newRatio = Math.max(0.2, Math.min(0.85, startRatio + deltaY / containerHeight));
                setEditorSplitRatio(newRatio);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <div className="flex-1 min-h-[160px]">
            <LadderView />
          </div>
        </div>
      }
      rightPanel={
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0">
            <ProjectTree />
          </div>
          <div className="h-1/3 min-h-[120px] border-t border-border">
            <VarTable />
          </div>
        </div>
      }
    />
  );
}

export default App;
