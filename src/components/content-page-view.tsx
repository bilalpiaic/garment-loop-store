export function ContentPageView({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body: string;
}) {
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 font-serif text-4xl">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
