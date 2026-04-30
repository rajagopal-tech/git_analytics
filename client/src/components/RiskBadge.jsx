export default function RiskBadge({ risk }) {
  const styles = {
    Low:    'bg-green-500/15 text-green-400 ring-1 ring-green-500/30',
    Medium: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30',
    High:   'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
  };

  return (
    <span className={`badge ${styles[risk] || styles.Low}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        risk === 'High' ? 'bg-red-400' : risk === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'
      }`} />
      {risk}
    </span>
  );
}
