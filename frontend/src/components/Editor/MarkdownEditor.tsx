import { useCallback, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { db } from '../../db/dexie';
import type { Entry } from '../../types/journal';

interface Props {
  entry: Entry;
  onSave: (entry: Entry) => void;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '16px' },
  '.cm-scroller': { fontFamily: 'Inter, system-ui, sans-serif', overflow: 'auto' },
  '.cm-content': { padding: '2rem 2.5rem', maxWidth: '780px', margin: '0 auto', lineHeight: '1.8' },
  '.cm-line': { padding: '0' },
  '&.cm-focused': { outline: 'none' },
});

export function MarkdownEditor({ entry, onSave }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const updated: Entry = {
          ...entry,
          body: value,
          bodyPlain: value.replace(/[#*_`[\]()]/g, '').replace(/\n+/g, ' ').trim(),
          wordCount: value.trim().split(/\s+/).filter(Boolean).length,
          updatedAt: new Date().toISOString(),
        };
        await db.entries.put(updated as never);
        onSave(updated);
      }, 800);
    },
    [entry, onSave]
  );

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  return (
    <div className="flex-1 overflow-hidden">
      <CodeMirror
        value={entry.body}
        height="100%"
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          editorTheme,
          EditorView.lineWrapping,
        ]}
        onChange={handleChange}
        className="h-full"
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          searchKeymap: false,
        }}
      />
    </div>
  );
}
