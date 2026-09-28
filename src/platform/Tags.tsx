export function Tags({ tags, className = '' }: { tags?: string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <span className={`tags ${className}`}>
      {tags.map((t) => (
        <span key={t} className="tag">
          {t}
        </span>
      ))}
    </span>
  );
}
