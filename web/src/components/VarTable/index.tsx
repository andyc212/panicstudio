import { useProjectStore } from '@stores';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function VarTable() {
  const { t } = useTranslation();
  const { currentProject, selectedPouId } = useProjectStore();
  const selectedPou = currentProject?.poUs.find((p: import('@types').POU) => p.id === selectedPouId);

  const allVars = [
    ...(selectedPou?.varInputs.map((v: import('@types').IOEntry) => ({ ...v, section: 'INPUT' as const })) ?? []),
    ...(selectedPou?.varOutputs.map((v: import('@types').IOEntry) => ({ ...v, section: 'OUTPUT' as const })) ?? []),
    ...(selectedPou?.varLocals.map((v: import('@types').IOEntry) => ({ ...v, section: 'LOCAL' as const })) ?? []),
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-base-light">
        <Database size={12} className="text-text-muted" />
        <span className="text-[11px] font-medium text-text-secondary">{t('varTable.title')}</span>
        <span className="text-[10px] text-text-muted ml-auto">{t('varTable.count', { count: allVars.length })}</span>
      </div>

      <div className="flex-1 overflow-auto">
        {allVars.length > 0 ? (
          <table className="w-full text-[11px]">
            <thead className="bg-sidebar text-text-muted sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left font-normal">{t('varTable.address')}</th>
                <th className="px-2 py-1 text-left font-normal">{t('varTable.name')}</th>
                <th className="px-2 py-1 text-left font-normal">{t('varTable.dataType')}</th>
              </tr>
            </thead>
            <tbody>
              {allVars.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-sidebar-hover">
                  <td className="px-2 py-1 text-text-secondary font-mono">{v.address}</td>
                  <td className="px-2 py-1 text-text-primary">{v.name}</td>
                  <td className="px-2 py-1">
                    <span className={`text-[10px] px-1 rounded ${
                      v.section === 'INPUT' ? 'bg-info/10 text-info' :
                      v.section === 'OUTPUT' ? 'bg-success/10 text-success' :
                      'bg-text-muted/10 text-text-secondary'
                    }`}>
                      {v.dataType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            <span>{t('varTable.emptyHint')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
