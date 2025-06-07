"use client";
import { signOut } from "next-auth/react";

function LogoutButton() {
  return <button onClick={() => signOut()}>Logout</button>;
}

export default LogoutButton;
