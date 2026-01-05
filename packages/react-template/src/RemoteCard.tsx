export type RemoteCardProps = {
  title: string
}

export default function RemoteCard(props: RemoteCardProps) {
  return (
    <section className="card">
      <h2>{props.title}</h2>
      <p>This component is meant to be loaded remotely by @dev-to/react-loader.</p>
    </section>
  )
}
