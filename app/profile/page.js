import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";
import UserSync from "@/components/UserSync";

async function Profile() {
  const session = await auth();

  return (
    <div>
      <UserSync session={session} />
      <div>
        <p>{session?.user?.name}</p>
        <p>{session?.user?.email}</p>
      </div>
      <LogoutButton />
    </div>
  );
}

export default Profile;
