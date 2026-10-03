import { guard } from "@/lib/access";
import { updateStore } from "@/lib/updateStore";

// Removes every published update: the current state goes back to the Sept 30 baseline. The baseline is untouched.
export async function POST(req: Request) {
  const denied = guard(req, "write");
  if (denied) return denied;
  const removed = await updateStore().reset();
  return Response.json({ ok: true, removed });
}
