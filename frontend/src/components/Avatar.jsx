import { gradientFor, initials } from "../utils/avatar";

// One component used everywhere a person's avatar shows up (Dashboard navbar,
// Profile hero, Messages, Leaderboard, review author). Falls back to the
// gradient-initials circle when no photo has been uploaded yet.
const Avatar = ({ userId, name, avatar, size = "w-11 h-11", textSize = "text-base", className = "", onClick }) => {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || "User"}
        onClick={onClick}
        className={`${size} shrink-0 rounded-full object-cover border-2 border-white shadow-sm ${onClick ? "cursor-pointer hover:scale-105 transition" : ""} ${className}`}
      />
    );
  }
  return (
    <div
      onClick={onClick}
      className={`${size} shrink-0 rounded-full bg-gradient-to-br ${gradientFor(userId)} flex items-center justify-center ${textSize} font-bold text-white shadow-sm ${onClick ? "cursor-pointer hover:scale-105 transition" : ""} ${className}`}
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
