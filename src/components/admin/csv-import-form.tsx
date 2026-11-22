"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PreviewResponse = {
  rows?: { line: number; sku: string; title: string; slug: string }[];
  errors?: { line: number; field?: string; message: string }[];
  preview?: {
    action: "create" | "update";
    productId: string;
    slug: string;
    title: string;
    variantCount: number;
    skus: string[];
  }[];
  error?: string;
};

const SAMPLE = `sku,title,slug,subtitle,description,category,collections,status,color,color_hex,size,price_pkr,sale_price_pkr,stock,image_src,image_alt,featured,is_new,features
GL-CSV-001,Loop Merino Crew,loop-merino-crew,Soft winter layer,Merino crew for daily rotation,knitwear,essentials|new-arrivals,draft,Charcoal,#333333,M,6900,,12,https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=80,Merino crew,false,true,Breathable|Machine wash cold
GL-CSV-002,Loop Merino Crew,loop-merino-crew,Soft winter layer,Merino crew for daily rotation,knitwear,essentials|new-arrivals,draft,Charcoal,#333333,L,6900,,8,https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=80,Merino crew,false,true,Breathable|Machine wash cold`;

export function CsvImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  async function readFile(file: File) {
    const text = await file.text();
    setCsv(text);
    setPreview(null);
  }

  async function runPreview() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, commit: false }),
      });
      const data = (await response.json()) as PreviewResponse;
      if (!response.ok) {
        toast.error(data.error ?? "Could not validate CSV.");
        return;
      }
      setPreview(data);
      if (data.errors?.length) {
        toast.error(`${data.errors.length} validation error(s).`);
      } else {
        toast.success(`Ready to import ${data.preview?.length ?? 0} product(s).`);
      }
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!preview?.preview?.length || preview.errors?.length) {
      toast.error("Fix validation errors before importing.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, commit: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        created?: number;
        updated?: number;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Import failed.");
        return;
      }
      toast.success(`Imported — ${data.created ?? 0} created, ${data.updated ?? 0} updated.`);
      router.push("/admin/products");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setCsv(SAMPLE)} disabled={pending}>
          Load sample
        </Button>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={<a href="/api/admin/products/export" />}
        >
          Export current CSV
        </Button>
        <Button type="button" variant="outline" nativeButton={false} render={<Link href="/admin/products" />}>
          Back to products
        </Button>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Upload CSV</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium">Or paste CSV</p>
        <Textarea
          value={csv}
          onChange={(event) => {
            setCsv(event.target.value);
            setPreview(null);
          }}
          className="min-h-56 font-mono text-xs"
          placeholder="sku,title,category,color,size,price_pkr,stock,..."
        />
        <p className="text-xs text-muted-foreground">
          One row per variant. Required: sku, title, category, color, size, price_pkr, stock.
          Collections/features use <code>|</code> separators. Match existing products by slug or SKU.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={runPreview} disabled={pending || !csv.trim()}>
          {pending ? "Working…" : "Validate & preview"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={commit}
          disabled={pending || !preview?.preview?.length || Boolean(preview.errors?.length)}
        >
          Commit import
        </Button>
      </div>

      {preview?.errors && preview.errors.length > 0 ? (
        <div className="rounded-xl border border-rust/30 bg-card p-4">
          <h2 className="font-serif text-xl">Validation errors</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {preview.errors.slice(0, 40).map((error, index) => (
              <li key={`${error.line}-${index}`}>
                Line {error.line}
                {error.field ? ` · ${error.field}` : ""}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview?.preview && preview.preview.length > 0 && !preview.errors?.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Action</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Variants</th>
                <th className="px-4 py-3">SKUs</th>
              </tr>
            </thead>
            <tbody>
              {preview.preview.map((row) => (
                <tr key={row.slug} className="border-t">
                  <td className="px-4 py-3 capitalize">{row.action}</td>
                  <td>{row.title}</td>
                  <td className="font-mono text-xs">{row.slug}</td>
                  <td>{row.variantCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.skus.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
