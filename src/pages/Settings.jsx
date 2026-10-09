import { useEffect, useState } from 'react'
import { ShieldCheck, Lock, LogOut, Send, KeyRound, Bell, BellOff } from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase'
import { useAuthStore } from '../stores/useAuthStore'
import { useRoleStore } from '../stores/useRoleStore'
import { settingsService } from '../services/firestoreService'
import { toast } from '../stores/useToastStore'
import SetPinModal from '../components/shared/SetPinModal'

const telegramLinkFn = httpsCallable(getFunctions(app), 'telegramLink')

function Section({ Icon, title, children }) {
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-accent-primary" />
        <p className="text-text-primary font-semibold text-sm">{title}</p>
      </div>
      {children}
    </div>
  )
}

const btn = 'text-xs font-semibold rounded-lg px-3 py-2 disabled:opacity-50'

export default function Settings() {
  const { user, linkGoogle, needsGoogleLink, hasDevicePin, setDevicePin, removeDevicePin, lock, signOut } = useAuthStore()
  const isOwner = useRoleStore((s) => s.role) === 'owner'
  const [linking, setLinking] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [, rerender] = useState(0)
  const [telegram, setTelegram] = useState(undefined) // undefined = loading, null = not connected
  const [tgBusy, setTgBusy] = useState(false)

  const loadTelegram = () => settingsService.get('telegram').then(setTelegram).catch(() => setTelegram(null))
  useEffect(() => { loadTelegram() }, [])

  const google = user?.providerData.find((p) => p.providerId === 'google.com')
  const legacy = needsGoogleLink()

  const handleLink = async () => {
    setLinking(true)
    const r = await linkGoogle()
    setLinking(false)
    if (r.ok) { toast.success('Google linked — the old PIN login is gone'); setPinOpen(true) }
    else toast.error(r.error)
  }

  const connectTelegram = async () => {
    setTgBusy(true)
    try {
      const { data } = await telegramLinkFn({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
      window.open(data.url, '_blank', 'noopener')
      toast.info('Tap Start in Telegram, then come back here')
    } catch (e) {
      toast.error(e.message || 'Could not create the Telegram link')
    } finally {
      setTgBusy(false)
    }
  }

  const toggleNotify = async () => {
    await settingsService.set('telegram', { notify: telegram?.notify === false })
    loadTelegram()
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect Telegram? The bot will stop messaging you.')) return
    await settingsService.remove('telegram')
    setTelegram(null)
    toast.success('Telegram disconnected')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold font-display text-text-primary">Settings</h2>
        <p className="text-text-muted text-xs mt-0.5">Account, security & notifications</p>
      </div>

      <Section Icon={ShieldCheck} title="Account">
        {legacy ? (
          <>
            <p className="text-accent-warning text-xs">
              Your account still signs in with the old PIN, which can be guessed. Link Google to secure it — your data stays exactly as it is.
            </p>
            <button onClick={handleLink} disabled={linking} className={`${btn} bg-accent-primary text-white w-full`}>
              {linking ? 'Linking…' : 'Link Google & remove PIN login'}
            </button>
          </>
        ) : (
          <p className="text-text-secondary text-xs">
            Signed in{google ? <> with Google as <span className="font-semibold text-text-primary">{google.email}</span></> : <> as {user?.email}</>}.
          </p>
        )}
        <button onClick={signOut} className={`${btn} border border-border-color text-text-secondary flex items-center gap-1.5`}>
          <LogOut size={13} /> Sign out
        </button>
      </Section>

      <Section Icon={KeyRound} title="Device PIN">
        <p className="text-text-muted text-xs">A quick lock for this phone or computer. Kova asks for it every time you open the app.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPinOpen(true)} className={`${btn} bg-accent-primary text-white`}>
            {hasDevicePin() ? 'Change PIN' : 'Set PIN'}
          </button>
          {hasDevicePin() && (
            <>
              <button onClick={lock} className={`${btn} border border-border-color text-text-secondary flex items-center gap-1.5`}>
                <Lock size={13} /> Lock now
              </button>
              <button onClick={() => { removeDevicePin(); rerender((n) => n + 1); toast.success('PIN removed') }}
                className={`${btn} text-text-muted`}>Remove PIN</button>
            </>
          )}
        </div>
      </Section>

      {/* The bot is the owner's only — members never see it. */}
      {isOwner && (<Section Icon={Send} title="Telegram">
        {telegram === undefined ? (
          <p className="text-text-muted text-xs">Loading…</p>
        ) : telegram?.chat_id ? (
          <>
            <p className="text-text-secondary text-xs">
              Connected{telegram.username ? <> as <span className="font-semibold text-text-primary">@{telegram.username}</span></> : ''}.
              {telegram.notify === false ? ' Daily summary is off.' : ' You get a summary every morning at 8, and can chat with Kova there.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleNotify} className={`${btn} border border-border-color text-text-secondary flex items-center gap-1.5`}>
                {telegram.notify === false ? <><Bell size={13} /> Turn summary on</> : <><BellOff size={13} /> Turn summary off</>}
              </button>
              <button onClick={disconnect} className={`${btn} text-accent-danger`}>Disconnect</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-text-muted text-xs">Get a morning summary (bills, safe payment, low point) and chat with Kova from Telegram.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={connectTelegram} disabled={tgBusy} className={`${btn} bg-accent-primary text-white`}>
                {tgBusy ? 'Opening…' : 'Connect Telegram'}
              </button>
              <button onClick={loadTelegram} className={`${btn} text-text-muted`}>I tapped Start — refresh</button>
            </div>
          </>
        )}
      </Section>)}

      <SetPinModal open={pinOpen} onClose={() => { setPinOpen(false); rerender((n) => n + 1) }}
        onSet={async (pin) => { await setDevicePin(pin); toast.success('PIN set for this device') }} />
    </div>
  )
}
