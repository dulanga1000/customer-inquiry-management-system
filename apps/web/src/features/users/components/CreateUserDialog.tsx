"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { createUserSchema, USER_ROLES, type CreateUserInput, type UserRole } from "@cims/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser } from "@/features/users/hooks/useCreateUser";
import { ApiError } from "@/lib/apiClient";
import { formatUserRole } from "@/lib/formatters";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createMutation = useCreateUser();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFormError(null);
      reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: CreateUserInput) => {
    setFormError(null);
    try {
      const created = await createMutation.mutateAsync(values);
      toast.success(`Account created for ${created.name}`);
      handleOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          const fieldNames = Object.keys(error.fields) as Array<keyof CreateUserInput>;
          for (const field of fieldNames) {
            const msg = error.fields[field]?.[0];
            if (msg) {
              setError(field, { type: "server", message: msg });
            }
          }
          if (fieldNames[0]) {
            setFocus(fieldNames[0]);
          }
        }
        if (error.code === "EMAIL_TAKEN") {
          setFormError(error.message);
          return;
        }
        if (!error.fields) {
          setFormError(error.message);
        }
        return;
      }
      setFormError("Unable to create account. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border border-zinc-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-zinc-950">
            Create Staff Account
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Provision a new team account. Public registration is disabled.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {formError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Could not provision account</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="user-name">Full Name</Label>
            <Input
              id="user-name"
              placeholder="Kavindi Perera"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "user-name-error" : undefined}
              {...register("name")}
            />
            {errors.name?.message ? (
              <p id="user-name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email">Work Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="kavindi@cims.local"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "user-email-error" : undefined}
              {...register("email")}
            />
            {errors.email?.message ? (
              <p id="user-email-error" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-password">Temporary Password</Label>
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "user-password-error" : undefined}
              {...register("password")}
            />
            {errors.password?.message ? (
              <p id="user-password-error" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => field.onChange((val ?? "staff") as UserRole)}
                >
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>
                        {formatUserRole(roleOption)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role?.message ? (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            ) : null}
          </div>

          <DialogFooter className="border-zinc-200 bg-zinc-50/70">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2Icon className="animate-spin" /> : null}
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
