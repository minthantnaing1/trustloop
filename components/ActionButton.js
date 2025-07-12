export default function ActionButton({
  text = "Button",
  icon = null,
  variant = "primary", // "primaryHover", "outlineHover", "dangerHover", etc.
  onClick,
  className = "",
  type = "button",
}) {
  const baseStyle =
    "h-[42px] w-30 px-[4px] text-sm rounded-[8px] border shadow-md hover:scale-[1.1] active:scale-[0.95] transition duration-400 flex items-center justify-center gap-2";

  const variants = {
    primaryHover:
      "border-[2px] border-transparent text-white bg-[#325082] hover:bg-white hover:border-[#325082] hover:text-[#325082]",
    outlineHover:
      "border-[2px] border-[#325082] text-[#325082] bg-white hover:bg-[#325082] hover:border-transparent hover:text-white",
    dangerHover:
      "border-[2px] border-red-600 text-red-600 bg-white hover:bg-red-600 hover:border-transparent hover:text-white",
    primaryClick: "border-[2px] border-transparent text-white bg-[#325082]",
    outlineClick: "border-[2px] border-[#325082] text-[#325082] bg-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      <span>{text}</span>
    </button>
  );
}
