import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { PostgrestError } from '@supabase/supabase-js'

const STEPS = 3

const Onboarding = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [iban, setIban] = useState('')
  const [countryCode, setCountryCode] = useState('BE')

  // Step 2
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientVat, setClientVat] = useState('')
  const [isCompany, setIsCompany] = useState(true)
  const [clientSkipped, setClientSkipped] = useState(false)

  // --- DÉBUT SECTION : pre-fill profil existant ---
  useEffect(() => {
    if (!user) return
    supabase
      .from('business_profiles')
      .select('company_name, vat_number, iban, country_code')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.company_name) setCompanyName(data.company_name)
        if (data.vat_number)   setVatNumber(data.vat_number)
        if (data.iban)         setIban(data.iban)
        if (data.country_code) setCountryCode(data.country_code)
      })
  }, [user])
  // --- FIN SECTION : pre-fill profil existant ---

  const goTo = (nextStep: number) => setStep(nextStep)

  // ── Step 1 — Profil entreprise ─────────────────────────────────────────────
  const handleStep1 = async () => {
    if (!companyName.trim()) {
      toast.error("Le nom de l'entreprise est requis")
      return
    }
    if (!user) return
    setSaving(true)

    try {
      // Cherche uniquement le profil is_default pour éviter le conflit de contrainte unique
      const { data: existing } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle()

      const payload = {
        company_name: companyName.trim(),
        vat_number:   vatNumber.trim() || null,
        iban:         iban.trim() || null,
        country_code: countryCode,
        is_default:   true,
      }

      const { error } = existing
        ? await supabase.from('business_profiles').update(payload).eq('id', existing.id)
        : await supabase.from('business_profiles').insert({ ...payload, user_id: user.id })

      if (error) throw error
      toast.success('Profil sauvegardé ✅')
      goTo(2)
    } catch (err) {
      const pgErr = err as PostgrestError
      toast.error("Erreur lors de la sauvegarde du profil")
      console.error('[Onboarding] step1:', pgErr.message ?? err)
    } finally {
      setSaving(false)
    }
  }

  // ── Step 2 — Premier client ────────────────────────────────────────────────
  const handleStep2 = async () => {
    if (!clientName.trim()) {
      toast.error('Le nom du client est requis')
      return
    }
    if (!user) return
    setSaving(true)

    try {
      const { error } = await supabase.from('clients').insert({
        user_id:      user.id,
        name:         clientName.trim(),
        email:        clientEmail.trim() || null,
        vat_number:   clientVat.trim() || null,
        is_company:   isCompany,
        country_code: countryCode,
      })
      if (error) throw error
      setClientSkipped(false)
      goTo(3)
    } catch (err) {
      const pgErr = err as PostgrestError
      toast.error("Erreur lors de l'ajout du client")
      console.error('[Onboarding] step2:', pgErr.message ?? err)
    } finally {
      setSaving(false)
    }
  }

  const handleSkipClient = () => {
    setClientSkipped(true)
    goTo(3)
  }

  // ── Step 3 — Finalisation ──────────────────────────────────────────────────
  const handleFinish = async (destination: string) => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    setSaving(false)
    navigate(destination)
  }

  const showPeppolBanner = countryCode === 'BE' && isCompany

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">

      {/* Progress dots */}
      <div className="flex items-center gap-3 mb-8">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'bg-primary scale-125'
                : i + 1 < step
                ? 'bg-primary/60'
                : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-lg">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Bienvenue sur InvoiceAI 👋</CardTitle>
              <CardDescription>Configurons votre profil en 2 minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="company">Nom de l'entreprise *</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ma Société SPRL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat">Numéro de TVA</Label>
                <Input
                  id="vat"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="ex : BE0123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="ex : BE68 5390 0754 7034"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">🇧🇪 Belgique</SelectItem>
                    <SelectItem value="FR">🇫🇷 France</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" className="text-muted-foreground" onClick={() => navigate('/dashboard')}>
                  Passer
                </Button>
                <Button variant="hero" onClick={handleStep1} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Votre premier client</CardTitle>
              <CardDescription>Ajoutez un client pour créer votre première facture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom du client ou de l'entreprise"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="contact@entreprise.be"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientVat">TVA client</Label>
                <Input
                  id="clientVat"
                  value={clientVat}
                  onChange={(e) => setClientVat(e.target.value)}
                  placeholder="ex : BE0123456789"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                <Label htmlFor="isCompany" className="cursor-pointer">Client B2B (entreprise)</Label>
                <Switch id="isCompany" checked={isCompany} onCheckedChange={setIsCompany} />
              </div>

              {showPeppolBanner && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-200">
                    🇧🇪 Peppol obligatoire pour les factures B2B en Belgique depuis janvier 2026.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button variant="ghost" className="text-muted-foreground" onClick={handleSkipClient}>
                  Je le ferai plus tard →
                </Button>
                <Button variant="hero" onClick={handleStep2} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Configuration terminée ! 🎉</CardTitle>
              <CardDescription>InvoiceAI est prêt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <span className="text-sm">Profil entreprise configuré</span>
                </div>
                <div className="flex items-center gap-3">
                  {clientSkipped
                    ? <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    : <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  }
                  <span className="text-sm text-muted-foreground">
                    {clientSkipped ? 'Client non ajouté — à faire dans Clients' : 'Premier client ajouté'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Vérification Peppol recommandée dans Clients
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="hero"
                  onClick={() => handleFinish('/invoice-generator')}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer ma première facture →
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFinish('/dashboard')}
                  disabled={saving}
                  className="w-full"
                >
                  Tableau de bord
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground pt-1">
                Complétez votre profil à tout moment dans Paramètres.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

export default Onboarding