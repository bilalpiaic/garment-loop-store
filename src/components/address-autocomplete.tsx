"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AddressSuggestion } from "@/lib/address-suggest";

type AddressAutocompleteProps = {
  country: string;
  defaultStreet?: string;
  defaultCity?: string;
  defaultArea?: string;
  defaultPostalCode?: string;
  errors?: Partial<Record<"address" | "city" | "area" | "postalCode", string>>;
  cityListId?: string;
};

export function AddressAutocomplete({
  country,
  defaultStreet,
  defaultCity,
  defaultArea,
  defaultPostalCode,
  errors,
  cityListId,
}: AddressAutocompleteProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [street, setStreet] = useState(defaultStreet ?? "");
  const [city, setCity] = useState(defaultCity ?? "");
  const [area, setArea] = useState(defaultArea ?? "");
  const [postalCode, setPostalCode] = useState(defaultPostalCode ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        try {
          const params = new URLSearchParams({ q, country });
          const response = await fetch(`/api/address/suggest?${params.toString()}`);
          const data = (await response.json()) as { suggestions?: AddressSuggestion[] };
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
        } catch {
          setSuggestions([]);
        }
      });
    }, 280);
    return () => clearTimeout(handle);
  }, [query, country]);

  function applySuggestion(item: AddressSuggestion) {
    setStreet(item.street || item.label);
    setCity(item.city);
    setArea(item.area);
    setPostalCode(item.postalCode);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${listId}-lookup`}>Address lookup</Label>
        <div className="relative">
          <Input
            id={`${listId}-lookup`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            placeholder="Start typing a street or area…"
            className="h-10"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${listId}-suggestions`}
          />
          {pending ? (
            <p className="mt-1 text-xs text-muted-foreground">Searching places…</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Suggestions from OpenStreetMap (optional). You can still type the fields below.
            </p>
          )}
          {open && suggestions.length > 0 ? (
            <ul
              id={`${listId}-suggestions`}
              role="listbox"
              className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-background py-1 shadow-md"
            >
              {suggestions.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            list={cityListId}
            className="h-10"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            aria-invalid={Boolean(errors?.city)}
          />
          {errors?.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">{country === "PK" ? "Area / locality" : "State / area"}</Label>
          <Input
            id="area"
            name="area"
            className="h-10"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            aria-invalid={Boolean(errors?.area)}
          />
          {errors?.area ? <p className="text-xs text-destructive">{errors.area}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street address</Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          value={street}
          onChange={(event) => setStreet(event.target.value)}
          aria-invalid={Boolean(errors?.address)}
          className={cn(errors?.address && "border-destructive")}
        />
        {errors?.address ? <p className="text-xs text-destructive">{errors.address}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="postalCode">Postal / ZIP (for live rates, wallets & BNPL)</Label>
        <Input
          id="postalCode"
          name="postalCode"
          autoComplete="postal-code"
          className="h-10"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          aria-invalid={Boolean(errors?.postalCode)}
        />
        {errors?.postalCode ? <p className="text-xs text-destructive">{errors.postalCode}</p> : null}
      </div>
    </div>
  );
}
