import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

async function Profile() {
  const session = await auth();
  return (
    <div>
      <div>
        <p>{session?.user?.name}</p>
        <p>{session?.user?.email}</p>
      </div>
      <LogoutButton />
    </div>
  );
}

export default Profile;
