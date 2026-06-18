export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-xl" />
      ))}
    </div>
  )
}