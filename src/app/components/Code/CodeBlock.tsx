interface CodeBlockProps {
  lang?: string;
  children: string;
}

export function CodeBlock({ lang, children }: CodeBlockProps) {
  return (
    <div className="rounded-xl overflow-hidden ring-1 ring-black/5 shadow-sm">
      {lang && (
        <div className="flex items-center gap-1.5 bg-gray-800 px-4 py-2">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="size-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-gray-400">{lang}</span>
        </div>
      )}
      <pre className="fa-code bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto leading-relaxed">
        <code className="whitespace-pre">{children}</code>
      </pre>
    </div>
  );
}
