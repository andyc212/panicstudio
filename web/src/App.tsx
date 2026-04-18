import { AppLayout } from '@components/Layout/AppLayout';
import { ChatPanel } from '@components/ChatPanel';
import { STEditor } from '@components/Editor';
import { LadderView } from '@components/LadderView';
import { ProjectTree } from '@components/ProjectTree';
import { VarTable } from '@components/VarTable';
import { useUIStore } from '@stores';

function App() {
  const { editorSplitRatio } = useUIStore();

  return (
    <AppLayout
      leftPanel={<ChatPanel />}
      centerPanel={
        <div className="flex flex-col h-full">
          <div style={{ height: `${editorSplitRatio * 100}%`, minHeight: '200px' }}>
            <STEditor />
          </div>
          <LadderView />
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
