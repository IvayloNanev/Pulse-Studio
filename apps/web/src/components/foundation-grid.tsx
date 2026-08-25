import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Item = { href: string; title: string; description: string; label: string };

export function FoundationGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link href={item.href} key={item.title} className="group rounded-3xl focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
          <Card className="glass-panel h-full rounded-3xl bg-white/35 py-5 transition duration-500 group-hover:-translate-y-1 group-hover:bg-white/55 group-hover:ring-black/20 motion-reduce:transform-none">
            <CardHeader>
              <div className="mb-7 flex items-start justify-between">
                <Badge variant="outline" className="rounded-full bg-white/55 px-3 font-mono text-xs uppercase tracking-[0.12em]">{item.label}</Badge>
                <ArrowUpRight className="size-4 text-black/35 transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#c72c25]" />
              </div>
              <CardTitle className="text-xl tracking-[-0.03em]">{item.title}</CardTitle>
              <CardDescription className="leading-6">{item.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>
      ))}
    </div>
  );
}
