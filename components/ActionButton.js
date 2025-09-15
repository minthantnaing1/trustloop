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
    "flex items-center justify-center gap-2 rounded-[4px] shadow-md cursor-pointer active:scale-[0.95] transition duration-500 ";

  const variants = {
    primaryHover:
      "h-[42px] w-[110px] border-[#325082] text-white bg-[#325082] text-sm hover:bg-transparent hover:text-[#325082] hover:scale-[1.06] border-[2px]",
    outlineHover:
      "h-[42px] w-[110px] border-[#325082] text-[#325082] bg-transparent text-sm hover:bg-[#325082] hover:text-white hover:scale-[1.06] border-[2px]",
    dangerOutlineHover:
      "h-[42px] w-[110px] border-red-600 text-red-600 bg-transparent text-sm hover:bg-red-600 hover:text-white hover:scale-[1.06] border-[2px]",
    dangerPrimaryClick:
      "h-[42px] w-[110px] border-red-600 text-white bg-red-600 text-sm hover:scale-[1.06] border-[2px]",
    primaryClick:
      "h-[42px] w-[110px] border-[#325082] text-white bg-[#325082] text-sm hover:scale-[1.06] border-[2px]",
    outlineClick:
      "h-[42px] w-[110px] border-[#325082] text-[#325082] bg-transparent text-sm hover:scale-[1.06] border-[2px]",

    cartPrimaryClick:
      "border-[#325082] text-white bg-[#325082] py-2.5 rounded-md hover:scale-[1.02] border-[2px]",
    buyPrimaryClick:
      "border-[#325082] text-white bg-[#325082] py-2.5 rounded-md hover:scale-[1.02] border-[2px]",
    buyOutlineClick:
      "border-[#325082] text-[#325082] bg-transparent py-2.5 rounded-md hover:scale-[1.02] border-[2px]",
    favOutlineClick:
      "border-rose-600 text-rose-600 bg-transparent py-2.5 rounded-md hover:scale-[1.05] border-[2px]",
    favPrimaryClick:
      "border-rose-600 text-white bg-rose-600 py-2.5 rounded-md hover:scale-[1.05] border-[2px]",
    iconOutlineHover:
      "border-[#325082] text-[#325082] bg-transparent hover:bg-[#325082] hover:text-white hover:scale-[1.1] text-[25px] px-4 rounded-md border-[1.5px]",

    confirmPrimaryHover:
      "w-full h-[46px] border-[#325082] text-white bg-[#325082] hover:bg-transparent hover:text-[#325082] hover:scale-[1.02] border-[2px]",
    submitPrimaryClick:
      "w-full h-[46px] border-[#325082] text-white bg-[#325082] hover:scale-[1.02] border-[2px]",
    cancelOrderOutlineClick:
      "w-full h-[46px] border-[#325082] text-[#325082] bg-transparent hover:scale-[1.02] border-[2px]",

    glassClick:
      "backdrop-blur-xs bg-white/20 text-white font-semibold rounded-full px-3 py-2 text-sm sm:px-5 sm:py-3 sm:text-base shadow-lg hover:bg-white/30 transition",
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
