"use client";
import { signOut } from "next-auth/react";

function LogoutButton() {
  return (
    <button
      onClick={() =>
        signOut({
          callbackUrl: "/", // or your desired post-logout route
        })
      }
    >
      Logout
    </button>
  );
}

export default LogoutButton;
