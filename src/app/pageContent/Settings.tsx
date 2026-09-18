"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { HelpCircle } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { useLanguage } from "@/contexts/LanguageContext"
import { PaletteSettings } from "@/components/PaletteSettings"

function Avatar({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.map((s) => s[0])
		.slice(0, 2)
		.join("")

	return (
		<div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-sm">
			{initials}
		</div>
	)
}

/**
 * Deliberately minimal: only settings that are actually wired to something
 * real. No notifications toggles that don't persist anywhere. Light/dark
 * mode and language stay in the Navbar (ThemeToggle.tsx / the language
 * dropdown) -- duplicating those here would just be dead UI. The color
 * palette (PaletteSettings.tsx) is the one appearance control that lives
 * here instead of the Navbar: it needs room for swatches + a custom-color
 * editor that a Navbar dropdown doesn't have.
 */
export default function SettingsPageContent() {
	const router = useRouter()
	const { t } = useLanguage()
	const { data: session, refetch: refetchSession } = authClient.useSession()

	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [saved, setSaved] = useState<null | string>(null)

	useEffect(() => {
		// Seeds the editable form fields once the session finishes loading
		// (async, arrives after mount) -- not a render-time derivation, so this
		// is a legitimate sync-from-external-source effect.
		if (session?.user) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setName(session.user.name ?? "")
			setEmail(session.user.email ?? "")
		}
		// Deliberately scoped to the user id, not the whole `session.user`
		// object -- a session refetch with an unchanged id (e.g. periodic
		// revalidation) must not clobber an in-progress, unsaved edit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session?.user.id])

	useEffect(() => {
		if (saved) {
			const t = setTimeout(() => setSaved(null), 3000)
			return () => clearTimeout(t)
		}
	}, [saved])

	// --- Profile: wired to Better Auth's real /update-user endpoint ---
	const [profileSubmitting, setProfileSubmitting] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)

	async function handleSaveProfile(e: FormEvent) {
		e.preventDefault()
		setProfileError(null)
		setProfileSubmitting(true)

		const { error } = await authClient.updateUser({ name })

		setProfileSubmitting(false)

		if (error) {
			setProfileError(error.message ?? "Unable to update profile.")
			return
		}

		await refetchSession()
		setSaved("Profile updated")
	}

	// --- Change password: wired to Better Auth's real /change-password endpoint ---
	const [showPasswordForm, setShowPasswordForm] = useState(false)
	const [currentPassword, setCurrentPassword] = useState("")
	const [newPassword, setNewPassword] = useState("")
	const [passwordError, setPasswordError] = useState<string | null>(null)
	const [passwordSubmitting, setPasswordSubmitting] = useState(false)

	async function handleChangePassword(e: FormEvent) {
		e.preventDefault()
		setPasswordError(null)
		setPasswordSubmitting(true)

		const { error } = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true,
		})

		setPasswordSubmitting(false)

		if (error) {
			setPasswordError(error.message ?? "Unable to change password.")
			return
		}

		setCurrentPassword("")
		setNewPassword("")
		setShowPasswordForm(false)
		setSaved("Password changed")
	}

	// --- Two-factor: wired to Better Auth's twoFactor plugin (enable requires
	// a password confirmation + a TOTP verification step before it actually
	// turns on -- see auth-backend-template's twoFactor() plugin config). ---
	const twoFactorEnabled = session?.user.twoFactorEnabled ?? false
	const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "enable" | "verify" | "disable">("idle")
	const [twoFactorPassword, setTwoFactorPassword] = useState("")
	const [totpUri, setTotpUri] = useState<string | null>(null)
	const [totpCode, setTotpCode] = useState("")
	const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
	const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false)

	function resetTwoFactorFlow() {
		setTwoFactorStep("idle")
		setTwoFactorPassword("")
		setTotpUri(null)
		setTotpCode("")
		setTwoFactorError(null)
	}

	async function startTwoFactorEnable(e: FormEvent) {
		e.preventDefault()
		setTwoFactorError(null)
		setTwoFactorSubmitting(true)

		const { data, error } = await authClient.twoFactor.enable({ password: twoFactorPassword })

		setTwoFactorSubmitting(false)

		if (error) {
			setTwoFactorError(error.message ?? "Unable to enable two-factor authentication.")
			return
		}

		setTotpUri(data?.totpURI ?? null)
		setTwoFactorPassword("")
		setTwoFactorStep("verify")
	}

	async function verifyTwoFactor(e: FormEvent) {
		e.preventDefault()
		setTwoFactorError(null)
		setTwoFactorSubmitting(true)

		const { error } = await authClient.twoFactor.verifyTotp({ code: totpCode })

		setTwoFactorSubmitting(false)

		if (error) {
			setTwoFactorError(error.message ?? "Invalid code. Please try again.")
			return
		}

		resetTwoFactorFlow()
		await refetchSession()
		setSaved("Two-factor authentication enabled")
	}

	async function disableTwoFactor(e: FormEvent) {
		e.preventDefault()
		setTwoFactorError(null)
		setTwoFactorSubmitting(true)

		const { error } = await authClient.twoFactor.disable({ password: twoFactorPassword })

		setTwoFactorSubmitting(false)

		if (error) {
			setTwoFactorError(error.message ?? "Unable to disable two-factor authentication.")
			return
		}

		resetTwoFactorFlow()
		await refetchSession()
		setSaved("Two-factor authentication disabled")
	}

	// --- Delete account: wired to Better Auth's real /delete-user endpoint ---
	const [showDeleteForm, setShowDeleteForm] = useState(false)
	const [deletePassword, setDeletePassword] = useState("")
	const [deleteError, setDeleteError] = useState<string | null>(null)
	const [deleteSubmitting, setDeleteSubmitting] = useState(false)

	async function handleDeleteAccount(e: FormEvent) {
		e.preventDefault()
		setDeleteError(null)
		setDeleteSubmitting(true)

		const { error } = await authClient.deleteUser({ password: deletePassword })

		setDeleteSubmitting(false)

		if (error) {
			setDeleteError(error.message ?? "Unable to delete account.")
			return
		}

		router.push("/login-signup")
	}

	return (
		<div className="p-6 max-w-2xl mx-auto">
			<header className="flex items-center gap-4 mb-8">
				<Avatar name={name || email} />
				<div>
					<h1 className="text-3xl font-bold">Settings</h1>
					<p className="text-sm text-muted-foreground">{email}</p>
				</div>
			</header>

			<div className="space-y-6">
				<PaletteSettings />

				<form onSubmit={handleSaveProfile} className="bg-card border border-border rounded-lg p-6 shadow-sm">
					<h2 className="text-lg font-semibold">Profile</h2>

					<div className="mt-4 space-y-4">
						<div>
							<label className="block text-sm font-medium text-foreground">Full name</label>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-foreground">Email</label>
							<input
								value={email}
								disabled
								type="email"
								className="mt-1 block w-full rounded-md border border-border bg-muted px-3 py-2 shadow-sm text-muted-foreground"
							/>
						</div>
					</div>

					{profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}

					<button
						type="submit"
						disabled={profileSubmitting}
						className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded shadow hover:brightness-110 transition disabled:opacity-60"
					>
						{profileSubmitting ? "Saving..." : "Save"}
					</button>
				</form>

				<div className="bg-card border border-border rounded-lg p-6 shadow-sm">
					<h2 className="text-lg font-semibold">Security</h2>
					<p className="text-sm text-muted-foreground">Manage password and two-factor authentication</p>

					<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Change password */}
						<div className="rounded p-4 border border-dashed border-border">
							<div className="font-medium">Change password</div>
							<div className="text-sm text-muted-foreground">Update your password regularly to keep your account safe</div>

							{!showPasswordForm ? (
								<button
									onClick={() => setShowPasswordForm(true)}
									className="mt-3 px-3 py-2 rounded bg-muted hover:bg-border transition"
								>
									Change
								</button>
							) : (
								<form onSubmit={handleChangePassword} className="mt-3 space-y-2">
									<input
										type="password"
										placeholder="Current password"
										required
										autoComplete="current-password"
										value={currentPassword}
										onChange={(e) => setCurrentPassword(e.target.value)}
										className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									<input
										type="password"
										placeholder="New password"
										required
										minLength={8}
										autoComplete="new-password"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									{passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
									<div className="flex gap-2">
										<button
											type="submit"
											disabled={passwordSubmitting}
											className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm hover:brightness-110 transition disabled:opacity-60"
										>
											{passwordSubmitting ? "Saving..." : "Save password"}
										</button>
										<button
											type="button"
											onClick={() => {
												setShowPasswordForm(false)
												setPasswordError(null)
												setCurrentPassword("")
												setNewPassword("")
											}}
											className="px-3 py-2 rounded border border-border text-sm hover:bg-muted transition"
										>
											Cancel
										</button>
									</div>
								</form>
							)}
						</div>

						{/* Two-factor authentication */}
						<div className="rounded p-4 border border-dashed border-border">
							<div className="font-medium">Two-factor authentication</div>
							<div className="text-sm text-muted-foreground">Protect your account with an extra verification step</div>

							{twoFactorStep === "idle" && (
								<button
									onClick={() => setTwoFactorStep(twoFactorEnabled ? "disable" : "enable")}
									className={`mt-3 px-3 py-2 rounded transition ${
										twoFactorEnabled
											? "bg-muted hover:bg-border"
											: "bg-primary text-primary-foreground hover:brightness-110"
									}`}
								>
									{twoFactorEnabled ? "Disable" : "Enable"}
								</button>
							)}

							{twoFactorStep === "enable" && (
								<form onSubmit={startTwoFactorEnable} className="mt-3 space-y-2">
									<p className="text-xs text-muted-foreground">Confirm your password to start setup.</p>
									<input
										type="password"
										placeholder="Password"
										required
										autoComplete="current-password"
										value={twoFactorPassword}
										onChange={(e) => setTwoFactorPassword(e.target.value)}
										className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									{twoFactorError && <p className="text-sm text-red-600">{twoFactorError}</p>}
									<div className="flex gap-2">
										<button
											type="submit"
											disabled={twoFactorSubmitting}
											className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm hover:brightness-110 transition disabled:opacity-60"
										>
											{twoFactorSubmitting ? "Please wait..." : "Continue"}
										</button>
										<button
											type="button"
											onClick={resetTwoFactorFlow}
											className="px-3 py-2 rounded border border-border text-sm hover:bg-muted transition"
										>
											Cancel
										</button>
									</div>
								</form>
							)}

							{twoFactorStep === "verify" && (
								<form onSubmit={verifyTwoFactor} className="mt-3 space-y-2">
									<p className="text-xs text-muted-foreground">
										Add this key to your authenticator app, then enter the 6-digit code it shows.
									</p>
									{totpUri && (
										<code className="block break-all rounded bg-muted p-2 text-xs">
											{totpUri}
										</code>
									)}
									<input
										type="text"
										inputMode="numeric"
										placeholder="000000"
										required
										maxLength={6}
										value={totpCode}
										onChange={(e) => setTotpCode(e.target.value)}
										className="block w-full rounded-md border border-border bg-background px-3 py-2 text-center text-sm tracking-[0.3em] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									{twoFactorError && <p className="text-sm text-red-600">{twoFactorError}</p>}
									<div className="flex gap-2">
										<button
											type="submit"
											disabled={twoFactorSubmitting || totpCode.length !== 6}
											className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm hover:brightness-110 transition disabled:opacity-60"
										>
											{twoFactorSubmitting ? "Verifying..." : "Verify & enable"}
										</button>
										<button
											type="button"
											onClick={resetTwoFactorFlow}
											className="px-3 py-2 rounded border border-border text-sm hover:bg-muted transition"
										>
											Cancel
										</button>
									</div>
								</form>
							)}

							{twoFactorStep === "disable" && (
								<form onSubmit={disableTwoFactor} className="mt-3 space-y-2">
									<p className="text-xs text-muted-foreground">Confirm your password to disable two-factor authentication.</p>
									<input
										type="password"
										placeholder="Password"
										required
										autoComplete="current-password"
										value={twoFactorPassword}
										onChange={(e) => setTwoFactorPassword(e.target.value)}
										className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
									/>
									{twoFactorError && <p className="text-sm text-red-600">{twoFactorError}</p>}
									<div className="flex gap-2">
										<button
											type="submit"
											disabled={twoFactorSubmitting}
											className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-500 transition disabled:opacity-60"
										>
											{twoFactorSubmitting ? "Please wait..." : "Disable"}
										</button>
										<button
											type="button"
											onClick={resetTwoFactorFlow}
											className="px-3 py-2 rounded border border-border text-sm hover:bg-muted transition"
										>
											Cancel
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="bg-card border border-border rounded-lg p-6 shadow-sm mt-6">
				<h2 className="text-lg font-semibold">{t('settings.section-help')}</h2>
				<button
					onClick={() => window.dispatchEvent(new Event('open-intro'))}
					className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded bg-muted hover:bg-border transition"
				>
					<HelpCircle className="h-4 w-4" />
					{t('settings.replay-intro')}
				</button>
			</div>

			<div className="bg-card border border-red-200 dark:border-red-900 rounded-lg p-6 shadow-sm mt-6">
				<h2 className="text-lg font-semibold text-red-600">Danger zone</h2>
				<p className="text-sm text-muted-foreground">
					Permanently delete your account and all associated data. This cannot be undone.
				</p>

				{!showDeleteForm ? (
					<button
						onClick={() => setShowDeleteForm(true)}
						className="mt-3 px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-500 transition"
					>
						Delete account
					</button>
				) : (
					<form onSubmit={handleDeleteAccount} className="mt-3 space-y-2 max-w-sm">
						<p className="text-xs text-muted-foreground">Confirm your password to permanently delete your account.</p>
						<input
							type="password"
							placeholder="Password"
							required
							autoComplete="current-password"
							value={deletePassword}
							onChange={(e) => setDeletePassword(e.target.value)}
							className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						{deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
						<div className="flex gap-2">
							<button
								type="submit"
								disabled={deleteSubmitting}
								className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-500 transition disabled:opacity-60"
							>
								{deleteSubmitting ? "Deleting..." : "Permanently delete"}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowDeleteForm(false)
									setDeleteError(null)
									setDeletePassword("")
								}}
								className="px-3 py-2 rounded border border-border text-sm hover:bg-muted transition"
							>
								Cancel
							</button>
						</div>
					</form>
				)}
			</div>

			{saved && (
				<div className="fixed right-6 bottom-6 bg-primary text-primary-foreground px-4 py-2 rounded shadow-lg">
					{saved}
				</div>
			)}
		</div>
	)
}
