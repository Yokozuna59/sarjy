import type { Memories } from "~/lib/turn";
import { Button } from "~/components/Button";
import { cn } from "~/lib/cn";

const EXAMPLES = [
  "Book padel in London tomorrow at 4 PM",
  "What's the weather in Riyadh tomorrow?",
];

interface EmptyStateProps {
  memories: Memories;
  onExample: (text: string) => void;
}

export function EmptyState({ memories, onExample }: EmptyStateProps) {
  // Once Sarjy knows a favorite color, the example asks for it back.
  const colorExample = memories.favorite_color
    ? "What's my favorite color?"
    : "My favorite color is green";
  const facts = Object.entries(memories);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 py-8",
        "text-center text-balance",
      )}
    >
      {memories.name && (
        <p className="text-lg font-semibold">Welcome back, {memories.name}.</p>
      )}
      <p>
        Book a padel court, a football pitch or a coffee shop table in any city.
        Sarjy checks the weather first.
      </p>
      <ul aria-label="Examples" className="flex flex-wrap justify-center gap-2">
        {[colorExample, ...EXAMPLES].map((example) => (
          <li key={example}>
            <Button
              variant="outline"
              shape="pill"
              onClick={() => onExample(example)}
            >
              {example}
            </Button>
          </li>
        ))}
      </ul>
      {facts.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sarjy remembers, in this browser:
          </p>
          <ul
            aria-label="What Sarjy remembers"
            className="flex flex-wrap justify-center gap-1.5"
          >
            {facts.map(([key, value]) => (
              <li
                key={key}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs",
                  "bg-zinc-100 text-zinc-700",
                  "dark:bg-zinc-800 dark:text-zinc-300",
                )}
              >
                {key.replaceAll("_", " ")}: {value}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tell Sarjy about yourself, and it remembers you in this browser.
        </p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Tap the mic to talk hands-free, or type. Your browser will ask to use
        the microphone. Headphones help, so Sarjy doesn't hear itself.
      </p>
    </div>
  );
}
