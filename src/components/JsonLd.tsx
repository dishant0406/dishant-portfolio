/**
 * Renders a JSON-LD block.
 *
 * `JSON.stringify` alone is not safe inside `<script>`: a title containing
 * `</script>` would close the tag early, and `<`, `>` and `&` are all legal in
 * JSON strings. Escaping them to unicode sequences keeps the JSON byte-identical
 * to a parser while making tag injection impossible.
 */
export function JsonLd({ data }: { data: object }): React.JSX.Element {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
