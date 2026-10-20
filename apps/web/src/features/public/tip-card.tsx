import './tip-card.css';

export function TipCard({ title, body, imageUrl }: { readonly title: string; readonly body: string; readonly imageUrl?: string | undefined }) {
  return <article className="public-tip-card">{imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : null}<h3>{title}</h3><p>{body}</p></article>;
}
