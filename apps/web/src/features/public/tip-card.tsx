import './tip-card.css';

export function TipCard({ title, body }: { readonly title: string; readonly body: string }) {
  return <article className="public-tip-card"><h3>{title}</h3><p>{body}</p></article>;
}
