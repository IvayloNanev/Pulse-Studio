import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Item = { href: string; title: string; description: string; label: string };

export function FoundationGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link href={item.href} key={item.title} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
          <Card className="glass-panel h-full rounded-2xl bg-white/25 py-5 transition duration-500 group-hover:-translate-y-2 group-hover:scale-[1.015] group-hover:bg-white/45 group-hover:ring-black/20">
            <CardHeader>
              <div className="mb-7 flex items-start justify-between">
                <Badge variant="outline" className="rounded-none font-mono text-[0.62rem] uppercase tracking-[0.14em]">{item.label}</Badge>
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
