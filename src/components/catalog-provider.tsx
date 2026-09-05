"use client";

import { createContext, useContext } from "react";
import {
  categories as seedCategories,
  collections as seedCollections,
  products as seedProducts,
  type CatalogData,
} from "@/lib/catalog";

const CatalogContext = createContext<CatalogData>({
  products: seedProducts,
  categories: seedCategories,
  collections: seedCollections,
});

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: CatalogData;
  children: React.ReactNode;
}) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
