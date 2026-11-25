"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createInquirySchema, type CreateInquiryInput } from "@cims/shared";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateInquiry } from "@/features/inquiries/hooks/useCreateInquiry";
import { ApiError } from "@/lib/apiClient";
import { cn } from "cn";

const INTAKE_GUIDELINES = [
  "Confirm customer email or phone number before saving.",
  "Use a concise subject line summarizing the core issue.",
  "Include order numbers, dates, or context needed for handoff.",
] as const;

export function InquiryForm() {
  const router = useRouter();
  const createMutation = useCreateInquiry();
  const [duplicateState, setDuplicateState] = React.useState<{
    canViewExisting: boolean;
    existingInquiryId: number | null;
  } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CreateInquiryInput>({
    resolver: zodResolver(createInquirySchema),
    defaultValues: {
      customerName: "",
      contact: "",
      subject: "",
      description: "",
    },
  });

  const descriptionValue = useWatch({ control, name: "description" });
  const descriptionLength = descriptionValue?.length ?? 0;

  const onSubmit = async (values: CreateInquiryInput) => {
    setDuplicateState(null);
    setFormError(null);

    try {
      const inquiry = await createMutation.mutateAsync(values);
      toast.success(`Inquiry #${inquiry.id} created`);
      router.push(`/inquiries/${inquiry.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "DUPLICATE_INQUIRY") {
          const canViewExisting = error.meta?.["canViewExisting"] === true;
          const existingId = error.meta?.["existingInquiryId"];
          const validId = canViewExisting && typeof existingId === "number" ? existingId : null;

          setDuplicateState({
            canViewExisting: validId !== null,
            existingInquiryId: validId,
          });
          setFormError(
            validId !== null
              ? "A duplicate inquiry was already submitted within the last 24 hours."
              : "A duplicate inquiry for this customer was already logged by another team member within the last 24 hours.",
          );
          return;
        }

        if (error.fields) {
          const fieldNames = Object.keys(error.fields) as Array<keyof CreateInquiryInput>;
          for (const field of fieldNames) {
            const msg = error.fields[field]?.[0];
            if (msg) {
              setError(field, { type: "server", message: msg });
            }
          }
          if (fieldNames[0]) {
            setFocus(fieldNames[0]);
          }
          return;
        }

        setFormError(error.message);
        return;
      }

      setFormError("Unable to create inquiry. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/inquiries"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to inquiries
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border border-zinc-200 bg-white ring-0 lg:col-span-8">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-950">
              Create Customer Inquiry
            </CardTitle>
            <CardDescription className="text-zinc-600">
              Record a new customer request. Inquiries start in the New queue for triage.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>
                    {duplicateState !== null ? "Duplicate inquiry detected" : "Could not save inquiry"}
                  </AlertTitle>
                  <AlertDescription>
                    <p>{formError}</p>
                    {duplicateState?.canViewExisting && duplicateState.existingInquiryId !== null ? (
                      <p className="mt-1">
                        <Link
                          href={`/inquiries/${duplicateState.existingInquiryId}`}
                          className="font-medium underline"
                        >
                          View existing inquiry #{duplicateState.existingInquiryId}
                        </Link>
                      </p>
                    ) : null}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-customer-name">Customer Name</Label>
                  <Input
                    id="inquiry-customer-name"
                    className="h-10 bg-white"
                    placeholder="Nimal Jayawardena"
                    aria-invalid={Boolean(errors.customerName)}
                    aria-describedby={errors.customerName ? "customer-name-error" : undefined}
                    {...register("customerName")}
                  />
                  {errors.customerName?.message ? (
                    <p id="customer-name-error" className="text-xs text-destructive">
                      {errors.customerName.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-contact">Contact (Email or Phone)</Label>
                  <Input
                    id="inquiry-contact"
                    className="h-10 bg-white"
                    placeholder="nimal@example.com or +94 77 123 4567"
                    aria-invalid={Boolean(errors.contact)}
                    aria-describedby={errors.contact ? "contact-error" : undefined}
                    {...register("contact")}
                  />
                  {errors.contact?.message ? (
                    <p id="contact-error" className="text-xs text-destructive">
                      {errors.contact.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inquiry-subject">Subject</Label>
                <Input
                  id="inquiry-subject"
                  className="h-10 bg-white"
                  placeholder="Order delivery delay"
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? "subject-error" : undefined}
                  {...register("subject")}
                />
                {errors.subject?.message ? (
                  <p id="subject-error" className="text-xs text-destructive">
                    {errors.subject.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="inquiry-description">Description</Label>
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    {descriptionLength} / 2000
                  </span>
                </div>
                <Textarea
                  id="inquiry-description"
                  rows={6}
                  className="bg-white"
                  placeholder="Provide full details of the customer request..."
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  {...register("description")}
                />
                {errors.description?.message ? (
                  <p id="description-error" className="text-xs text-destructive">
                    {errors.description.message}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <Link href="/inquiries" className={buttonVariants({ variant: "outline" })}>
                  Cancel
                </Link>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2Icon className="animate-spin" /> : null}
                  {createMutation.isPending ? "Creating..." : "Create Inquiry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:col-span-4">
          <Card className="border border-zinc-200 bg-white ring-0">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-sm font-semibold text-zinc-950">Intake Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2">
                <span className="text-xs font-medium text-zinc-600">Initial status</span>
                <StatusBadge status="new" />
              </div>

              <ul className="space-y-2.5 text-xs leading-relaxed text-zinc-600">
                {INTAKE_GUIDELINES.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-teal-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
