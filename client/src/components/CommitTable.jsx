export default function CommitTable({ commits, columns }) {
  if (!commits?.length) {
    return <p className="text-gray-600 text-sm text-center py-6">No commits to display</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {commits.map((commit, i) => (
            <tr key={commit.hash || i} className="hover:bg-gray-800/40 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="py-3 pr-4 text-gray-300 align-top">
                  {col.render ? col.render(commit) : commit[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
