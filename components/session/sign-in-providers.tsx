import { siGithub, siGoogle } from "simple-icons"
import {
  type AccountProvider,
  ProviderGlyph,
} from "@/components/ui/account-menu"
import type { HandoffProvider } from "@/lib/handoff"

/** The ways in, every one lib/handoff knows, as @ag/account-menu offers them: the
 *  bar's account and anything that asks for a session where the person is (the
 *  home's card, claiming its address). */
export const SIGN_IN_PROVIDERS: readonly AccountProvider<HandoffProvider>[] = [
  { id: "github", label: "github", icon: <ProviderGlyph icon={siGithub} /> },
  { id: "google", label: "google", icon: <ProviderGlyph icon={siGoogle} /> },
]
