import { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { useProjectStore, useUIStore } from '@stores';
import { FileCode } from 'lucide-react';

// IEC 61131-3 ST 语法高亮定义
const iecStLanguageDef = {
  defaultToken: '',
  tokenPostfix: '.iecst',

  keywords: [
    'PROGRAM', 'END_PROGRAM', 'FUNCTION', 'END_FUNCTION',
    'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK', 'VAR', 'VAR_INPUT',
    'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_TEMP', 'END_VAR',
    'IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF',
    'CASE', 'OF', 'END_CASE',
    'FOR', 'TO', 'BY', 'DO', 'END_FOR',
    'WHILE', 'END_WHILE', 'REPEAT', 'UNTIL', 'END_REPEAT',
    'EXIT', 'RETURN', 'NOT', 'AND', 'OR', 'XOR',
    'TRUE', 'FALSE', 'MOD', 'ABS', 'SQRT', 'LN', 'LOG',
    'EXP', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN',
  ],

  typeKeywords: [
    'BOOL', 'SINT', 'INT', 'DINT', 'LINT',
    'USINT', 'UINT', 'UDINT', 'ULINT',
    'REAL', 'LREAL', 'TIME', 'DATE', 'TOD', 'DT',
    'STRING', 'BYTE', 'WORD', 'DWORD', 'LWORD',
    'ARRAY', 'STRUCT', 'OF',
  ],

  operators: [
    '=', '>', '<', '>=', '<=', '<>',
    '+', '-', '*', '/', '**',
    ':=', '=>',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      [/[a-zA-Z_][a-zA-Z0-9_]*/, {
        cases: {
          '@typeKeywords': 'type',
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],
      { include: '@whitespace' },
      [/[{}()\[\]]/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],
      [/\d*\.\d+([eE][\+\-]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],
      [/[;,.]/, 'delimiter'],
      [/'[^']*'/, 'string'],
      [/"[^"]*"/, 'string'],
      [/\(\*.*?\*\)/, 'comment'],
      [/\/\/.*$/, 'comment'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
    ],
  },
};

const editorThemeDark = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '#c678dd' },
    { token: 'type', foreground: '#e5c07b' },
    { token: 'identifier', foreground: '#61afef' },
    { token: 'comment', foreground: '#5c6370', fontStyle: 'italic' },
    { token: 'number', foreground: '#d19a66' },
    { token: 'number.float', foreground: '#d19a66' },
    { token: 'string', foreground: '#98c379' },
    { token: 'operator', foreground: '#56b6c2' },
    { token: 'delimiter', foreground: '#abb2bf' },
  ],
  colors: {
    'editor.background': '#1e1e2e',
    'editor.lineHighlightBackground': '#2a2d3e',
    'editor.selectionBackground': '#3d59a1',
    'editor.inactiveSelectionBackground': '#283457',
    'editorCursor.foreground': '#f97316',
    'editorLineNumber.foreground': '#484f58',
    'editorLineNumber.activeForeground': '#8b949e',
  },
};

const editorThemeLight = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '#a855f7' },
    { token: 'type', foreground: '#ca8a04' },
    { token: 'identifier', foreground: '#2563eb' },
    { token: 'comment', foreground: '#6b7280', fontStyle: 'italic' },
    { token: 'number', foreground: '#d97706' },
    { token: 'number.float', foreground: '#d97706' },
    { token: 'string', foreground: '#16a34a' },
    { token: 'operator', foreground: '#0891b2' },
    { token: 'delimiter', foreground: '#4b5563' },
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.lineHighlightBackground': '#f6f8fa',
    'editor.selectionBackground': '#bfdbfe',
    'editor.inactiveSelectionBackground': '#dbeafe',
    'editorCursor.foreground': '#f97316',
    'editorLineNumber.foreground': '#d0d7de',
    'editorLineNumber.activeForeground': '#656d76',
  },
};

export function STEditor() {
  const { t } = useTranslation();
  const { currentProject, selectedPouId, updatePouBody } = useProjectStore();
  const { editorJumpTarget, theme } = useUIStore();
  const selectedPou = currentProject?.poUs.find((p: import('@types').POU) => p.id === selectedPouId);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Clear decorations on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current && decorationsRef.current.length > 0) {
        try {
          editorRef.current.deltaDecorations(decorationsRef.current, []);
        } catch {
          // Editor may already be disposed
        }
        decorationsRef.current = [];
      }
    };
  }, []);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register IEC 61131-3 ST language
    monaco.languages.register({ id: 'iec-st' });
    monaco.languages.setMonarchTokensProvider('iec-st', iecStLanguageDef);
    monaco.editor.defineTheme('panicstudio-dark', editorThemeDark);
    monaco.editor.defineTheme('panicstudio-light', editorThemeLight);
    monaco.editor.setTheme(theme === 'dark' ? 'panicstudio-dark' : 'panicstudio-light');

    // Auto-indent rules
    monaco.languages.setLanguageConfiguration('iec-st', {
      brackets: [
        ['(', ')'],
        ['[', ']'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
      ],
    });
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    if (selectedPouId && value !== undefined) {
      updatePouBody(selectedPouId, value);
    }
  }, [selectedPouId, updatePouBody]);

  // Sync Monaco theme when app theme changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'panicstudio-dark' : 'panicstudio-light');
    }
  }, [theme]);

  // Jump to line when editorJumpTarget changes
  useEffect(() => {
    if (!editorJumpTarget || !editorRef.current) return;
    const editor = editorRef.current;
    const line = editorJumpTarget.line;

    // Reveal line in center
    editor.revealLineInCenter(line);

    // Set cursor
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();

    // Add highlight decoration
    const newDecorations = editor.deltaDecorations(decorationsRef.current, [
      {
        range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
        options: {
          isWholeLine: true,
          className: 'editor-highlight-line',
          overviewRuler: { color: '#f97316', position: 2 },
        },
      },
    ]);
    decorationsRef.current = newDecorations;

    // Remove highlight after 2s
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [editorJumpTarget]);

  if (!selectedPou) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor">
        <div className="text-center text-text-muted">
          <FileCode size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('editor.selectPou')}</p>
          <p className="text-xs mt-1">{t('editor.useAI')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor">
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-base-light">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{selectedPou.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sidebar-hover text-text-secondary">
            {selectedPou.language}
          </span>
        </div>
        <div className="text-[10px] text-text-muted">
          {selectedPou.varInputs.length} IN / {selectedPou.varOutputs.length} OUT / {selectedPou.varLocals.length} LOCAL
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          width="100%"
          language="iec-st"
          theme="panicstudio-dark"
          value={selectedPou.body || defaultProgramTemplate(selectedPou.name)}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            lineNumbers: 'on',
            renderWhitespace: 'boundary',
            folding: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}

function defaultProgramTemplate(name: string): string {
  return `(*
  Program: ${name}
  Generated by PLC-AIStudio
*)

PROGRAM ${name}
VAR_INPUT
  (* Define inputs here *)
END_VAR

VAR_OUTPUT
  (* Define outputs here *)
END_VAR

VAR
  (* Define local variables here *)
END_VAR

(* Write your logic here *)

END_PROGRAM`;
}
