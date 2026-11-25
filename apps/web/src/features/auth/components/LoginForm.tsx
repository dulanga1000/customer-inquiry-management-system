"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@cims/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";

export function LoginForm() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/inquiries");
    }
  }, [isLoading, user, router]);

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values);
      router.replace("/inquiries");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          const fieldNames = Object.keys(error.fields) as Array<keyof LoginInput>;
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
        setServerError(error.message);
        return;
      }
      setServerError("Unable to sign in. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign in to CIMS</CardTitle>
        <CardDescription>
          Enter your staff or administrator credentials to manage customer inquiries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="staff1@cims.local"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email?.message ? (
              <p id="login-email-error" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              {...register("password")}
            />
            {errors.password?.message ? (
              <p id="login-password-error" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
