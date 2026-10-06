export type WhenReadyInput = { engine: Record<string, unknown> | null; callback: () => void };

export type InvokeInput = {
  target: Record<string, unknown> | null;
  method: string;
  args: unknown[];
};

export type ReadGlobalInput = { scope: object; name: string };
