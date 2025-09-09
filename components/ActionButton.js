export default function ActionButton({
  text = "Button",
  icon = null,
  variant = "primaryHover", // default fixed
  onClick,
  className = "",
  type = "button",
  disabled = false,
}) {
  const baseStyle =
    "flex items-center justify-center gap-2 rounded-[8px] shadow-md active:scale-[0.95] transition duration-500";

  const variants = {
    primaryHover:
      "h-[42px] px-5 border-transparent text-white text-sm bg-[#325082] hover:bg-white hover:border-[#325082] hover:text-[#325082] hover:scale-[1.06] border-[2px]",
    outlineHover:
      "h-[42px] px-5 border-[#325082] text-[#325082] text-sm bg-white hover:bg-[#325082] hover:border-transparent hover:text-white hover:scale-[1.06] border-[2px]",
    dangerOutlineHover:
      "h-[42px] px-5 border-red-600 text-red-600 text-sm bg-white hover:bg-red-600 hover:border-transparent hover:text-white hover:scale-[1.06] border-[2px]",
    dangerPrimaryClick:
      "h-[42px] px-5 border-transparent text-white bg-red-600 text-sm hover:scale-[1.06] border-[2px]",
    primaryClick:
      "h-[42px] px-5 border-transparent text-white bg-[#325082] text-sm hover:scale-[1.06] border-[2px]",
    outlineClick:
      "h-[42px] px-5 border-[#325082] text-[#325082] bg-white text-sm hover:scale-[1.06] border-[2px]",

    cartPrimaryClick:
      "px-5 py-2.5 border-transparent text-white bg-[#325082] rounded-md hover:scale-[1.03] border-[2px]",
    buyOutlineClick:
      "px-5 py-2.5 border-[#325082] text-[#325082] bg-white rounded-md hover:scale-[1.03] border-[2px]",
    iconOutlineHover:
      "px-4 border-[#325082] text-[#325082] bg-white hover:bg-[#325082] hover:border-transparent hover:text-white hover:scale-[1.1] text-[25px] rounded-md border-[1.5px]",

    confirmPrimaryHover:
      "w-full h-[46px] border-transparent text-white bg-[#325082] hover:bg-white hover:border-[#325082] hover:text-[#325082] hover:scale-[1.02] border-[2px]",
    submitPrimaryClick:
      "w-full h-[46px] border-transparent text-white bg-[#325082] hover:scale-[1.02] border-[2px]",
    cancelOrderOutlineClick:
      "w-full h-[46px] border-[#325082] text-[#325082] bg-white hover:scale-[1.02] border-[2px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      <span>{text}</span>
    </button>
  );
}
