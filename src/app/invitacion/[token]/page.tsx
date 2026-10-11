import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/AuthForms";
import { JoinForm } from "@/components/auth/JoinForm";
import { readInvitation } from "@/lib/invitations";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Invitación" };

export default function Page({ params }: PageProps<"/invitacion/[token]">) {
  return (
    <Suspense fallback={<AuthScreen title="Abriendo la invitación…"><span className="spinner" aria-busy="true" /></AuthScreen>}>
      <Invitation params={params} />
    </Suspense>
  );
}

// params, la invitación y la sesión se leen en el pedido (Cache Components: dentro de Suspense)
async function Invitation({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;
  const invitation = await readInvitation(token);
  if (!invitation) {
    return (
      <AuthScreen title="Esta invitación ya no sirve" sub="Pídele otra a quien te invitó.">
        <Link className="btn btn--bordered btn--block" href="/entrar">Entrar</Link>
      </AuthScreen>
    );
  }
  const {
    data: { user },
  } = await (await supabaseServer()).auth.getUser();
  const household = `${invitation.household.emoji} ${invitation.household.name}`;
  return (
    <AuthScreen
      title={`Te invitaron a ${household}`}
      sub={
        <>
          <b>{invitation.invitedBy}</b> quiere que lleven las tareas de la casa juntos en Lukas.
        </>
      }
    >
      <JoinForm token={token} household={household} signedIn={!!user} />
    </AuthScreen>
  );
}
