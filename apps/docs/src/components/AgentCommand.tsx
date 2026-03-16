interface AgentCommandProps {
  command?: string;
  agent?: string;
}

export function AgentCommand({
  command = "pnpm dlx @tanstack/intent@latest install",
  agent = "Claude Code",
}: AgentCommandProps) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border bg-fd-card">
      <div className="flex items-center justify-between border-b bg-fd-muted/40 px-3 py-2 text-fd-muted-foreground text-xs">
        <span>{agent}</span>
        <span>Run inside your coding agent</span>
      </div>
      <pre className="overflow-x-auto bg-fd-secondary/30 px-3 py-3 text-sm">
        <code>{`$ ${command}`}</code>
      </pre>
    </div>
  );
}

export default AgentCommand;
