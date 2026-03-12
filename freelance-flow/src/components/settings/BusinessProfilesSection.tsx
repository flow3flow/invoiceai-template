import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useBusinessProfiles,
  type BusinessProfile,
  type BusinessProfileInput,
} from "@/hooks/useBusinessProfiles";
import { Building2, Pencil, Trash2, Star, Plus } from "lucide-react";

type ProfileFormData = BusinessProfileInput;

const emptyForm: ProfileFormData = {
  company_name: "",
  vat_number: "",
  street: "",
  zip_code: "",
  city: "",
  country_code: "BE",
  email: "",
  iban: "",
  logo_path: null,
};

const fields: { key: keyof ProfileFormData; label: string; placeholder: string }[] = [
  { key: "company_name", label: "Company Name", placeholder: "Acme Inc." },
  { key: "vat_number", label: "VAT Number", placeholder: "BE0123456789" },
  { key: "street", label: "Street", placeholder: "123 Main St" },
  { key: "zip_code", label: "Zip Code", placeholder: "1000" },
  { key: "city", label: "City", placeholder: "Brussels" },
  { key: "country_code", label: "Country Code", placeholder: "BE" },
  { key: "email", label: "Email", placeholder: "billing@acme.com" },
  { key: "iban", label: "IBAN", placeholder: "BE68 5390 0754 7034" },
];

export default function BusinessProfilesSection() {
  const {
    profiles,
    defaultProfile,
    loading,
    createProfile,
    updateProfile,
    setDefaultProfile,
    deleteProfile,
  } = useBusinessProfiles();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormData>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (profile: BusinessProfile) => {
    setEditingId(profile.id);
    setForm({
      company_name: profile.company_name ?? "",
      vat_number: profile.vat_number ?? "",
      street: profile.street ?? "",
      zip_code: profile.zip_code ?? "",
      city: profile.city ?? "",
      country_code: profile.country_code ?? "BE",
      email: profile.email ?? "",
      iban: profile.iban ?? "",
      logo_path: profile.logo_path ?? null,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.company_name.trim()) return;

    if (editingId) {
      await updateProfile(editingId, form);
    } else {
      await createProfile(form);
    }

    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProfile(deleteId);
      setDeleteId(null);
    }
  };

  const updateField = (key: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isDefault = (id: string) => defaultProfile?.id === id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Business Profiles</h2>
          <p className="text-sm text-muted-foreground">
            Manage the companies you invoice from.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Profile
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40 p-6" />
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No business profiles yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium leading-tight">
                    {profile.company_name}
                  </CardTitle>
                  {isDefault(profile.id) && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {profile.vat_number && <p>{profile.vat_number}</p>}

                {(profile.street || profile.city || profile.zip_code) && (
                  <p>
                    {[
                      profile.street,
                      [profile.zip_code, profile.city].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                {profile.email && <p>{profile.email}</p>}
                {profile.iban && <p className="font-mono text-xs">{profile.iban}</p>}

                <div className="flex flex-wrap items-center gap-1 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(profile)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>

                  {!isDefault(profile.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultProfile(profile.id)}
                    >
                      <Star className="mr-1 h-3.5 w-3.5" />
                      Set Default
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(profile.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Profile" : "New Business Profile"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder }) => (
              <div
                key={key}
                className={key === "company_name" || key === "iban" ? "sm:col-span-2" : ""}
              >
                <Label htmlFor={key} className="mb-1.5 block">
                  {label}
                </Label>
                <Input
                  id={key}
                  placeholder={placeholder}
                  value={typeof form[key] === "string" ? form[key] : ""}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={!form.company_name.trim()}>
              {editingId ? "Save Changes" : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This action may be blocked if invoices are already linked to this profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}