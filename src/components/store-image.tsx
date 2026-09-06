import Image, { type ImageProps } from "next/image";
import { isLocalUploadSrc } from "@/lib/product-images";

export function StoreImage({ src, unoptimized, alt = "", ...props }: ImageProps) {
  const value = typeof src === "string" ? src : "";
  return <Image {...props} src={src} alt={alt} unoptimized={unoptimized || isLocalUploadSrc(value)} />;
}
