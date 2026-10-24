import { Button } from "~/components/Button";
import { cn } from "~/lib/cn";

const EXAMPLES = [
  "My favorite color is green",
  "Book padel in London tomorrow at 4 PM",
  "What's the weather in Riyadh tomorrow?",
];

interface EmptyStateProps {
  onExample: (text: string) => void;
}

export function EmptyState({ onExample }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 py-8",
        "text-center text-balance",
      )}
    >
      <p>
        Book a padel court, a football pitch or a coffee shop table in any city.
        Sarjy checks the weather first.
      </p>
      <ul aria-label="Examples" className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
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
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Tap the mic to talk hands-free, or type. Your browser will ask to use
        the microphone. Headphones help, so Sarjy doesn't hear itself.
      </p>
    </div>
  );
}
