// components/MaskedUserId.js
export default function MaskedUserId({
  email = "",
  reveal = false, // show full username if true (e.g., owner viewing own item)
  visible = 4, // how many characters to show before masking
  mask = "xxxx", // mask string
  className = "",
}) {
  const user = String(email).split("@")[0] || "";
  if (!user) return <span className={className}>-</span>;
  if (reveal) return <span className={className}>{user}</span>;

  const shown = user.slice(0, Math.min(visible, user.length));
  return (
    <span className={className}>
      {shown}
      {mask}
    </span>
  );
}
