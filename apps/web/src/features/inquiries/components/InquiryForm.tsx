"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createInquirySchema, type CreateInquiryInput } from "@cims/shared";
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

export function InquiryForm() {
  const router = useRouter();
  const createMutation = useCreateInquiry();
  const [duplicateId, setDuplicateId] = React.useState<number | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
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

  const onSubmit = async (values: CreateInquiryInput) => {
    setDuplicateId(null);
    setFormError(null);

    try {
      const inquiry = await createMutation.mutateAsync(values);
      toast.success(`Inquiry #${inquiry.id} created`);
      router.push(`/inquiries/${inquiry.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "DUPLICATE_INQUIRY") {
          const existingId = error.meta?.["existingInquiryId"];
          setDuplicateId(typeof existingId === "number" ? existingId : null);
          setFormError(error.message);
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
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/inquiries" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon className="size-4" />
          Back to inquiries
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create Customer Inquiry</CardTitle>
          <CardDescription>
            Record a new customer request. Inquiries start with status New.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  {duplicateId !== null ? "Duplicate inquiry detected" : "Could not save inquiry"}
                </AlertTitle>
                <AlertDescription>
                  <p>{formError}</p>
                  {duplicateId !== null ? (
                    <p className="mt-1">
                      <Link href={`/inquiries/${duplicateId}`} className="font-medium underline">
                        View existing inquiry #{duplicateId}
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
              <Label htmlFor="inquiry-description">Description</Label>
              <Textarea
                id="inquiry-description"
                rows={5}
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

            <div className="flex justify-end gap-2 pt-2">
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
    </div>
  );
}
